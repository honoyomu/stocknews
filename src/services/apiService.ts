import { StockInfo, NewsArticle, SentimentData, SearchResult, SentimentTrendPoint, KeyFactor, StructuredNewsSummary, FinnhubCandleData } from '../types';
import { stockCache } from './stockCache';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BASE_URL = 'https://fhzfabuotddvpcnyplgy.supabase.co/functions/v1/finnhub';
const GEMINI_FUNCTION_URL = 'https://fhzfabuotddvpcnyplgy.supabase.co/functions/v1/process-news-with-gemini';

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting implementation
const REQUEST_QUEUE: (() => Promise<any>)[] = [];
const MAX_REQUESTS_PER_SECOND = 30;
let requestsThisSecond = 0;
let lastRequestTime = Date.now();
let isProcessingQueue = false;

const resetRequestCount = () => {
  const now = Date.now();
  if (now - lastRequestTime >= 1000) {
    requestsThisSecond = 0;
    lastRequestTime = now;
  }
};

const processQueue = async () => {
  if (REQUEST_QUEUE.length === 0) {
    isProcessingQueue = false;
    return;
  }
  isProcessingQueue = true;

  resetRequestCount();
  if (requestsThisSecond >= MAX_REQUESTS_PER_SECOND) {
    isProcessingQueue = false; 
    setTimeout(processQueue, 1000);
    return;
  }

  const request = REQUEST_QUEUE.shift();
  if (request) {
    requestsThisSecond++;
    try {
      await request();
    } catch (e) {
      console.error("[apiService.processQueue] Error directly from awaiting shifted request:", e);
    } finally {
      isProcessingQueue = false; 
      processQueue(); 
    }
  } else {
     isProcessingQueue = false; 
  }
};

const queueRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    const wrappedRequest = async () => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    REQUEST_QUEUE.push(wrappedRequest);

    if (!isProcessingQueue && REQUEST_QUEUE.length > 0) { 
      processQueue();
    }
  });
};

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic retry logic for fetch (can be expanded)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const fetchWithRetry = async <T>(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}, body: ${errorBody}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (retries === 0) {
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
    console.warn(`Request to ${url} failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error);
    await sleep(delay);
    return fetchWithRetry<T>(url, options, retries - 1, delay * 2);
  }
};

// Search for stocks
export const searchStocks = async (query: string): Promise<SearchResult[]> => {
  if (!SUPABASE_ANON_KEY) {
    console.error('Supabase Anon Key is not configured');
    return [];
  }

  const cacheKey = `search_${query}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const data = await queueRequest(() =>
      fetchWithRetry<{ result: any[] }>(`${BASE_URL}/search?q=${query}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      })
    );

    if (!data || !data.result) {
      return [];
    }

    const allowedTypes = ['Common Stock', 'ETF', 'ETP', 'ETN']; // Added ETF, ETP, ETN for broader fund search

    const results = data.result
      .filter((item: any) =>
        item && 
        item.symbol && 
        item.description && 
        item.type && 
        allowedTypes.includes(item.type)
      )
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.description,
        type: item.type,
        exchange: item.primaryExchange || ''
      }))
      .slice(0, 10);

    setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
};

// Helper to get date N days ago in YYYY-MM-DD format and UNIX timestamp
const getDateParams = (daysAgo: number): { fromDateStr: string, toDateStr: string, fromTimestamp: number, toTimestamp: number } => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysAgo);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const getUnixTimestamp = (date: Date) => Math.floor(date.getTime() / 1000);

  return {
    fromDateStr: formatDate(from),
    toDateStr: formatDate(to),
    fromTimestamp: getUnixTimestamp(from),
    toTimestamp: getUnixTimestamp(to),
  };
};

// Get stock candles (historical data)
export const getStockCandles = async (symbol: string, resolution: string, from: number, to: number): Promise<FinnhubCandleData | null> => {
  if (!SUPABASE_ANON_KEY) {
    console.error('[apiService.getStockCandles] Supabase Anon Key is not configured');
    return null;
  }

  const cacheKey = `candles_${symbol}_${resolution}_${from}_${to}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached as FinnhubCandleData;
  }

  try {
    const candleData = await queueRequest(() =>
      fetchWithRetry<FinnhubCandleData>(`${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`, {
        method: "POST", // Should be POST as per other calls to the edge function
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      })
    );
    
    if (candleData && candleData.s === 'ok') {
      setCachedData(cacheKey, candleData);
      return candleData;
    } else {
      console.warn(`[apiService.getStockCandles] No candle data or error for ${symbol}:`, candleData?.s);
      return null;
    }
  } catch (error) {
    console.error(`[apiService.getStockCandles] Error fetching stock candles for ${symbol}:`, error);
    return null;
  }
};

// Get stock price data - MODIFIED to use timeRange
export const getStockPrice = async (symbol: string, timeRange: string = '24h'): Promise<StockInfo> => {
  if (!SUPABASE_ANON_KEY) {
    console.error('[apiService.getStockPrice] Supabase Anon Key is not configured');
    return {
      symbol,
      name: symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      exchange: '',
      industry: '',
      previousClose: 0,
      marketCap: null
    };
  }

  // Check cache first
  const cachedStock = stockCache.get(symbol);
  if (cachedStock) {
    console.log(`[apiService.getStockPrice] Using cached stock data for ${symbol}`);
    return cachedStock;
  }

  const priceCacheKey = `price_profile_${symbol}`;
  
  let currentPrice = 0;
  let dailyChange = 0;
  let dailyChangePercent = 0;
  let previousClosePrice = 0;
  // Explicitly type profileInfo parts that will go into StockInfo
  let profileInfo: {
    name: string;
    exchange: string;
    industry: string;
    marketCap: number | null;
  } = { name: symbol, exchange: '', industry: '', marketCap: null };


  try {
    const cachedProfileAndQuote = getCachedData(priceCacheKey);
    if (cachedProfileAndQuote) {
        const { quote, profile } = cachedProfileAndQuote;
        currentPrice = quote.c || 0;
        dailyChange = quote.d || 0;
        dailyChangePercent = quote.dp || 0;
        previousClosePrice = quote.pc || 0;
        profileInfo = {
            name: profile.name || symbol,
            exchange: profile.exchange || '',
            industry: profile.finnhubIndustry || '',
            marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null
        };
    } else {
        const [quoteData, profileData] = await Promise.all([
          queueRequest(() =>
            fetchWithRetry<any>(`${BASE_URL}/quote?symbol=${symbol}`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }
            }).catch(error => {
              console.error(`[apiService.getStockPrice] Error fetching /quote for ${symbol}:`, error);
              throw error; // Re-throw to be caught by the outer try-catch
            })
          ),
          queueRequest(() =>
            fetchWithRetry<any>(`${BASE_URL}/stock/profile2?symbol=${symbol}`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }
            }).catch(error => {
              console.warn(`[apiService.getStockPrice] Failed to fetch /stock/profile2 for ${symbol}, proceeding with defaults:`, error);
              return {}; // Return empty object on profile error, so quote can still be used
            })
          )
        ]);

        const quote = quoteData;
        const profile = profileData || {};
        
        currentPrice = quote.c || 0;
        dailyChange = quote.d || 0;
        dailyChangePercent = quote.dp || 0;
        previousClosePrice = quote.pc || 0;
        profileInfo = {
            name: profile.name || symbol,
            exchange: profile.exchange || '',
            industry: profile.finnhubIndustry || '',
            marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1000000 : null
        };
        setCachedData(priceCacheKey, { quote, profile });
    }

    let calculatedChange = dailyChange;
    let calculatedChangePercent = dailyChangePercent;

    const stockInfo = {
      symbol,
      name: profileInfo.name,
      price: currentPrice,
      change: calculatedChange,
      changePercent: calculatedChangePercent,
      exchange: profileInfo.exchange,
      industry: profileInfo.industry,
      previousClose: previousClosePrice, 
      marketCap: profileInfo.marketCap
    };

    // Cache in both systems
    stockCache.set(symbol, stockInfo);
    
    return stockInfo;

  } catch (error) {
    console.error(`[apiService.getStockPrice] Error fetching stock price for ${symbol} (${timeRange}):`, error);
    return {
      symbol,
      name: symbol, 
      price: 0,
      change: 0,
      changePercent: 0,
      exchange: '',
      industry: '',
      previousClose: 0,
      marketCap: null
    };
  }
};

// Get news articles
export const getNewsArticles = async (symbol: string, timeRange: string): Promise<Omit<NewsArticle, 'financialSentimentCategory' | 'sentimentScore' | 'relevanceToPrice' | 'justification'>[]> => {
  if (!SUPABASE_ANON_KEY) {
    console.error('Supabase Anon Key is not configured');
    return [];
  }

  // Note: Raw news caching is handled at a higher level in useStockData
  const cacheKey = `raw_news_${symbol}_${timeRange}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const now = new Date();
  let fromDate = new Date();
  
  switch(timeRange) {
    case '24h':
      fromDate.setDate(now.getDate() - 1);
      break;
    default:
      fromDate.setDate(now.getDate() - 1); 
  }
  const from = fromDate.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  try {
    const newsData = await queueRequest(() =>
      fetchWithRetry<any[]>(`${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        }
      })
    );

    if (!newsData || !Array.isArray(newsData)) {
      console.warn('No news data received or data is not an array');
      return [];
    }

    const articles = newsData.map((article: any) => ({
      id: article.id?.toString() || Date.now().toString() + Math.random(),
      title: article.headline || '',
      summary: article.summary || '',
      url: article.url,
      source: article.source,
      publishedAt: article.datetime ? new Date(article.datetime * 1000).toISOString() : new Date().toISOString(),
    }));

    const filteredArticles = articles
      .filter((article) => article.title && article.summary && article.url)
      .sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ).slice(0, 10);

    setCachedData(cacheKey, filteredArticles);
    return filteredArticles;
  } catch (error) {
    let errorMessage = 'Unknown error occurred while fetching news';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    console.error('Error fetching news:', {
      message: errorMessage,
      error,
      requestDetails: {
        symbol,
        timeRange,
        apiKeyUsed: SUPABASE_ANON_KEY ? 'Supabase Key Present' : 'Supabase Key Missing'
      }
    });
    return [];
  }
};

// New function to analyze news with Gemini
export const analyzeNewsWithGemini = async (
  articles: Omit<NewsArticle, 'financialSentimentCategory' | 'sentimentScore' | 'relevanceToPrice' | 'justification'>[]
): Promise<NewsArticle[]> => {
  if (!SUPABASE_ANON_KEY) {
    console.error('Supabase Anon Key is not configured for Gemini analysis');
    return articles.map(article => ({
      ...article,
      financialSentimentCategory: 'neutral-impact',
      sentimentScore: 0,
      relevanceToPrice: 'low',
      justification: 'Sentiment analysis skipped due to configuration error.',
    }));
  }

  if (!articles || articles.length === 0) {
    console.log("No articles provided to analyzeNewsWithGemini");
    return [];
  }

  const articlesForGemini = articles.map(article => ({
    id: article.id,
    headline: article.title,
    summary: article.summary,
    url: article.url,
    source: article.source,
    publishedAt: article.publishedAt,
  }));

  try {
    console.log(`[apiService.analyzeNewsWithGemini] Sending ${articlesForGemini.length} articles to Gemini function...`);
    const analyzedArticles = await queueRequest(() =>
      fetchWithRetry<NewsArticle[]>(GEMINI_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ articles: articlesForGemini })
      })
    );
    console.log(`[apiService.analyzeNewsWithGemini] Received ${analyzedArticles.length} analyzed articles from Gemini.`);
    return analyzedArticles;
  } catch (error) {
    console.error('Error calling process-news-with-gemini Edge Function:', error);
    return articles.map(article => ({
      ...article,
      financialSentimentCategory: 'neutral-impact',
      sentimentScore: 0,
      relevanceToPrice: 'low',
      justification: `Error analyzing sentiment: ${error instanceof Error ? error.message : 'Unknown error'}.`,
    }));
  }
};

// Analyze sentiment (now uses Gemini-processed news)
export const analyzeSentiment = async (symbol: string, news: NewsArticle[], timeRange: string): Promise<SentimentData> => {
  const now = new Date();
  
  // Note: Sentiment caching is handled at a higher level in useStockData
  const cacheKey = `sentiment_${symbol}_${timeRange}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const fallbackStructuredSummary: StructuredNewsSummary = {
    overallSentimentText: `No news available for ${symbol}.`,
    averageScoreText: '',
    keyFactors: [],
    relevanceText: 'Sentiment analysis cannot be performed.',
    hasContent: false,
  };

  if (news.length === 0) {
    return {
      overall: 0, 
      positive: 0,
      negative: 0,
      neutral: 1,
      trendData: [],
      summary: fallbackStructuredSummary.overallSentimentText, // Simple text fallback
      structuredSummary: fallbackStructuredSummary
    };
  }

  const sentimentScores = news.map(article => article.sentimentScore);
  const overallSentiment = sentimentScores.length > 0 
    ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
    : 0;
  
  const positive = news.filter(article => article.financialSentimentCategory === 'bullish').length / news.length;
  const negative = news.filter(article => article.financialSentimentCategory === 'bearish').length / news.length;
  const neutral = news.filter(article => (article.financialSentimentCategory === 'neutral-impact' || article.financialSentimentCategory === 'mixed')).length / news.length;
  
  const trendData: SentimentTrendPoint[] = [];
  const timeGroups = new Map<string, NewsArticle[]>();
  
  let hoursPerGroup = 24;
  if (timeRange === '24h') {
    hoursPerGroup = 3;
  }
  
  news.forEach(article => {
    const date = new Date(article.publishedAt);
    let periodStartEpoch: number;

    if (timeRange === '24h') {
        const hoursAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        const groupIndex = Math.floor(hoursAgo / hoursPerGroup);

        // const currentHour = now.getHours(); // Not needed directly for grouping key
        // const groupStartOffset = (groupIndex * hoursPerGroup); // Not needed directly
        
        const tempDateForGrouping = new Date(now);
        tempDateForGrouping.setHours(now.getHours() - (now.getHours() % hoursPerGroup) - (groupIndex * hoursPerGroup), 0,0,0);
        periodStartEpoch = tempDateForGrouping.getTime();

    } else { // For other time ranges, group by day
         periodStartEpoch = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }
    
    const key = new Date(periodStartEpoch).toISOString();

    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(article);
  });
  
  Array.from(timeGroups.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()) // Ensure chronological order
    .forEach(([time, articlesInGroup]) => { 
      const periodSentiment = articlesInGroup.reduce((sum, art) => 
        sum + art.sentimentScore, 0) / Math.max(1, articlesInGroup.length);
      
      trendData.push({
        time,
        sentiment: periodSentiment,
        articles: articlesInGroup.length
      });
    });
  
  // Generate the structured summary
  const structuredSummaryData = generateStructuredNewsSummary(symbol, news, overallSentiment);
  
  const sentimentResult: SentimentData = {
    overall: overallSentiment,
    positive,
    negative,
    neutral,
    trendData,
    summary: `${structuredSummaryData.overallSentimentText} ${structuredSummaryData.averageScoreText}`,
    structuredSummary: structuredSummaryData
  };
  // Note: Caching is now handled at a higher level in useStockData
  return sentimentResult;
};

function generateStructuredNewsSummary(symbol: string, news: NewsArticle[], overallSentiment: number): StructuredNewsSummary {
  if (news.length === 0) {
    return {
      overallSentimentText: `No recent news available for ${symbol}.`,
      averageScoreText: '',
      keyFactors: [],
      relevanceText: 'Sentiment analysis cannot be performed.',
      hasContent: false,
    };
  }

  let overallSentimentDescription = "neutral";
  if (overallSentiment > 0.5) overallSentimentDescription = "decidedly bullish";
  else if (overallSentiment > 0.15) overallSentimentDescription = "leaning bullish";
  else if (overallSentiment < -0.5) overallSentimentDescription = "decidedly bearish";
  else if (overallSentiment < -0.15) overallSentimentDescription = "leaning bearish";
  else if (news.some(a => a.financialSentimentCategory === 'mixed')) overallSentimentDescription = "mixed";

  const overallSentimentText = `Overall sentiment for ${symbol} is ${overallSentimentDescription}`;
  const averageScoreText = `(Avg. Score: ${overallSentiment.toFixed(2)})`;

  const keyFactors: KeyFactor[] = [];

  // const sortedByImpact = [...news].sort((a,b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore)); // Not directly used with new logic
  
  const topPositiveArticle = news
    .filter(a => a.financialSentimentCategory === 'bullish')
    .sort((a, b) => b.sentimentScore - a.sentimentScore)[0];
    
  const topNegativeArticle = news
    .filter(a => a.financialSentimentCategory === 'bearish')
    .sort((a, b) => a.sentimentScore - b.sentimentScore)[0]; // score is negative, so sort ascending for most negative

  if (topPositiveArticle && topPositiveArticle.sentimentScore > 0.3) {
    keyFactors.push({
      type: 'positive',
      prefix: '(+)',
      title: `Bullish Driver: "${topPositiveArticle.title}"`,
      score: topPositiveArticle.sentimentScore,
      justificationSnippet: topPositiveArticle.justification ? `${topPositiveArticle.justification.substring(0, 100)}...` : undefined
    });
  }

  if (topNegativeArticle && topNegativeArticle.sentimentScore < -0.3) {
    keyFactors.push({
      type: 'negative',
      prefix: '(-)',
      title: `Bearish Driver: "${topNegativeArticle.title}"`,
      score: topNegativeArticle.sentimentScore,
      justificationSnippet: topNegativeArticle.justification ? `${topNegativeArticle.justification.substring(0, 100)}...` : undefined
    });
  }
  
  // Fallback if no strong drivers
  if (keyFactors.length === 0 && news.length > 0) {
    const sortedByImpact = [...news].sort((a,b) => Math.abs(b.sentimentScore) - Math.abs(a.sentimentScore));
    const mostImpactful = sortedByImpact[0];
    if (mostImpactful && Math.abs(mostImpactful.sentimentScore) > 0.1) { // Only add if somewhat impactful
        keyFactors.push({
          type: mostImpactful.financialSentimentCategory === 'bullish' ? 'positive' : mostImpactful.financialSentimentCategory === 'bearish' ? 'negative' : 'neutral',
          prefix: 'Key Mention:',
          title: `"${mostImpactful.title}"`,
          score: mostImpactful.sentimentScore,
          justificationSnippet: mostImpactful.justification ? `${mostImpactful.justification.substring(0, 100)}...` : undefined
        });
    }
    if (sortedByImpact.length > 1 && keyFactors.length < 2) { // Try to add a second one
        const secondMostImpactful = sortedByImpact[1];
        if (secondMostImpactful && Math.abs(secondMostImpactful.sentimentScore) > 0.1) {
            keyFactors.push({
              type: secondMostImpactful.financialSentimentCategory === 'bullish' ? 'positive' : secondMostImpactful.financialSentimentCategory === 'bearish' ? 'negative' : 'neutral',
              prefix: 'Also Noted:',
              title: `"${secondMostImpactful.title}"`,
              score: secondMostImpactful.sentimentScore,
              justificationSnippet: secondMostImpactful.justification ? `${secondMostImpactful.justification.substring(0,100)}...` : undefined
            });
        }
    }
  }
  
  if (keyFactors.length === 0 && news.length > 0) { // Generic fallback if still nothing
     keyFactors.push({
        type: 'neutral',
        prefix: 'Info:',
        title: 'No single dominant factor stood out in the recent news, but overall sentiment is as stated.',
     });
  }

  const highRelevanceCount = news.filter(a => a.relevanceToPrice === 'high').length;
  let relevanceText = '';
  if (highRelevanceCount > 0) {
    relevanceText = `${highRelevanceCount} article(s) were deemed highly relevant to stock price by the AI.`;
  } else if (news.length > 0) {
    relevanceText = `AI analysis found no articles with high relevance to stock price among the top news.`;
  }


  return {
    overallSentimentText,
    averageScoreText,
    keyFactors,
    relevanceText,
    hasContent: true,
  };
}