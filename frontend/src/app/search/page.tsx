'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchSorting, SortOption } from '@/components/search/SearchSorting';
import { api } from '@/lib/api';

interface SearchResponse {
  results: Array<{
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
  }>;
  totalCount: number;
  facets: {
    tags: { [key: string]: number };
    techStack: { [key: string]: number };
  };
  suggestions?: string[];
}

const RESULTS_PER_PAGE = 20;

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [selectedTechStack, setSelectedTechStack] = useState<string[]>(
    searchParams.get('techStack')?.split(',').filter(Boolean) || []
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sortBy') as SortOption) || 'relevance'
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get('page') || '1')
  );

  // Results state
  const [results, setResults] = useState<SearchResponse['results']>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState<SearchResponse['facets']>({
    tags: {},
    techStack: {}
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Update URL when search parameters change
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    if (selectedTechStack.length > 0) params.set('techStack', selectedTechStack.join(','));
    if (sortBy !== 'relevance') params.set('sortBy', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const newURL = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(newURL, { scroll: false });
  }, [query, selectedTags, selectedTechStack, sortBy, currentPage, router]);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query && selectedTags.length === 0 && selectedTechStack.length === 0) {
      setResults([]);
      setTotalCount(0);
      setFacets({ tags: {}, techStack: {} });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tags', tag));
      }
      if (selectedTechStack.length > 0) {
        selectedTechStack.forEach(tech => params.append('techStack', tech));
      }
      params.set('sortBy', sortBy);
      params.set('page', currentPage.toString());
      params.set('limit', RESULTS_PER_PAGE.toString());

      const response = await api.get(`/search?${params.toString()}`);
      
      if (response.data.success) {
        const searchData = response.data.data as SearchResponse;
        setResults(searchData.results);
        setTotalCount(searchData.totalCount);
        setFacets(searchData.facets);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalCount(0);
      setFacets({ tags: {}, techStack: {} });
    } finally {
      setLoading(false);
    }
  }, [query, selectedTags, selectedTechStack, sortBy, currentPage]);

  // Get search suggestions
  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const response = await api.get(`/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=5`);
      
      if (response.data.success) {
        setSuggestions(response.data.data.suggestions);
      }
    } catch (error) {
      console.error('Suggestions error:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // Debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      getSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, getSuggestions]);

  // Perform search when parameters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Update URL when parameters change
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Event handlers
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setCurrentPage(1);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const handleTechStackToggle = (tech: string) => {
    setSelectedTechStack(prev => 
      prev.includes(tech) 
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setSelectedTechStack([]);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / RESULTS_PER_PAGE);

  // Get available filter options from facets
  const availableTags = Object.keys(facets.tags).sort();
  const availableTechStack = Object.keys(facets.techStack).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Discover Projects
          </h1>
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
            loading={suggestionsLoading}
            className="max-w-2xl"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <SearchFilters
              tags={availableTags}
              techStack={availableTechStack}
              selectedTags={selectedTags}
              selectedTechStack={selectedTechStack}
              onTagToggle={handleTagToggle}
              onTechStackToggle={handleTechStackToggle}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sorting controls */}
            {(query || selectedTags.length > 0 || selectedTechStack.length > 0) && (
              <SearchSorting
                sortBy={sortBy}
                onSortChange={handleSortChange}
                totalCount={totalCount}
                className="mb-6"
              />
            )}

            {/* Search results */}
            <SearchResults
              results={results}
              loading={loading}
              query={query}
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            {/* Empty state when no search performed */}
            {!query && selectedTags.length === 0 && selectedTechStack.length === 0 && !loading && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start your search
                </h3>
                <p className="text-gray-500">
                  Enter keywords or select filters to discover amazing projects
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}