'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { recommendationAPI } from '@/lib/api';
import { Project } from '@/lib/types';

interface TrendingProjectsProps {
  timeWindow?: 'day' | 'week' | 'month';
  limit?: number;
  className?: string;
  showTimeWindowSelector?: boolean;
}

interface TrendingProject extends Project {
  engagementVelocity: number;
  recentViews: number;
  recentLikes: number;
  recentFollows: number;
}

export default function TrendingProjects({
  timeWindow: initialTimeWindow = 'week',
  limit = 12,
  className = '',
  showTimeWindowSelector = true
}: TrendingProjectsProps) {
  const [trendingProjects, setTrendingProjects] = useState<TrendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<'day' | 'week' | 'month'>(initialTimeWindow);

  useEffect(() => {
    const fetchTrendingProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await recommendationAPI.getTrendingProjects({
          timeWindow,
          limit
        });
        
        setTrendingProjects(response.projects);
      } catch (err) {
        console.error('Error fetching trending projects:', err);
        setError('Failed to load trending projects');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingProjects();
  }, [timeWindow, limit]);

  const handleProjectClick = (project: TrendingProject, position: number) => {
    // Track the recommendation click
    recommendationAPI.trackRecommendationClick({
      projectId: project.id,
      recommendationType: 'trending',
      position
    }).catch(err => {
      console.error('Error tracking recommendation click:', err);
    });
  };

  const formatEngagementVelocity = (velocity: number): string => {
    if (velocity >= 1000) {
      return `${(velocity / 1000).toFixed(1)}k`;
    }
    return velocity.toFixed(1);
  };

  const getTimeWindowLabel = (window: string): string => {
    switch (window) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'This Week';
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Trending Projects</h2>
          {showTimeWindowSelector && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month'] as const).map((window) => (
                <button
                  key={window}
                  disabled
                  className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-400"
                >
                  {getTimeWindowLabel(window)}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <h2 className="text-2xl font-bold mb-6">Trending Projects</h2>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Trending Projects</h2>
        
        {showTimeWindowSelector && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((window) => (
              <button
                key={window}
                onClick={() => setTimeWindow(window)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeWindow === window
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {getTimeWindowLabel(window)}
              </button>
            ))}
          </div>
        )}
      </div>

      {trendingProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No trending projects found for {getTimeWindowLabel(timeWindow).toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingProjects.map((project, index) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => handleProjectClick(project, index)}
              className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className="relative">
                {project.coverImage ? (
                  <Image
                    src={project.coverImage}
                    alt={project.title}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-4xl">🔥</div>
                  </div>
                )}
                
                {/* Trending badge */}
                <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  #{index + 1}
                </div>
                
                {/* Engagement velocity */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                  {formatEngagementVelocity(project.engagementVelocity)} eng/hr
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                  {project.title}
                </h3>
                
                {project.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                )}
                
                {/* Engagement stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {project.recentViews}
                    </span>
                    
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {project.recentLikes}
                    </span>
                    
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      {project.recentFollows}
                    </span>
                  </div>
                </div>
                
                {/* Tech stack tags */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.techStack.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.techStack.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        +{project.techStack.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}