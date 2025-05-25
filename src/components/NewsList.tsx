import React, { useState } from 'react';
import { NewsArticle, TimeRange } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface NewsListProps {
  news: NewsArticle[];
  timeRange: string;
}

const NewsList: React.FC<NewsListProps> = ({ news, timeRange }) => {
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const toggleArticleExpansion = (id: string) => {
    setExpandedArticles(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const getSentimentBadgeClass = (financialSentimentCategory: NewsArticle['financialSentimentCategory']) => {
    switch(financialSentimentCategory) {
      case 'bullish':
        return 'bg-positive-50 text-positive-700 border border-positive-200';
      case 'bearish':
        return 'bg-negative-50 text-negative-700 border border-negative-200';
      case 'mixed':
        return 'bg-orange-50 text-orange-700 border border-orange-200'; // Assuming orange for mixed
      case 'neutral-impact':
      default:
        return 'bg-neutral-50 text-neutral-700 border border-neutral-200';
    }
  };

  const getSentimentBadgeText = (financialSentimentCategory: NewsArticle['financialSentimentCategory'], score: number) => {
    const formattedScore = (score * 100).toFixed(0);
    switch(financialSentimentCategory) {
      case 'bullish':
        return `Bullish (${formattedScore}%)`;
      case 'bearish':
        return `Bearish (${formattedScore}%)`;
      case 'mixed':
        return `Mixed (${formattedScore}%)`;
      case 'neutral-impact':
      default:
        return `Neutral (${formattedScore}%)`;
    }
  };

  const getRelevanceBadgeClass = (relevance: NewsArticle['relevanceToPrice']) => {
    switch(relevance) {
      case 'high':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'low':
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };
  
  const getRelevanceBadgeText = (relevance: NewsArticle['relevanceToPrice']) => {
    switch(relevance) {
      case 'high':
        return 'High Relevance';
      case 'medium':
        return 'Medium Relevance';
      case 'low':
      default:
        return 'Low Relevance';
    }
  };

  const renderTimeRangeLabel = () => {
    switch(timeRange) {
      case '24h':
        return 'Last 24 Hours';
      default:
        return 'Recent News';
    }
  };

  if (!news.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-neutral-600">No news articles found for this time period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-enter">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">News Articles</h3>
        <div className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
          {renderTimeRangeLabel()}
        </div>
      </div>
      
      <div className="space-y-4">
        {news.map((article) => {
          const isExpanded = expandedArticles.has(article.id);
          const formattedDate = formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
          
          return (
            <div 
              key={article.id} 
              className="card border-l-4 hover:transform hover:translate-y-[-2px] transition-all duration-200"
              style={{
                borderLeftColor: article.financialSentimentCategory === 'bullish' ? '#10b981' : 
                                 article.financialSentimentCategory === 'bearish' ? '#ef4444' :
                                 article.financialSentimentCategory === 'mixed' ? '#f97316' : // orange for mixed
                                 '#9ca3af' // neutral-impact or default
              }}
            >
              <div className="flex justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm sm:text-base lg:text-lg font-medium pr-2 sm:pr-4 leading-tight">{article.title}</h4>
                    <button 
                      onClick={() => toggleArticleExpansion(article.id)}
                      className="mt-0.5 p-1.5 hover:bg-neutral-100 rounded-full shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-neutral-500" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-center mb-3 text-xs sm:text-sm text-neutral-500">
                    <span className="mr-2 sm:mr-3 truncate">{article.source}</span>
                    <span className="text-xs">•</span>
                    <span className="ml-2 sm:ml-3 shrink-0">{formattedDate}</span>
                  </div>
                  
                  {isExpanded && (
                    <>
                      <p className="text-sm sm:text-base text-neutral-600 mb-3">{article.summary}</p>
                      {article.justification && (
                        <p className="text-sm text-neutral-500 italic mb-4">
                          <strong>Justification:</strong> {article.justification}
                        </p>
                      )}
                    </>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${getSentimentBadgeClass(article.financialSentimentCategory)}`}
                    >
                      {getSentimentBadgeText(article.financialSentimentCategory, article.sentimentScore)}
                    </span>
                    
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${getRelevanceBadgeClass(article.relevanceToPrice)}`}
                    >
                      {getRelevanceBadgeText(article.relevanceToPrice)}
                    </span>
                    
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-primary-600 hover:text-primary-800 flex items-center shrink-0"
                    >
                      <span className="hidden sm:inline">Read full article</span>
                      <span className="sm:hidden">Read more</span>
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewsList;