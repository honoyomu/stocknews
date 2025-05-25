import { useState, useCallback } from 'react';
import { StockInfo, NewsArticle, SentimentData } from '../types';
import { getStockPrice, getNewsArticles, analyzeNewsWithGemini, analyzeSentiment } from '../services/apiService';
import { stockCache } from '../services/stockCache';

export const useStockData = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [newsList, setNewsList] = useState<NewsArticle[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  
  const fetchStockData = useCallback(async (symbol: string, timeRange: string, existingStockData?: StockInfo) => {
    console.log(`[useStockData] Starting fetchStockData for ${symbol}`)
    setLoading(true);
    setStockInfo(null); // Reset previous data
    setNewsList([]);
    setSentimentData(null);
    
    try {
      let stockData: StockInfo;
      
      if (existingStockData && existingStockData.symbol === symbol) {
        console.log(`[useStockData] Using existing stock data for ${symbol}:`, existingStockData);
        stockData = existingStockData;
      } else {
        console.log(`[useStockData] Fetching stock price for ${symbol}...`);
        stockData = await getStockPrice(symbol);
        console.log(`[useStockData] Fetched stock price for ${symbol}:`, stockData);
      }
      
      setStockInfo(stockData);
      
      // Check for cached news and sentiment first
      const cachedNews = stockCache.getNews(symbol, timeRange);
      const cachedSentiment = stockCache.getSentiment(symbol, timeRange);
      
      if (cachedNews && cachedSentiment) {
        console.log(`[useStockData] Using cached news and sentiment for ${symbol}`);
        setNewsList(cachedNews);
        setSentimentData(cachedSentiment);
      } else {
        console.log(`[useStockData] Fetching fresh news and sentiment for ${symbol}...`);
        console.log(`[useStockData] Fetching raw news articles for ${symbol}, timeRange: ${timeRange}...`);
        const rawNews = await getNewsArticles(symbol, timeRange);
        console.log(`[useStockData] Fetched ${rawNews.length} raw news articles for ${symbol}.`);

        if (rawNews.length > 0) {
          console.log(`[useStockData] Analyzing news with Gemini for ${symbol}...`);
          const analyzedNews = await analyzeNewsWithGemini(rawNews);
          console.log(`[useStockData] Received ${analyzedNews.length} analyzed news articles from Gemini for ${symbol}.`);
          setNewsList(analyzedNews);
          
          // Cache the analyzed news
          stockCache.setNews(symbol, timeRange, analyzedNews);
          
          console.log(`[useStockData] Analyzing overall sentiment for ${symbol}...`);
          const sentiment = await analyzeSentiment(symbol, analyzedNews, timeRange);
          console.log(`[useStockData] Calculated overall sentiment for ${symbol}:`, sentiment);
          setSentimentData(sentiment);
          
          // Cache the sentiment
          stockCache.setSentiment(symbol, timeRange, sentiment);
        } else {
          console.log(`[useStockData] No news articles to analyze for ${symbol}.`);
          const noNewsResult = {
            overall: 0,
            positive: 0,
            negative: 0,
            neutral: 1,
            summary: `No news found for ${symbol} in the selected time range. Sentiment analysis cannot be performed.`,
            trendData: [],
            structuredSummary: {
              overallSentimentText: `No news found for ${symbol} in the selected time range.`,
              averageScoreText: '',
              keyFactors: [],
              relevanceText: 'Sentiment analysis cannot be performed.',
              hasContent: false,
            }
          };
          setNewsList([]);
          setSentimentData(noNewsResult);
          
          // Cache the empty results too
          stockCache.setNews(symbol, timeRange, []);
          stockCache.setSentiment(symbol, timeRange, noNewsResult);
        }
      }

    } catch (error) {
      console.error(`[useStockData] Error in fetchStockData for ${symbol}:`, error);
      // Reset states on error to ensure clean UI
      setStockInfo(null);
      setNewsList([]);
      setSentimentData(null);
    } finally {
      console.log(`[useStockData] Finished fetchStockData for ${symbol}, setting loading to false.`);
      setLoading(false);
    }
  }, []);
  
  const clearStockData = useCallback(() => {
    setStockInfo(null);
    setNewsList([]);
    setSentimentData(null);
  }, []);

  const clearAllCache = useCallback(() => {
    stockCache.clear();
    console.log('[useStockData] Cleared all cache data');
  }, []);
  
  return {
    loading,
    stockInfo,
    newsList,
    sentimentData,
    fetchStockData,
    clearStockData,
    clearAllCache
  };
};