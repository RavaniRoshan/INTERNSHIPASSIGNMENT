export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface JWTPayload {
  userId: string;
  role: 'CREATOR' | 'VIEWER';
  email: string;
  iat: number;
  exp: number;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
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
  results: any[];
  totalCount: number;
  facets: {
    tags: { [key: string]: number };
    techStack: { [key: string]: number };
  };
  suggestions?: string[];
}

export interface AnalyticsEvent {
  userId?: string;
  projectId?: string;
  action: 'VIEW' | 'LIKE' | 'FOLLOW' | 'SHARE';
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface ProjectAnalyticsData {
  projectId: string;
  date: Date;
  views: number;
  uniqueViews: number;
  ctr: number;
  engagementRate: number;
  referralSources: { [source: string]: number };
}

export interface DashboardAnalytics {
  totalViews: number;
  totalProjects: number;
  totalFollowers: number;
  viewsThisMonth: number;
  topProjects: Array<{
    id: string;
    title: string;
    views: number;
    engagementRate: number;
  }>;
  viewsTrend: Array<{
    date: string;
    views: number;
  }>;
  engagementTrend: Array<{
    date: string;
    engagements: number;
  }>;
}

export interface FunnelAnalytics {
  projectId: string;
  views: number;
  engagements: number;
  follows: number;
  conversionRate: number;
}