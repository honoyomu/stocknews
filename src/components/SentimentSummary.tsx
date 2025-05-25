import React from 'react';
import { SentimentData } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentSummaryProps {
  sentimentData?: SentimentData;
  timeRange: string;
}

const SentimentSummary: React.FC<SentimentSummaryProps> = ({ sentimentData, timeRange }) => {
  if (!sentimentData) {
    return null;
  }

  // Prepare data for the sentiment distribution chart
  const distributionData = [
    { name: 'Positive', value: sentimentData.positive, color: '#10b981' },
    { name: 'Neutral', value: sentimentData.neutral, color: '#9ca3af' },
    { name: 'Negative', value: sentimentData.negative, color: '#ef4444' },
  ];

  // Helper to format time labels based on time range
  const formatTimeLabel = (time: string) => {
    const date = new Date(time);
    if (timeRange === '24h') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="space-y-8 animate-enter">
      {/* Overall Sentiment Score */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Overall Sentiment</h3>
        <div className="flex items-center justify-center mb-4">
          <div 
            className={`
              flex items-center justify-center w-24 h-24 rounded-full text-white font-bold text-xl
              ${sentimentData.overall > 0.1 ? 'bg-positive-500' : 
                sentimentData.overall < -0.1 ? 'bg-negative-500' : 'bg-neutral-500'}
            `}
          >
            {Math.abs(sentimentData.overall * 100).toFixed(0)}%
            
            {sentimentData.overall > 0.1 ? (
              <TrendingUp className="ml-1 h-5 w-5" />
            ) : sentimentData.overall < -0.1 ? (
              <TrendingDown className="ml-1 h-5 w-5" />
            ) : (
              <Minus className="ml-1 h-5 w-5" />
            )}
          </div>
        </div>
        
        <p className="text-center text-neutral-700">
          {sentimentData.overall > 0.3 ? 'Strongly Positive' :
           sentimentData.overall > 0.1 ? 'Positive' :
           sentimentData.overall < -0.3 ? 'Strongly Negative' :
           sentimentData.overall < -0.1 ? 'Negative' : 'Neutral'}
        </p>
        
        <p className="text-sm text-neutral-500 text-center mt-2">
          Based on news sentiment analysis
        </p>
      </div>

      {/* Sentiment Distribution */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={distributionData}
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip 
                formatter={(value) => [`${(Number(value) * 100).toFixed(0)}%`, 'Percentage']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment Trend */}
      {sentimentData.trendData.length > 1 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sentiment Trend</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sentimentData.trendData}
                margin={{ top: 5, right: 5, bottom: 20, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={formatTimeLabel}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[-1, 1]} 
                  tickFormatter={(value) => value.toFixed(1)}
                  ticks={[-1, -0.5, 0, 0.5, 1]}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}`, 'Sentiment Score']}
                  labelFormatter={(time) => formatTimeLabel(time as string)}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                  activeDot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-neutral-500 text-center mt-2">
            Sentiment score over time (-1 = negative, 1 = positive)
          </p>
        </div>
      )}
    </div>
  );
};

export default SentimentSummary;