'use client';

import React from 'react';
import { Calendar, Eye, User, Tag, Code } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  techStack: string[];
  creatorName: string;
  createdAt: number;
  viewCount: number;
  engagementScore: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

interface SearchResultCardProps {
  result: SearchResult;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ result }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <Link href={`/projects/${result.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {result.title}
          </h3>
          <div className="flex items-center text-sm text-gray-500 ml-4">
            <Eye className="w-4 h-4 mr-1" />
            {result.viewCount}
          </div>
        </div>

        {result.description && (
          <p className="text-gray-600 mb-4 leading-relaxed">
            {truncateText(result.description, 200)}
          </p>
        )}

        {/* Tags */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {result.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full"
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </span>
            ))}
            {result.tags.length > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{result.tags.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Tech Stack */}
        {result.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {result.techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full"
              >
                <Code className="w-3 h-3 mr-1" />
                {tech}
              </span>
            ))}
            {result.techStack.length > 4 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{result.techStack.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Meta information */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-1" />
            <span>{result.creatorName}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(result.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {visiblePages.map((page, index) => (
        <React.Fragment key={index}>
          {page === '...' ? (
            <span className="px-3 py-2 text-sm font-medium text-gray-500">...</span>
          ) : (
            <button
              onClick={() => onPageChange(page as number)}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                currentPage === page
                  ? 'text-blue-600 bg-blue-50 border border-blue-300'
                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )}
        </React.Fragment>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  query,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="flex space-x-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              <div className="h-6 bg-gray-200 rounded-full w-14"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && query) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500 mb-4">
          We couldn't find any projects matching "{query}". Try adjusting your search terms or filters.
        </p>
        <div className="text-sm text-gray-400">
          <p>Suggestions:</p>
          <ul className="mt-2 space-y-1">
            <li>• Check your spelling</li>
            <li>• Try more general keywords</li>
            <li>• Remove some filters</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Results header */}
      {query && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Search Results
          </h2>
          <p className="text-gray-600">
            Found {totalCount.toLocaleString()} result{totalCount !== 1 ? 's' : ''} for "{query}"
          </p>
        </div>
      )}

      {/* Results list */}
      <div className="space-y-6">
        {results.map((result) => (
          <SearchResultCard key={result.id} result={result} />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
};