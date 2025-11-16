import React from 'react';

interface ChartProps {
  type: 'bar' | 'line' | 'pie';
  data: any[];
  xKey: string;
  yKey: string;
  color: string;
}

const Chart: React.FC<ChartProps> = ({ type, data, xKey, yKey, color }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => item[yKey]));
  const total = data.reduce((sum, item) => sum + item[yKey], 0);

  if (type === 'pie') {
    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item[yKey] / total) * 100 : 0;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {item[xKey].replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{item[yKey]}</div>
                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item[yKey] / maxValue) * 100 : 0;
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-900 truncate">
                  {item[xKey]}
                </span>
                <span className="text-gray-600">
                  {typeof item[yKey] === 'number' && item[yKey] > 1000 
                    ? `₹${item[yKey].toLocaleString()}` 
                    : item[yKey]
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.slice(-8).map((item, index) => (
            <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-900">{item[yKey]}</div>
              <div className="text-xs text-gray-600">
                {new Date(item[xKey]).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 font-medium">Trend Analysis</span>
            <span className="text-blue-600">
              {data.length > 1 && data[data.length - 1][yKey] > data[data.length - 2][yKey] 
                ? '↗ Increasing' 
                : data.length > 1 && data[data.length - 1][yKey] < data[data.length - 2][yKey]
                ? '↘ Decreasing'
                : '→ Stable'
              }
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Chart;