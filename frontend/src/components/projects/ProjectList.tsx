'use client';

import { useState } from 'react';
import { Project } from '@/lib/types';

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  isLoading?: boolean;
}

export default function ProjectList({ projects, onEdit, onDelete, isLoading = false }: ProjectListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDeleteClick = (project: Project) => {
    setDeleteConfirm(project.id);
  };

  const handleDeleteConfirm = (project: Project) => {
    onDelete(project);
    setDeleteConfirm(null);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse" data-testid="loading-skeleton">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4">No projects found</div>
        <p className="text-gray-400">Create your first project to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{project.title}</h3>
              {project.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  project.isPublished
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {project.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          {(project.tags.length > 0 || project.techStack.length > 0) && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>Created: {formatDate(project.createdAt)}</span>
              <span>Updated: {formatDate(project.updatedAt)}</span>
              {project.isPublished && (
                <span>{project.viewCount} views</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(project)}
                className="px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                Edit
              </button>
              {deleteConfirm === project.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDeleteConfirm(project)}
                    className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors text-xs"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleDeleteCancel}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleDeleteClick(project)}
                  className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}