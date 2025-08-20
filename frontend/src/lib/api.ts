import axios from 'axios';
import { nanoid } from 'nanoid';
import { APIResponse, AuthResponse, LoginData, RegisterData, User, Project, ProjectCreateData, ProjectUpdateData, ProjectsResponse, ProjectAnalyticsData, DashboardAnalytics, FunnelAnalytics, AnalyticsEvent } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Mock mode for development when backend is not available
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_API === 'true';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // In a real app, you'd have a refresh endpoint
          // For now, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Mock user data
const mockUser: User = {
  id: 'user1',
  email: 'creator@example.com',
  role: 'CREATOR',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Full-stack developer and creator',
    website: 'https://johndoe.dev'
  },
  createdAt: '2024-01-01T00:00:00Z'
};

export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    if (MOCK_MODE) {
      const authResponse: AuthResponse = {
        user: { ...mockUser, email: data.email, role: data.role },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };
      return new Promise(resolve => setTimeout(() => resolve(authResponse), 500));
    }
    
    const response = await api.post<APIResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    if (MOCK_MODE) {
      const authResponse: AuthResponse = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };
      return new Promise(resolve => setTimeout(() => resolve(authResponse), 500));
    }
    
    const response = await api.post<APIResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  getProfile: async (): Promise<User> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve(mockUser), 300));
    }
    
    const response = await api.get<APIResponse<User>>('/auth/profile');
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve(), 200));
    }
    
    await api.post('/auth/logout');
  },
};

// Mock data for development
const mockProjects: Project[] = [
  {
    id: '1',
    creatorId: 'user1',
    title: 'E-commerce Platform',
    description: 'A full-stack e-commerce platform built with React and Node.js',
    tags: ['React', 'Node.js', 'E-commerce'],
    techStack: ['React', 'Node.js', 'MongoDB', 'Express'],
    isPublished: true,
    viewCount: 150,
    engagementScore: 4.5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    creator: {
      id: 'user1',
      email: 'creator@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  },
  {
    id: '2',
    creatorId: 'user1',
    title: 'Mobile Weather App',
    description: 'A React Native weather application with real-time updates',
    tags: ['Mobile', 'Weather', 'React Native'],
    techStack: ['React Native', 'TypeScript', 'API Integration'],
    isPublished: false,
    viewCount: 0,
    engagementScore: 0,
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
    creator: {
      id: 'user1',
      email: 'creator@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe'
      }
    }
  }
];

export const projectAPI = {
  createProject: async (data: ProjectCreateData): Promise<Project> => {
    if (MOCK_MODE) {
      // Mock implementation
      const newProject: Project = {
        id: Date.now().toString(),
        creatorId: 'user1',
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        techStack: data.techStack || [],
        isPublished: data.isPublished || false,
        viewCount: 0,
        engagementScore: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creator: {
          id: 'user1',
          email: 'creator@example.com',
          profile: {
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      };
      mockProjects.unshift(newProject);
      return new Promise(resolve => setTimeout(() => resolve(newProject), 500));
    }
    
    const response = await api.post<APIResponse<Project>>('/projects', data);
    return response.data.data!;
  },

  getProject: async (id: string): Promise<Project> => {
    if (MOCK_MODE) {
      const project = mockProjects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      return new Promise(resolve => setTimeout(() => resolve(project), 300));
    }
    
    const response = await api.get<APIResponse<Project>>(`/projects/${id}`);
    return response.data.data!;
  },

  updateProject: async (id: string, data: ProjectUpdateData): Promise<Project> => {
    if (MOCK_MODE) {
      const projectIndex = mockProjects.findIndex(p => p.id === id);
      if (projectIndex === -1) throw new Error('Project not found');
      
      const updatedProject = {
        ...mockProjects[projectIndex],
        ...data,
        updatedAt: new Date().toISOString()
      };
      mockProjects[projectIndex] = updatedProject;
      return new Promise(resolve => setTimeout(() => resolve(updatedProject), 500));
    }
    
    const response = await api.put<APIResponse<Project>>(`/projects/${id}`, data);
    return response.data.data!;
  },

  deleteProject: async (id: string): Promise<void> => {
    if (MOCK_MODE) {
      const projectIndex = mockProjects.findIndex(p => p.id === id);
      if (projectIndex !== -1) {
        mockProjects.splice(projectIndex, 1);
      }
      return new Promise(resolve => setTimeout(() => resolve(), 300));
    }
    
    await api.delete(`/projects/${id}`);
  },

  getMyProjects: async (): Promise<Project[]> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve([...mockProjects]), 800));
    }
    
    const response = await api.get<APIResponse<Project[]>>('/projects/creator/my-projects');
    return response.data.data!;
  },

  getPublishedProjects: async (page = 1, limit = 10): Promise<ProjectsResponse> => {
    if (MOCK_MODE) {
      const publishedProjects = mockProjects.filter(p => p.isPublished);
      return new Promise(resolve => setTimeout(() => resolve({
        projects: publishedProjects,
        totalCount: publishedProjects.length,
        totalPages: 1,
        currentPage: 1
      }), 600));
    }
    
    const response = await api.get<APIResponse<ProjectsResponse>>(`/projects/published?page=${page}&limit=${limit}`);
    return response.data.data!;
  },
};

// Upload API
export const uploadAPI = {
  getPresignedUrl: async (fileName: string, fileType: string): Promise<{ uploadUrl: string; fileUrl: string }> => {
    if (MOCK_MODE) {
      // Mock presigned URL response
      return new Promise(resolve => setTimeout(() => resolve({
        uploadUrl: 'https://mock-upload-url.com',
        fileUrl: `https://mock-storage.com/${fileName}`
      }), 200));
    }
    
    const response = await api.post<APIResponse<{ uploadUrl: string; fileUrl: string }>>('/upload/presigned-url', {
      fileName,
      fileType
    });
    return response.data.data!;
  },

  uploadToPresignedUrl: async (presignedUrl: string, file: File): Promise<void> => {
    if (MOCK_MODE) {
      // Mock upload with progress simulation
      return new Promise(resolve => setTimeout(() => resolve(), 1000));
    }
    
    // Upload directly to cloud storage using presigned URL
    await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  completeUpload: async (fileUrl: string, metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
  }): Promise<{ id: string; url: string; thumbnailUrl?: string }> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve({
        id: nanoid(),
        url: fileUrl,
        thumbnailUrl: metadata.fileType.startsWith('video/') ? fileUrl : undefined
      }), 300));
    }
    
    const response = await api.post<APIResponse<{ id: string; url: string; thumbnailUrl?: string }>>('/upload/complete', {
      fileUrl,
      ...metadata
    });
    return response.data.data!;
  },
};

// Search API
export const searchAPI = {
  searchProjects: async (query: string, filters?: {
    tags?: string[];
    techStack?: string[];
    sortBy?: 'relevance' | 'date' | 'popularity';
    page?: number;
    limit?: number;
  }): Promise<{
    results: Project[];
    totalCount: number;
    facets: {
      tags: { [key: string]: number };
      techStack: { [key: string]: number };
    };
    suggestions?: string[];
  }> => {
    if (MOCK_MODE) {
      const filteredProjects = mockProjects.filter(p => 
        p.isPublished && 
        (p.title.toLowerCase().includes(query.toLowerCase()) ||
         p.description?.toLowerCase().includes(query.toLowerCase()))
      );
      
      return new Promise(resolve => setTimeout(() => resolve({
        results: filteredProjects,
        totalCount: filteredProjects.length,
        facets: {
          tags: { 'React': 2, 'Node.js': 1, 'Mobile': 1 },
          techStack: { 'React': 2, 'Node.js': 1, 'TypeScript': 1 }
        },
        suggestions: query ? ['React projects', 'Node.js apps'] : undefined
      }), 400));
    }
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters?.tags) filters.tags.forEach(tag => params.append('tags', tag));
    if (filters?.techStack) filters.techStack.forEach(tech => params.append('techStack', tech));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get(`/search?${params.toString()}`);
    return response.data.data!;
  },
};

// Recommendation API
export const recommendationAPI = {
  getSimilarProjects: async (projectId: string, options?: {
    limit?: number;
    excludeCreator?: boolean;
  }): Promise<{
    projectId: string;
    similarProjects: Array<{
      project: Project;
      similarity: number;
    }>;
    count: number;
  }> => {
    if (MOCK_MODE) {
      const similarProjects = mockProjects
        .filter(p => p.id !== projectId && p.isPublished)
        .slice(0, options?.limit || 10)
        .map(project => ({
          project,
          similarity: Math.random() * 0.5 + 0.5 // Random similarity between 0.5-1.0
        }));
      
      return new Promise(resolve => setTimeout(() => resolve({
        projectId,
        similarProjects,
        count: similarProjects.length
      }), 300));
    }
    
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.excludeCreator) params.append('excludeCreator', 'true');
    
    const response = await api.get(`/recommendations/similar/${projectId}?${params.toString()}`);
    return response.data.data!;
  },

  getTrendingProjects: async (options?: {
    timeWindow?: 'day' | 'week' | 'month';
    limit?: number;
  }): Promise<{
    timeWindow: string;
    projects: Array<Project & {
      engagementVelocity: number;
      recentViews: number;
      recentLikes: number;
      recentFollows: number;
    }>;
    count: number;
  }> => {
    if (MOCK_MODE) {
      const trendingProjects = mockProjects
        .filter(p => p.isPublished)
        .slice(0, options?.limit || 20)
        .map(project => ({
          ...project,
          engagementVelocity: Math.random() * 20 + 5,
          recentViews: Math.floor(Math.random() * 100) + 10,
          recentLikes: Math.floor(Math.random() * 20) + 2,
          recentFollows: Math.floor(Math.random() * 5) + 1
        }));
      
      return new Promise(resolve => setTimeout(() => resolve({
        timeWindow: options?.timeWindow || 'week',
        projects: trendingProjects,
        count: trendingProjects.length
      }), 400));
    }
    
    const params = new URLSearchParams();
    if (options?.timeWindow) params.append('timeWindow', options.timeWindow);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await api.get(`/recommendations/trending?${params.toString()}`);
    return response.data.data!;
  },

  getPersonalizedRecommendations: async (options?: {
    limit?: number;
  }): Promise<{
    userId: string;
    recommendations: Array<{
      project: Project;
      score: number;
      reason: 'similar_content' | 'followed_creator' | 'trending' | 'similar_engagement';
    }>;
    count: number;
  }> => {
    if (MOCK_MODE) {
      const recommendations = mockProjects
        .filter(p => p.isPublished)
        .slice(0, options?.limit || 15)
        .map(project => ({
          project,
          score: Math.random() * 0.5 + 0.5,
          reason: (['similar_content', 'followed_creator', 'trending', 'similar_engagement'] as const)[
            Math.floor(Math.random() * 4)
          ]
        }));
      
      return new Promise(resolve => setTimeout(() => resolve({
        userId: 'user1',
        recommendations,
        count: recommendations.length
      }), 500));
    }
    
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const response = await api.get(`/recommendations/personalized?${params.toString()}`);
    return response.data.data!;
  },

  trackRecommendationClick: async (data: {
    projectId: string;
    recommendationType: string;
    position: number;
  }): Promise<void> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve(), 100));
    }
    
    await api.post('/recommendations/track-click', data);
  },
};

// Analytics API
export const analyticsAPI = {
  getProjectAnalytics: async (projectId: string, days = 30): Promise<ProjectAnalyticsData[]> => {
    if (MOCK_MODE) {
      const mockAnalytics: ProjectAnalyticsData[] = Array.from({ length: days }, (_, i) => ({
        projectId,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        views: Math.floor(Math.random() * 50) + 10,
        uniqueViews: Math.floor(Math.random() * 40) + 8,
        ctr: Math.random() * 0.1 + 0.02,
        engagementRate: Math.random() * 0.2 + 0.05,
        referralSources: {
          google: Math.floor(Math.random() * 20) + 5,
          direct: Math.floor(Math.random() * 15) + 3,
          social: Math.floor(Math.random() * 10) + 2,
        },
      }));
      
      return new Promise(resolve => setTimeout(() => resolve(mockAnalytics), 400));
    }
    
    const response = await api.get<APIResponse<ProjectAnalyticsData[]>>(`/analytics/project/${projectId}?days=${days}`);
    return response.data.data!;
  },

  getDashboardAnalytics: async (): Promise<DashboardAnalytics> => {
    if (MOCK_MODE) {
      const mockDashboard: DashboardAnalytics = {
        totalViews: 2450,
        totalProjects: 8,
        totalFollowers: 156,
        viewsThisMonth: 890,
        topProjects: [
          { id: '1', title: 'E-commerce Platform', views: 450, engagementRate: 12.5 },
          { id: '2', title: 'Mobile Weather App', views: 320, engagementRate: 8.7 },
          { id: '3', title: 'Task Management Tool', views: 280, engagementRate: 15.2 },
          { id: '4', title: 'Portfolio Website', views: 190, engagementRate: 6.8 },
          { id: '5', title: 'Chat Application', views: 150, engagementRate: 9.3 },
        ],
        viewsTrend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 100) + 20,
        })).reverse(),
        engagementTrend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          engagements: Math.floor(Math.random() * 20) + 5,
        })).reverse(),
      };
      
      return new Promise(resolve => setTimeout(() => resolve(mockDashboard), 600));
    }
    
    const response = await api.get<APIResponse<DashboardAnalytics>>('/analytics/dashboard');
    return response.data.data!;
  },

  getFunnelAnalytics: async (projectId: string): Promise<FunnelAnalytics> => {
    if (MOCK_MODE) {
      const mockFunnel: FunnelAnalytics = {
        projectId,
        views: 1250,
        engagements: 89,
        follows: 23,
        conversionRate: 1.84,
      };
      
      return new Promise(resolve => setTimeout(() => resolve(mockFunnel), 300));
    }
    
    const response = await api.get<APIResponse<FunnelAnalytics>>(`/analytics/funnel/${projectId}`);
    return response.data.data!;
  },

  trackEvent: async (event: AnalyticsEvent): Promise<void> => {
    if (MOCK_MODE) {
      return new Promise(resolve => setTimeout(() => resolve(), 100));
    }
    
    await api.post('/analytics/track', event);
  },

  getRealtimeAnalytics: async (projectId: string): Promise<{
    projectId: string;
    today: ProjectAnalyticsData;
    lastUpdated: string;
  }> => {
    if (MOCK_MODE) {
      const mockRealtime = {
        projectId,
        today: {
          projectId,
          date: new Date(),
          views: Math.floor(Math.random() * 50) + 10,
          uniqueViews: Math.floor(Math.random() * 40) + 8,
          ctr: Math.random() * 0.1 + 0.02,
          engagementRate: Math.random() * 0.2 + 0.05,
          referralSources: {
            google: Math.floor(Math.random() * 20) + 5,
            direct: Math.floor(Math.random() * 15) + 3,
          },
        },
        lastUpdated: new Date().toISOString(),
      };
      
      return new Promise(resolve => setTimeout(() => resolve(mockRealtime), 200));
    }
    
    const response = await api.get(`/analytics/realtime/${projectId}`);
    return response.data.data!;
  },
};

export default api;