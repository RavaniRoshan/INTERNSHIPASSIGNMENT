'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { recommendationAPI } from '@/lib/api';
import { Project } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface PersonalizedRecommendationsProps {
  limit?: number;
  className?: string;
  showTitle?: boolean;
}

interface PersonalizedRecommendation {
  project: Project;
  score: number;
  reason: 'similar_content' | 'followed_creator' | 'trending' | 'similar_engagement';
}

const reasonLabels = {
  similar_content: 'Similar to your interests',
  followed_creator: 'From creators you follow',
  trending: 'Trending now',
  similar_engagement: 'Popular with similar users'
};

const reasonColors = {
  similar_content: 'bg-blue-100 text-blue-800',
  followed_creator: 'bg-green-100 text-green-800',
  trending: 'bg-orange-100 text-orange-800',
  similar_engagement: 'bg-purple-100 text-purple-800'
};

export default function PersonalizedRecommendations({
  limit = 12,
  className = '',
  showTitle = true
}: PersonalizedRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await recommendationAPI.getPersonalizedRecommendations({
          limit
        });
        
        setRecommendations(response.recommendations);
      } catch (err) {
        console.error('Error fetching personalized recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [user, limit]);

  const handleProjectClick = (recommendation: PersonalizedRecommendation, position: number) => {
    // Track the recommendation click
    recommendationAPI.trackRecommendationClick({
      projectId: recommendation.project.id,
      recommendationType: recommendation.reason,
      position
    }).catch(err => {
      console.error('Error tracking recommendation click:', err);
    });
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className={`${className}`}>
        {showTitle && <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Personalized Recommendations</h3>
          <p className="text-gray-600 mb-6">Sign in to see projects tailored to your interests</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${className}`}>
        {showTitle && <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>}
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
        {showTitle && <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>}
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

  if (recommendations.length === 0) {
    return (
      <div className={`${className}`}>
        {showTitle && <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-4">🌟</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600 mb-6">
            Start exploring projects and following creators to get personalized recommendations
          </p>
          <Link
            href="/discover"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Discover Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recommended for You</h2>
          <div className="text-sm text-gray-500">
            Based on your activity and preferences
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((recommendation, index) => {
          const { project, score, reason } = recommendation;
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => handleProjectClick(recommendation, index)}
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
                  <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-4xl">✨</div>
                  </div>
                )}
                
                {/* Recommendation reason badge */}
                <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full ${reasonColors[reason]}`}>
                  {reasonLabels[reason]}
                </div>
                
                {/* Recommendation score */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                  {Math.round(score * 100)}% match
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
                
                {/* Tech stack tags */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
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
                
                {/* Project stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {project.viewCount}
                    </span>
                    
                    {project.creator && (
                      <span>
                        by {project.creator.profile?.firstName} {project.creator.profile?.lastName}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-blue-600 font-medium">
                    #{index + 1}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}