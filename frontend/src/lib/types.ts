export interface User {
  id: string;
  email: string;
  role: 'CREATOR' | 'VIEWER';
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'CREATOR' | 'VIEWER';
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
  };
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: string;
}

export interface Project {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  content?: Record<string, unknown>; // Rich text JSON content
  coverImage?: string;
  mediaGallery?: MediaItem[];
  tags: string[];
  techStack: string[];
  isPublished: boolean;
  viewCount: number;
  engagementScore: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      website?: string;
      avatar?: string;
    };
  };
}

export interface ProjectCreateData {
  title: string;
  description?: string;
  content?: Record<string, unknown>;
  coverImage?: string;
  mediaGallery?: MediaItem[];
  tags?: string[];
  techStack?: string[];
  isPublished?: boolean;
}

export interface ProjectUpdateData {
  title?: string;
  description?: string;
  content?: Record<string, unknown>;
  coverImage?: string;
  mediaGallery?: MediaItem[];
  tags?: string[];
  techStack?: string[];
  isPublished?: boolean;
}

export interface ProjectsResponse {
  projects: Project[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

// Analytics Types
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

export interface AnalyticsEvent {
  action: 'VIEW' | 'LIKE' | 'FOLLOW' | 'SHARE';
  projectId?: string;
  followedUserId?: string;
}

// User Profile and Following Types
export interface UserProfile {
  id: string;
  email: string;
  role: 'CREATOR' | 'VIEWER';
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    avatar?: string;
  };
  createdAt: string;
  stats: {
    projectCount: number;
    followerCount: number;
    followingCount: number;
  };
  isFollowing: boolean;
}

export interface FollowUser {
  id: string;
  email: string;
  role: 'CREATOR' | 'VIEWER';
  profile?: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    website?: string;
    avatar?: string;
  };
  stats: {
    projectCount: number;
    followerCount: number;
  };
  followedAt: string;
}

export interface FollowersResponse {
  followers: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface FollowingResponse {
  following: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface FollowingFeedProject extends Project {
  followedCreatorAt: string;
}