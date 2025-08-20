import { Project } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface ProjectEmbedding {
  projectId: string;
  embeddings: number[];
}

export interface SimilarityResult {
  projectId: string;
  similarity: number;
  project?: Project;
}

/**
 * Service for generating and managing project embeddings for similarity search
 */
export class EmbeddingService {
  private readonly EMBEDDING_DIMENSION = 384;

  /**
   * Generate embeddings for a project based on its tags and tech stack
   * Uses a simple TF-IDF-like approach for demonstration
   * In production, you might use a more sophisticated embedding model
   */
  generateProjectEmbedding(project: Pick<Project, 'tags' | 'techStack' | 'title' | 'description'>): number[] {
    const features = [
      ...project.tags,
      ...project.techStack,
      ...(project.title?.toLowerCase().split(' ') || []),
      ...(project.description?.toLowerCase().split(' ') || [])
    ].filter(Boolean);

    // Create a simple bag-of-words embedding
    const vocabulary = this.getVocabulary();
    const embedding = new Array(this.EMBEDDING_DIMENSION).fill(0);

    // Simple frequency-based embedding
    features.forEach(feature => {
      const index = this.hashToIndex(feature.toLowerCase());
      embedding[index] += 1;
    });

    // Normalize the embedding vector
    return this.normalizeVector(embedding);
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Update embeddings for a project
   */
  async updateProjectEmbedding(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { tags: true, techStack: true, title: true, description: true }
    });

    if (!project) {
      throw new Error(`Project with id ${projectId} not found`);
    }

    const embeddings = this.generateProjectEmbedding(project);
    
    // Store embeddings in database using raw SQL since Prisma doesn't fully support vector types yet
    await prisma.$executeRaw`
      UPDATE projects 
      SET embeddings = ${embeddings}::vector 
      WHERE id = ${projectId}
    `;
  }

  /**
   * Find similar projects using vector similarity search
   */
  async findSimilarProjects(
    projectId: string, 
    limit: number = 10,
    threshold: number = 0.1
  ): Promise<SimilarityResult[]> {
    // Get the target project's embeddings
    const targetProject = await prisma.$queryRaw<Array<{ embeddings: number[] }>>`
      SELECT embeddings FROM projects WHERE id = ${projectId} AND embeddings IS NOT NULL
    `;

    if (!targetProject.length || !targetProject[0].embeddings) {
      return [];
    }

    const targetEmbeddings = targetProject[0].embeddings;

    // Find similar projects using cosine similarity
    const similarProjects = await prisma.$queryRaw<Array<{
      id: string;
      similarity: number;
      title: string;
      description: string;
      coverImage: string;
      tags: string[];
      techStack: string[];
      viewCount: number;
      createdAt: Date;
    }>>`
      SELECT 
        p.id,
        1 - (p.embeddings <=> ${targetEmbeddings}::vector) as similarity,
        p.title,
        p.description,
        p.cover_image as "coverImage",
        p.tags,
        p.tech_stack as "techStack",
        p.view_count as "viewCount",
        p.created_at as "createdAt"
      FROM projects p
      WHERE p.id != ${projectId} 
        AND p.is_published = true 
        AND p.embeddings IS NOT NULL
        AND 1 - (p.embeddings <=> ${targetEmbeddings}::vector) > ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return similarProjects.map(project => ({
      projectId: project.id,
      similarity: project.similarity,
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        coverImage: project.coverImage,
        tags: project.tags,
        techStack: project.techStack,
        viewCount: project.viewCount,
        createdAt: project.createdAt
      } as any
    }));
  }

  /**
   * Batch update embeddings for all projects
   */
  async updateAllProjectEmbeddings(): Promise<void> {
    const projects = await prisma.project.findMany({
      where: { isPublished: true },
      select: { id: true, tags: true, techStack: true, title: true, description: true }
    });

    for (const project of projects) {
      try {
        await this.updateProjectEmbedding(project.id);
      } catch (error) {
        console.error(`Failed to update embeddings for project ${project.id}:`, error);
      }
    }
  }

  /**
   * Hash a string to an index within the embedding dimension
   */
  private hashToIndex(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.EMBEDDING_DIMENSION;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  }

  /**
   * Get vocabulary for embedding generation
   * In a real implementation, this would be loaded from a pre-trained model
   */
  private getVocabulary(): string[] {
    // This is a simplified vocabulary - in production you'd use a proper model
    return [
      'javascript', 'typescript', 'react', 'vue', 'angular', 'node', 'python', 'java',
      'web', 'mobile', 'frontend', 'backend', 'fullstack', 'design', 'ui', 'ux',
      'api', 'database', 'cloud', 'aws', 'docker', 'kubernetes'
    ];
  }
}

export const embeddingService = new EmbeddingService();