import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { searchStocks } from '../services/apiService';
import { SearchResult, TimeRange } from '../types';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  onTimeRangeChange: (range: string) => void;
  selectedTimeRange: string;
  showTimeRange?: boolean;
}

const timeRanges: TimeRange[] = [
  { value: '24h', label: 'Last 24 hours' },
];

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onTimeRangeChange, 
  selectedTimeRange,
  showTimeRange = true
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchText.length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchStocks(searchText);
          setSearchResults(results.slice(0, 5));
          setShowResults(true);
        } catch (error) {
          console.error('Error searching stocks:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  const handleSelectStock = (symbol: string) => {
    setSearchText(symbol);
    setShowResults(false);
    onSearch(symbol);
  };

  const handleClearSearch = () => {
    setSearchText('');
    searchInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText) {
      onSearch(searchText);
      setShowResults(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div ref={searchContainerRef} className="relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-400" />
            </div>
            
            <input
              ref={searchInputRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search stocks (e.g., AAPL)"
              className="input pl-10 pr-10 py-3 sm:py-4 w-full text-sm sm:text-base"
              onFocus={() => searchText.length >= 2 && setShowResults(true)}
            />
            
            {searchText && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-neutral-400 hover:text-neutral-600" />
              </button>
            )}
          </div>
        </form>

        {showResults && (
          <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-neutral-200 py-2 max-h-80 overflow-auto animate-fadeIn">
            {isLoading ? (
              <div className="p-4 text-center text-neutral-500">
                <div className="animate-spin inline-block w-5 h-5 border-2 border-neutral-300 border-t-primary-500 rounded-full mr-2"></div>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result) => (
                  <li 
                    key={result.symbol}
                    className="px-3 sm:px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectStock(result.symbol)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-neutral-900 text-sm sm:text-base">{result.symbol}</span>
                        <p className="text-xs sm:text-sm text-neutral-600 truncate">{result.name}</p>
                      </div>
                      <span className="text-xs text-neutral-500 ml-2 shrink-0">{result.exchange}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-neutral-500">
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      {showTimeRange && timeRanges.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center text-neutral-500">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">Time Range:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
                  selectedTimeRange === range.value
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-white text-neutral-600 hover:bg-neutral-100'
                }`}
                onClick={() => onTimeRangeChange(range.value)}
              >
                <span className="sm:hidden">{range.value.toUpperCase()}</span>
                <span className="hidden sm:inline">{range.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;