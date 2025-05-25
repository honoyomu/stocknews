import { StockInfo, NewsArticle, SentimentData } from '../types';

interface CachedStockData extends StockInfo {
  cachedAt: number;
  ttl: number;
}

interface CachedNewsData {
  data: NewsArticle[];
  cachedAt: number;
  ttl: number;
}

interface CachedSentimentData {
  data: SentimentData;
  cachedAt: number;
  ttl: number;
}

class StockCache {
  private stockCache = new Map<string, CachedStockData>();
  private newsCache = new Map<string, CachedNewsData>();
  private sentimentCache = new Map<string, CachedSentimentData>();
  
  private readonly STOCK_TTL = 2 * 60 * 1000; // 2 minutes for stock prices
  private readonly NEWS_TTL = 10 * 60 * 1000; // 10 minutes for news
  private readonly SENTIMENT_TTL = 10 * 60 * 1000; // 10 minutes for sentiment

  // Stock data methods
  set(symbol: string, stockData: StockInfo, ttl?: number): void {
    const cached: CachedStockData = {
      ...stockData,
      cachedAt: Date.now(),
      ttl: ttl || this.STOCK_TTL
    };
    
    this.stockCache.set(symbol.toUpperCase(), cached);
    console.log(`[StockCache] Cached stock data for ${symbol}`);
  }

  get(symbol: string): StockInfo | null {
    const cached = this.stockCache.get(symbol.toUpperCase());
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - cached.cachedAt) > cached.ttl;
    
    if (isExpired) {
      this.stockCache.delete(symbol.toUpperCase());
      console.log(`[StockCache] Expired stock cache for ${symbol}`);
      return null;
    }

    console.log(`[StockCache] Using cached stock data for ${symbol}`);
    return {
      symbol: cached.symbol,
      name: cached.name,
      price: cached.price,
      change: cached.change,
      changePercent: cached.changePercent,
      exchange: cached.exchange,
      industry: cached.industry,
      previousClose: cached.previousClose,
      marketCap: cached.marketCap
    };
  }

  has(symbol: string): boolean {
    return this.get(symbol) !== null;
  }

  // News data methods
  setNews(symbol: string, timeRange: string, newsData: NewsArticle[]): void {
    const key = `${symbol.toUpperCase()}_${timeRange}`;
    const cached: CachedNewsData = {
      data: newsData,
      cachedAt: Date.now(),
      ttl: this.NEWS_TTL
    };
    
    this.newsCache.set(key, cached);
    console.log(`[StockCache] Cached news data for ${symbol} (${timeRange})`);
  }

  getNews(symbol: string, timeRange: string): NewsArticle[] | null {
    const key = `${symbol.toUpperCase()}_${timeRange}`;
    const cached = this.newsCache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - cached.cachedAt) > cached.ttl;
    
    if (isExpired) {
      this.newsCache.delete(key);
      console.log(`[StockCache] Expired news cache for ${symbol} (${timeRange})`);
      return null;
    }

    console.log(`[StockCache] Using cached news data for ${symbol} (${timeRange})`);
    return cached.data;
  }

  // Sentiment data methods
  setSentiment(symbol: string, timeRange: string, sentimentData: SentimentData): void {
    const key = `${symbol.toUpperCase()}_${timeRange}`;
    const cached: CachedSentimentData = {
      data: sentimentData,
      cachedAt: Date.now(),
      ttl: this.SENTIMENT_TTL
    };
    
    this.sentimentCache.set(key, cached);
    console.log(`[StockCache] Cached sentiment data for ${symbol} (${timeRange})`);
  }

  getSentiment(symbol: string, timeRange: string): SentimentData | null {
    const key = `${symbol.toUpperCase()}_${timeRange}`;
    const cached = this.sentimentCache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - cached.cachedAt) > cached.ttl;
    
    if (isExpired) {
      this.sentimentCache.delete(key);
      console.log(`[StockCache] Expired sentiment cache for ${symbol} (${timeRange})`);
      return null;
    }

    console.log(`[StockCache] Using cached sentiment data for ${symbol} (${timeRange})`);
    return cached.data;
  }

  // Utility methods
  clear(): void {
    this.stockCache.clear();
    this.newsCache.clear();
    this.sentimentCache.clear();
    console.log('[StockCache] Cleared all cached data');
  }

  getSize(): number {
    return this.stockCache.size + this.newsCache.size + this.sentimentCache.size;
  }

  // Get all cached stock symbols
  getCachedSymbols(): string[] {
    const now = Date.now();
    const validSymbols: string[] = [];
    
    for (const [symbol, cached] of this.stockCache.entries()) {
      const isExpired = (now - cached.cachedAt) > cached.ttl;
      if (!isExpired) {
        validSymbols.push(symbol);
      } else {
        this.stockCache.delete(symbol);
      }
    }
    
    return validSymbols;
  }

  // Debug method to see cache status
  getStatus(): { stocks: number; news: number; sentiment: number } {
    return {
      stocks: this.stockCache.size,
      news: this.newsCache.size,
      sentiment: this.sentimentCache.size
    };
  }
}

// Export singleton instance
export const stockCache = new StockCache(); 