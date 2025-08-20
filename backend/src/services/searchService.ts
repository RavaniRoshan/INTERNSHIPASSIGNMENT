import { MeiliSearch, Index } from 'meilisearch';
import { Project } from '@prisma/client';

export interface SearchDocument {
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
  isPublished: boolean;
}

export interface SearchQuery {
  query?: string;
  tags?: string[];
  techStack?: string[];
  sortBy?: 'relevance' | 'date' | 'popularity';
  page: number;
  limit: number;
}

export interface SearchResponse {
  results: SearchDocument[];
  totalCount: number;
  facets: {
    tags: { [key: string]: number };
    techStack: { [key: string]: number };
  };
  suggestions?: string[];
}

export class SearchService {
  private client: MeiliSearch;
  private index: Index;
  private readonly indexName = 'projects';

  constructor() {
    const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    const apiKey = process.env.MEILISEARCH_API_KEY || '';
    
    this.client = new MeiliSearch({
      host,
      apiKey: apiKey || undefined,
    });
    
    this.index = this.client.index(this.indexName);
  }

  async initialize(): Promise<void> {
    try {
      // Create index if it doesn't exist
      await this.client.createIndex(this.indexName, { primaryKey: 'id' });
    } catch (error: any) {
      // Index might already exist, which is fine
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }

    // Configure searchable attributes
    await this.index.updateSearchableAttributes([
      'title',
      'description',
      'content',
      'tags',
      'techStack',
      'creatorName'
    ]);

    // Configure filterable attributes
    await this.index.updateFilterableAttributes([
      'tags',
      'techStack',
      'isPublished',
      'createdAt',
      'viewCount',
      'engagementScore'
    ]);

    // Configure sortable attributes
    await this.index.updateSortableAttributes([
      'createdAt',
      'viewCount',
      'engagementScore'
    ]);

    // Configure faceting
    await this.index.updateFaceting({
      maxValuesPerFacet: 100
    });
  }

  async indexProject(project: Project & { creator: { name: string } }): Promise<void> {
    const document: SearchDocument = {
      id: project.id,
      title: project.title,
      description: project.description || '',
      content: this.extractTextFromContent(project.content),
      tags: project.tags || [],
      techStack: project.techStack || [],
      creatorName: project.creator.name,
      createdAt: project.createdAt.getTime(),
      viewCount: project.viewCount,
      engagementScore: project.engagementScore,
      isPublished: project.isPublished
    };

    await this.index.addDocuments([document]);
  }

  async indexProjects(projects: (Project & { creator: { name: string } })[]): Promise<void> {
    const documents: SearchDocument[] = projects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description || '',
      content: this.extractTextFromContent(project.content),
      tags: project.tags || [],
      techStack: project.techStack || [],
      creatorName: project.creator.name,
      createdAt: project.createdAt.getTime(),
      viewCount: project.viewCount,
      engagementScore: project.engagementScore,
      isPublished: project.isPublished
    }));

    await this.index.addDocuments(documents);
  }

  async removeProject(projectId: string): Promise<void> {
    await this.index.deleteDocument(projectId);
  }

  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const {
      query = '',
      tags = [],
      techStack = [],
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = searchQuery;

    // Build filters
    const filters: string[] = ['isPublished = true'];
    
    if (tags.length > 0) {
      const tagFilters = tags.map(tag => `tags = "${tag}"`).join(' OR ');
      filters.push(`(${tagFilters})`);
    }
    
    if (techStack.length > 0) {
      const techFilters = techStack.map(tech => `techStack = "${tech}"`).join(' OR ');
      filters.push(`(${techFilters})`);
    }

    // Build sort criteria
    let sort: string[] = [];
    switch (sortBy) {
      case 'date':
        sort = ['createdAt:desc'];
        break;
      case 'popularity':
        sort = ['engagementScore:desc', 'viewCount:desc'];
        break;
      default:
        // Relevance is default, no sort needed
        break;
    }

    const searchParams: any = {
      q: query,
      filter: filters.join(' AND '),
      facets: ['tags', 'techStack'],
      limit,
      offset: (page - 1) * limit,
      attributesToHighlight: ['title', 'description'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    };

    if (sort.length > 0) {
      searchParams.sort = sort;
    }

    const result = await this.index.search(query, searchParams);

    return {
      results: result.hits as SearchDocument[],
      totalCount: result.estimatedTotalHits || 0,
      facets: {
        tags: result.facetDistribution?.tags || {},
        techStack: result.facetDistribution?.techStack || {}
      },
      suggestions: [] // Meilisearch doesn't have built-in suggestions, could implement separately
    };
  }

  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    // Simple implementation using search results
    const result = await this.index.search(query, {
      limit,
      attributesToRetrieve: ['title']
    });

    return result.hits.map((hit: any) => hit.title).slice(0, limit);
  }

  async getStats(): Promise<any> {
    return await this.index.getStats();
  }

  private extractTextFromContent(content: any): string {
    if (!content) return '';
    
    // If content is a JSON object (from rich text editor), extract text
    if (typeof content === 'object') {
      return this.extractTextFromJSON(content);
    }
    
    // If content is already a string, return as is
    if (typeof content === 'string') {
      return content;
    }
    
    return '';
  }

  private extractTextFromJSON(obj: any): string {
    if (!obj) return '';
    
    let text = '';
    
    if (typeof obj === 'string') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.extractTextFromJSON(item)).join(' ');
    }
    
    if (typeof obj === 'object') {
      // Handle TipTap JSON structure
      if (obj.type === 'text' && obj.text) {
        return obj.text;
      }
      
      if (obj.content && Array.isArray(obj.content)) {
        return obj.content.map((item: any) => this.extractTextFromJSON(item)).join(' ');
      }
      
      // Recursively extract text from all object values
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          text += ' ' + this.extractTextFromJSON(obj[key]);
        }
      }
    }
    
    return text.trim();
  }
}

export const searchService = new SearchService();