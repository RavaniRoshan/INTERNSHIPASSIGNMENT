'use client';

import React from 'react';
import { X, Filter } from 'lucide-react';

interface SearchFiltersProps {
  tags: string[];
  techStack: string[];
  selectedTags: string[];
  selectedTechStack: string[];
  onTagToggle: (tag: string) => void;
  onTechStackToggle: (tech: string) => void;
  onClearFilters: () => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  maxVisible?: number;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  items,
  selectedItems,
  onToggle,
  maxVisible = 10
}) => {
  const [showAll, setShowAll] = React.useState(false);
  const visibleItems = showAll ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="space-y-2">
        {visibleItems.map((item) => {
          const isSelected = selectedItems.includes(item);
          return (
            <label
              key={item}
              className="flex items-center cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(item)}
                className="sr-only"
              />
              <div
                className={`flex items-center justify-between w-full p-2 rounded-lg transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <span
                  className={`text-sm ${
                    isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  {item}
                </span>
                {isSelected && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAll ? 'Show less' : `Show ${items.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
};

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  tags,
  techStack,
  selectedTags,
  selectedTechStack,
  onTagToggle,
  onTechStackToggle,
  onClearFilters,
  className = ''
}) => {
  const hasActiveFilters = selectedTags.length > 0 || selectedTechStack.length > 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Filter className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <span
                key={`tag-${tag}`}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              >
                {tag}
                <button
                  onClick={() => onTagToggle(tag)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedTechStack.map((tech) => (
              <span
                key={`tech-${tech}`}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full"
              >
                {tech}
                <button
                  onClick={() => onTechStackToggle(tech)}
                  className="ml-1 hover:text-green-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter sections */}
      <FilterSection
        title="Tags"
        items={tags}
        selectedItems={selectedTags}
        onToggle={onTagToggle}
      />

      <FilterSection
        title="Tech Stack"
        items={techStack}
        selectedItems={selectedTechStack}
        onToggle={onTechStackToggle}
      />

      {/* No filters available message */}
      {tags.length === 0 && techStack.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No filters available</p>
        </div>
      )}
    </div>
  );
};