import React, { useState, useEffect } from 'react';
import { Star, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { getStockPrice } from '../services/apiService';
import { stockCache } from '../services/stockCache';
import { StockInfo } from '../types';

interface WatchlistItemWithPrice {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

interface WatchListProps {
  timeRange: string;
  onStockClick?: (symbol: string, existingStockData?: StockInfo) => void;
}

const WatchList: React.FC<WatchListProps> = ({ timeRange, onStockClick }) => {
  const { watchlist, loading, removeFromWatchlist } = useWatchlist();
  const [stocksWithPrices, setStocksWithPrices] = useState<WatchlistItemWithPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const fetchPrices = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const updatedStocks = await Promise.all(
        watchlist.map(async (stock) => {
          try {
            const priceData = await getStockPrice(stock.symbol);
            
            // Cache the stock data for later use
            if (priceData) {
              stockCache.set(stock.symbol, priceData);
            }
            
            return {
              ...stock,
              price: priceData?.price ?? 0,
              change: priceData?.change ?? 0,
              changePercent: priceData?.changePercent ?? 0,
            };
          } catch (error) {
            console.error(`Error fetching price for ${stock.symbol}:`, error);
            return {
              ...stock,
              price: 0,
              change: 0,
              changePercent: 0,
            };
          }
        })
      );
      setStocksWithPrices(updatedStocks);
    } catch (error) {
      console.error('Error updating prices:', error);
      setRefreshError('Failed to update all stock prices. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchPrices();
    } else {
      setStocksWithPrices([]);
    }
  }, [watchlist, timeRange]);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
          <div className="h-10 bg-neutral-200 rounded"></div>
          <div className="h-10 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Star className="w-5 h-5 text-primary-500 mr-2" />
          Watchlist
        </h3>
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <span className="text-xs sm:text-sm text-neutral-500">{watchlist.length} stocks</span>
          {watchlist.length > 0 && (
            <button
              onClick={fetchPrices}
              className={`p-1.5 rounded-full text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 active:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                refreshing ? 'animate-spin' : ''
              }`}
              disabled={refreshing}
              title="Refresh prices"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>
      {refreshError && (
        <div className="text-sm text-negative-600 mb-3 text-center sm:text-left px-1">
          {refreshError}
        </div>
      )}

      {watchlist.length === 0 ? (
        <div className="text-center py-8 px-4">
          <Star className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 mb-2">
            No stocks in your watchlist yet
          </p>
          <p className="text-sm text-neutral-500">
            Search for a stock and click the star icon to start tracking it
          </p>
        </div>
      ) : (
        <div className={`space-y-2 ${
          refreshing ? 'opacity-60 transition-opacity duration-150' : ''
        }`}>
          {stocksWithPrices.map((stock) => {
            const isPositive = stock.change && stock.change > 0;
            
            return (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-3 sm:p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                onClick={() => {
                  const cachedData = stockCache.get(stock.symbol);
                  onStockClick?.(stock.symbol, cachedData || undefined);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm sm:text-base truncate">{stock.symbol}</span>
                    <span className="font-medium text-sm sm:text-base ml-2 whitespace-nowrap">
                      ${stock.price?.toFixed(2) ?? '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-neutral-600 truncate mr-2">
                      {stock.name}
                    </span>
                    {(stock.change !== undefined && stock.changePercent !== undefined) && (
                      <div className={`flex items-center text-xs sm:text-sm whitespace-nowrap ${
                        isPositive ? 'text-positive-600' : 'text-negative-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 mr-0.5 sm:mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-0.5 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline mr-1">
                          {isPositive ? '+' : ''}{stock.change.toFixed(2)} 
                        </span>
                        <span>
                           ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWatchlist(stock.symbol);
                  }}
                  className="ml-4 p-1.5 text-neutral-400 hover:text-negative-500 hover:bg-neutral-200 rounded-full transition-colors"
                  title="Remove from watchlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WatchList;