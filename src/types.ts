export interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
  industry?: string;
  previousClose: number;
  marketCap: number | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  financialSentimentCategory: "bullish" | "bearish" | "neutral-impact" | "mixed";
  sentimentScore: number;
  relevanceToPrice: "high" | "medium" | "low";
  justification: string;
}

export interface KeyFactor {
  type: 'positive' | 'negative' | 'neutral' | 'mixed';
  prefix: string;
  title: string;
  score?: number;
  justificationSnippet?: string;
}

export interface StructuredNewsSummary {
  overallSentimentText: string;
  averageScoreText: string;
  keyFactors: KeyFactor[];
  relevanceText: string;
  hasContent: boolean;
}

export interface SentimentData {
  overall: number;
  positive: number;
  negative: number;
  neutral: number;
  summary: string;
  structuredSummary: StructuredNewsSummary | null;
  trendData: SentimentTrendPoint[];
}

export interface SentimentTrendPoint {
  time: string;
  sentiment: number;
  articles: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}

export interface TimeRange {
  value: string;
  label: string;
}

// Added for historical stock data
export interface FinnhubCandleData {
  c: number[]; // List of close prices
  h: number[]; // List of high prices
  l: number[]; // List of low prices
  o: number[]; // List of open prices
  t: number[]; // List of timestamps (UNIX)
  s: string;   // Status, e.g., "ok" or "no_data"
  v: number[]; // List of volumes
}

export interface StockCandle {
  date: Date; // or number for UNIX timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Configuration for Gemini Analysis, if ever needed client-side (usually backend)