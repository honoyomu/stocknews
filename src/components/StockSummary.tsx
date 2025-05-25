import React from 'react';
import {
  TrendingUp, TrendingDown, BarChart3, Star,
  ThumbsUp, ThumbsDown, Info, AlertCircle, ExternalLink, RefreshCw
} from 'lucide-react';
import { StockInfo, SentimentData, KeyFactor } from '../types';
import { useWatchlist } from '../hooks/useWatchlist';

interface StockSummaryProps {
  stockInfo: StockInfo;
  sentimentData: SentimentData | null;
  onRefresh?: () => void;
}

const FactorIcon: React.FC<{type: KeyFactor['type']}> = ({ type }) => {
  switch (type) {
    case 'positive':
      return <ThumbsUp className="h-5 w-5 text-positive-500 mr-2 flex-shrink-0" />;
    case 'negative':
      return <ThumbsDown className="h-5 w-5 text-negative-500 mr-2 flex-shrink-0" />;
    case 'neutral':
    case 'mixed':
    default:
      return <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />;
  }
};

const StockSummary: React.FC<StockSummaryProps> = ({ stockInfo, sentimentData, onRefresh }) => {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const isPositive = stockInfo.change >= 0;
  const isInWatchlist = watchlist.some(item => item.symbol === stockInfo.symbol);
  
  const handleWatchlistToggle = () => {
    if (isInWatchlist) {
      removeFromWatchlist(stockInfo.symbol);
    } else {
      addToWatchlist(stockInfo.symbol, stockInfo.name);
    }
  };

  const formatMarketCap = (marketCap: number | null): string => {
    if (marketCap === null) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    return `$${(marketCap / 1e6).toFixed(2)}M`;
  };
  
  const sSummary = sentimentData?.structuredSummary;

  return (
    <div className="card animate-enter">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{stockInfo.symbol}</h2>
              <span className="text-xs bg-neutral-100 px-2 py-1 rounded shrink-0">{stockInfo.exchange}</span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 rounded-full transition-colors shrink-0 bg-neutral-100 text-neutral-500 hover:text-primary-600 hover:bg-primary-50"
                  title="Refresh stock data"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              <button
                onClick={handleWatchlistToggle}
                className={`p-1.5 rounded-full transition-colors shrink-0 ${
                  isInWatchlist 
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200' 
                    : 'bg-neutral-100 text-neutral-400 hover:text-primary-600'
                }`}
                title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star className="w-4 h-4 sm:w-5 sm:h-5" fill={isInWatchlist ? "currentColor" : "none"} />
              </button>
            </div>
            <h3 className="text-sm sm:text-base text-neutral-600 mb-2">{stockInfo.name}</h3>
            {stockInfo.industry && (
              <p className="text-neutral-500 text-xs sm:text-sm">{stockInfo.industry}</p>
            )}
          </div>
          
          <div className="flex flex-col items-start sm:items-end">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">${stockInfo.price.toFixed(2)}</div>
            <div className={`flex items-center text-sm sm:text-base ${isPositive ? 'text-positive-600' : 'text-negative-600'}`}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              )}
              <span className="font-medium">{stockInfo.change.toFixed(2)} ({stockInfo.changePercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t border-neutral-100 pt-6">
        <div className="flex items-center mb-3">
          <BarChart3 className="text-primary-600 mr-2 h-5 w-5" />
          <h3 className="text-lg font-semibold">News Sentiment Summary</h3>
        </div>

        {sSummary && sSummary.hasContent ? (
          <div className="space-y-3 text-neutral-700">
            <p className="text-base">
              <span className="font-medium">{sSummary.overallSentimentText}</span>
              <span className="text-sm text-neutral-500 ml-1">{sSummary.averageScoreText}</span>
            </p>
            
            {sSummary.keyFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-neutral-600 mb-1 mt-2">Key Factors:</h4>
                <ul className="space-y-2 pl-1">
                  {sSummary.keyFactors.map((factor, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <FactorIcon type={factor.type} />
                      <div>
                        <span className="font-medium">{factor.prefix}</span> {factor.title}
                        {factor.score !== undefined && (
                           <span className="text-xs text-neutral-500 ml-1">
                             (Score: {factor.score.toFixed(2)})
                           </span>
                        )}
                        {factor.justificationSnippet && (
                          <p className="text-xs text-neutral-500 italic mt-0.5">{factor.justificationSnippet}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sSummary.relevanceText && (
              <p className="text-sm text-neutral-600 mt-2 flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" /> 
                {sSummary.relevanceText}
              </p>
            )}
            
            <p className="text-xs text-neutral-500 mt-3">
              Sentiment analysis powered by AI. For more details, check the full news list.
            </p>
          </div>
        ) : (
          <p className="text-neutral-600 leading-relaxed">
            {sentimentData?.summary || "Search for a stock to see news sentiment analysis."}
          </p>
        )}
        
      </div>

      <div className="border-t border-neutral-100 pt-6 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-neutral-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-neutral-500 mb-1">Previous Close</div>
            <div className="font-medium text-sm sm:text-base">${stockInfo.previousClose.toFixed(2)}</div>
          </div>
          
          <div className="bg-neutral-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-neutral-500 mb-1">Market Cap</div>
            <div className="font-medium text-sm sm:text-base">{formatMarketCap(stockInfo.marketCap)}</div>
          </div>
          
          <div className="bg-neutral-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-neutral-500 mb-1">Day Change</div>
            <div className={`font-medium text-sm sm:text-base ${isPositive ? 'text-positive-600' : 'text-negative-600'}`}>
              {isPositive ? '+' : ''}{stockInfo.change.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-neutral-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xs sm:text-sm text-neutral-500 mb-1">Change %</div>
            <div className={`font-medium text-sm sm:text-base ${isPositive ? 'text-positive-600' : 'text-negative-600'}`}>
              {isPositive ? '+' : ''}{stockInfo.changePercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSummary;