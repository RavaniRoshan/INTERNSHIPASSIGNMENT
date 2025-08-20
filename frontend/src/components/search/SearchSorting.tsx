'use client';

import React from 'react';
import { ArrowUpDown, TrendingUp, Calendar, Zap } from 'lucide-react';

export type SortOption = 'relevance' | 'date' | 'popularity';

interface SearchSortingProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  totalCount: number;
  className?: string;
}

const sortOptions = [
  {
    value: 'relevance' as SortOption,
    label: 'Relevance',
    icon: Zap,
    description: 'Most relevant to your search'
  },
  {
    value: 'date' as SortOption,
    label: 'Date',
    icon: Calendar,
    description: 'Most recently created'
  },
  {
    value: 'popularity' as SortOption,
    label: 'Popularity',
    icon: TrendingUp,
    description: 'Most viewed and engaged'
  }
];

export const SearchSorting: React.FC<SearchSortingProps> = ({
  sortBy,
  onSortChange,
  totalCount,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between bg-white border-b border-gray-200 pb-4 ${className}`}>
      <div className="flex items-center text-sm text-gray-600">
        <span className="font-medium">{totalCount.toLocaleString()}</span>
        <span className="ml-1">result{totalCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center text-sm text-gray-600">
          <ArrowUpDown className="w-4 h-4 mr-2" />
          <span>Sort by:</span>
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Alternative: Button-based sorting */}
        <div className="hidden md:flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isActive = sortBy === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => onSortChange(option.value)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={option.description}
              >
                <Icon className="w-4 h-4 mr-1" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};