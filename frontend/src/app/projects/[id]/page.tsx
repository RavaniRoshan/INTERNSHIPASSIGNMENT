import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import SimilarProjects from '@/components/recommendations/SimilarProjects';
import { ProjectViewTracker } from '@/components/projects/ProjectViewTracker';

interface Project {
  id: string;
  title: string;
  description: string;
  content: any;
  coverImage?: string;
  mediaGallery: any[];
  tags: string[];
  techStack: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    email: string;
    profile: any;
  };
}

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for popular projects
export async function generateStaticParams() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/published?limit=50`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const projects = data.data?.projects || [];
    
    return projects.map((project: Project) => ({
      id: project.id,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Fetch project data with ISR
async function getProject(id: string): Promise<Project | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`, {
      next: { 
        revalidate: 1800, // Revalidate every 30 minutes
        tags: [`project-${id}`] // For on-demand revalidation
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch project');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    return {
      title: 'Project Not Found',
      description: 'The requested project could not be found.',
    };
  }

  return {
    title: `${project.title} | Creator Portfolio Hub`,
    description: project.description || `Check out ${project.title} by ${project.creator.profile?.name || project.creator.email}`,
    openGraph: {
      title: project.title,
      description: project.description || '',
      images: project.coverImage ? [
        {
          url: project.coverImage,
          width: 1200,
          height: 630,
          alt: project.title,
        }
      ] : [],
      type: 'article',
      publishedTime: project.createdAt,
      modifiedTime: project.updatedAt,
      authors: [project.creator.profile?.name || project.creator.email],
      tags: project.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.description || '',
      images: project.coverImage ? [project.coverImage] : [],
    },
    keywords: [...project.tags, ...project.techStack],
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client-side engagement tracking */}
      <ProjectViewTracker projectId={project.id} creatorId={project.creator.id} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Project Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{project.title}</h1>
          
          {project.description && (
            <p className="text-xl text-gray-600 mb-6">{project.description}</p>
          )}

          {/* Creator Info */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {(project.creator.profile?.name || project.creator.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {project.creator.profile?.name || project.creator.email}
              </p>
              <p className="text-sm text-gray-500">
                Published {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Tags and Tech Stack */}
          <div className="flex flex-wrap gap-2 mb-6">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>{project.viewCount} views</span>
          </div>
        </header>

        {/* Cover Image */}
        {project.coverImage && (
          <div className="mb-8">
            <div className="relative w-full h-96 rounded-lg overflow-hidden">
              <Image
                src={project.coverImage}
                alt={project.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          </div>
        )}

        {/* Project Content */}
        <div className="prose prose-lg max-w-none mb-12">
          {project.content && (
            <div dangerouslySetInnerHTML={{ __html: project.content }} />
          )}
        </div>

        {/* Media Gallery */}
        {project.mediaGallery && project.mediaGallery.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Media Gallery</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.mediaGallery.map((media: any, index: number) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                  {media.type === 'image' ? (
                    <Image
                      src={media.url}
                      alt={media.alt || `Media ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <video
                      src={media.url}
                      poster={media.thumbnailUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Projects */}
        <div className="border-t pt-12">
          <SimilarProjects projectId={project.id} />
        </div>
      </div>
    </div>
  );
}