import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { StockInfo } from './types';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import StockSummary from './components/StockSummary';
import NewsList from './components/NewsList';
import SentimentSummary from './components/SentimentSummary';
import WatchList from './components/WatchList';
import LoadingState from './components/LoadingState';
import Auth from './components/Auth';
import { useStockData } from './hooks/useStockData';
import { supabase } from './lib/supabase';

function App() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [user, setUser] = useState<User | null>(null);
  const { 
    loading, 
    stockInfo, 
    newsList, 
    sentimentData, 
    fetchStockData,
    clearStockData,
    clearAllCache
  } = useStockData();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (symbol: string, existingStockData?: StockInfo) => {
    setSearchQuery(symbol);
    fetchStockData(symbol, timeRange, existingStockData);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    clearStockData();
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    if (searchQuery) {
      fetchStockData(searchQuery, range);
    }
  };

  const handleRefresh = () => {
    clearAllCache();
    if (searchQuery) {
      // Re-fetch current stock data without using cache
      fetchStockData(searchQuery, timeRange);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Auth />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header 
        user={user} 
        onClearSearch={handleClearSearch}
        hasActiveSearch={!!stockInfo}
      />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <SearchBar 
            onSearch={handleSearch}
            onTimeRangeChange={handleTimeRangeChange}
            selectedTimeRange={timeRange}
          />
        </div>
        
        {loading ? (
          <LoadingState />
        ) : stockInfo ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="xl:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8">
              <StockSummary 
                stockInfo={stockInfo} 
                sentimentData={sentimentData}
                onRefresh={handleRefresh}
              />
              <NewsList 
                news={newsList} 
                timeRange={timeRange}
              />
            </div>
            <div className="xl:col-span-1 space-y-4 sm:space-y-6 lg:space-y-8">
              <WatchList timeRange={timeRange} onStockClick={handleSearch} />
              <SentimentSummary 
                sentimentData={sentimentData || undefined}
                timeRange={timeRange}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center pt-4 sm:pt-8">
            <div className="w-full max-w-lg space-y-4 sm:space-y-6 lg:space-y-8">
              <WatchList timeRange={timeRange} onStockClick={handleSearch} />
              <SentimentSummary 
                sentimentData={sentimentData || undefined}
                timeRange={timeRange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;