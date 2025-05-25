import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface WatchlistItem {
  symbol: string;
  name: string;
}

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWatchlist = async () => {
    try {
      if (!user) {
        setWatchlist([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select('symbol, name')
        .eq('user_id', user.id) // Filter by current user
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWatchlist(data || []);
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (symbol: string, name: string) => {
    try {
      if (!user) {
        console.error('User must be logged in to add to watchlist');
        return;
      }

      const exists = watchlist.some(item => item.symbol === symbol);
      if (exists) return;

      const { error } = await supabase
        .from('watchlist')
        .insert([{ 
          symbol, 
          name, 
          user_id: user.id // Associate with current user
        }]);

      if (error) throw error;
      
      // Optimistic update
      setWatchlist(prev => [{symbol, name}, ...prev]);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      if (!user) {
        console.error('User must be logged in to remove from watchlist');
        return;
      }

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('symbol', symbol)
        .eq('user_id', user.id); // Only delete user's own items

      if (error) throw error;
      
      // Optimistic update
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (user) {
      fetchWatchlist();

      const watchlistSubscription = supabase
        .channel('watchlist_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'watchlist',
            filter: `user_id=eq.${user.id}` // Only listen to current user's changes
          },
          () => {
            fetchWatchlist();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(watchlistSubscription);
      };
    }
  }, [user]);

  return {
    watchlist,
    loading,
    addToWatchlist,
    removeFromWatchlist,
    user // Expose user for components that might need it
  };
};