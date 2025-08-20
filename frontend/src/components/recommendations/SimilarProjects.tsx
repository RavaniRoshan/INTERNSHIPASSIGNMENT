'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { recommendationAPI } from '@/lib/api';
import { Project } from '@/lib/types';

interface SimilarProjectsProps {
  projectId: string;
  excludeCreator?: boolean;
  limit?: number;
  className?: string;
}

interface SimilarProject {
  project: Project;
  similarity: number;
}

export default function SimilarProjects({
  projectId,
  excludeCreator = false,
  limit = 6,
  className = ''
}: SimilarProjectsProps) {
  const [similarProjects, setSimilarProjects] = useState<SimilarProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilarProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await recommendationAPI.getSimilarProjects(projectId, {
          limit,
          excludeCreator
        });
        
        setSimilarProjects(response.similarProjects);
      } catch (err) {
        console.error('Error fetching similar projects:', err);
        setError('Failed to load similar projects');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchSimilarProjects();
    }
  }, [projectId, excludeCreator, limit]);

  const handleProjectClick = (project: Project, position: number) => {
    // Track the recommendation click
    recommendationAPI.trackRecommendationClick({
      projectId: project.id,
      recommendationType: 'similar_content',
      position
    }).catch(err => {
      console.error('Error tracking recommendation click:', err);
    });
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <h3 className="text-xl font-semibold mb-4">Similar Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <h3 className="text-xl font-semibold mb-4">Similar Projects</h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (similarProjects.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-xl font-semibold mb-4">Similar Projects</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No similar projects found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-xl font-semibold mb-4">Similar Projects</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {similarProjects.map((item, index) => {
          const { project, similarity } = item;
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              onClick={() => handleProjectClick(project, index)}
              className="group block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
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
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                    <div className="text-4xl text-gray-400">📁</div>
                  </div>
                )}
                
                {/* Similarity score badge */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                  {Math.round(similarity * 100)}% match
                </div>
              </div>
              
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                  {project.title}
                </h4>
                
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
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}