import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WatchlistItem {
  symbol: string;
  name: string;
}

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setWatchlist([]); // No user, no watchlist
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('watchlist')
        .select('symbol, name')
        .eq('user_id', user.id) // Filter by user_id
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user logged in, cannot add to watchlist.");
        return;
      }

      const exists = watchlist.some(item => item.symbol === symbol); // This check is local, still fine
      if (exists) return;

      const { error } = await supabase
        .from('watchlist')
        .insert([{ symbol, name, user_id: user.id }]); // Add user_id here

      if (error) throw error;
      
      // Optimistic update can remain, but fetchWatchlist will ensure user-specific data
      // setWatchlist(prev => [{symbol, name}, ...prev]); 
      // Let RLS and fetchWatchlist handle the correct state after insert
      await fetchWatchlist(); // This will now fetch the user-specific list
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user logged in, cannot remove from watchlist.");
        return;
      }

      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id) // Ensure deleting only for the current user
        .eq('symbol', symbol);

      if (error) throw error;
      
      // Optimistic update is fine, or just rely on fetchWatchlist triggered by subscription
      setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
      
      // fetchWatchlist(); // May not be strictly necessary if RLS and subscription handle it well
      // but for explicit refresh after delete, it can be useful.
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    const fetchAndSetUserWatchlist = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user) {
        fetchWatchlist(); // Fetch watchlist if user is logged in
      } else {
        setWatchlist([]); // Clear watchlist if no user
        setLoading(false);
      }
    };

    fetchAndSetUserWatchlist();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchWatchlist();
      } else if (event === 'SIGNED_OUT') {
        setWatchlist([]);
        setLoading(false);
      }
    });

    const watchlistSubscription = supabase
      .channel('watchlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'watchlist'
        },
        () => {
          fetchWatchlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(watchlistSubscription);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    // fetchWatchlist(); // Moved to the auth state listener useEffect
  }, []);

  return {
    watchlist,
    loading,
    addToWatchlist,
    removeFromWatchlist
  };
};