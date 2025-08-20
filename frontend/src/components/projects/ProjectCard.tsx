'use client';

import { Project } from '@/lib/types';
import Link from 'next/link';
import { ProjectThumbnail } from '@/components/ui/OptimizedImage';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
        {project.coverImage && (
          <div className="aspect-video w-full overflow-hidden relative">
            <ProjectThumbnail
              src={project.coverImage}
              alt={project.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
            {project.title}
          </h3>
          
          {project.description && (
            <p className="text-gray-600 mb-3 line-clamp-3">
              {project.description}
            </p>
          )}

          {(project.tags.length > 0 || project.techStack.length > 0) && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {project.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
                {project.techStack.slice(0, 2).map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {tech}
                  </span>
                ))}
                {(project.tags.length + project.techStack.length) > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    +{(project.tags.length + project.techStack.length) - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                {project.creator.profile?.firstName?.[0] || project.creator.email[0].toUpperCase()}
              </div>
              <span className="truncate">
                {project.creator.profile?.firstName 
                  ? `${project.creator.profile.firstName} ${project.creator.profile.lastName || ''}`.trim()
                  : project.creator.email.split('@')[0]
                }
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span>{project.viewCount} views</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}