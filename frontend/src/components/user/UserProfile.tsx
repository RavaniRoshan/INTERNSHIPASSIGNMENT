'use client';

import { useState, useEffect } from 'react';
import { UserProfile as UserProfileType, Project } from '@/lib/types';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FollowList } from './FollowList';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'followers' | 'following'>('projects');

  useEffect(() => {
    fetchUserProfile();
    fetchUserProjects();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setError(response.data.error?.message || 'Failed to load profile');
      }
    } catch (err) {
      setError('Failed to load user profile');
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const response = await api.get(`/projects?creatorId=${userId}&published=true`);
      if (response.data.success) {
        setProjects(response.data.data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching user projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.delete(`/users/${userId}/follow`);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: false,
          stats: {
            ...prev.stats,
            followerCount: prev.stats.followerCount - 1
          }
        } : null);
      } else {
        await api.post(`/users/${userId}/follow`);
        setProfile(prev => prev ? {
          ...prev,
          isFollowing: true,
          stats: {
            ...prev.stats,
            followerCount: prev.stats.followerCount + 1
          }
        } : null);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const getDisplayName = (profile: UserProfileType) => {
    if (profile.profile?.firstName || profile.profile?.lastName) {
      return `${profile.profile.firstName || ''} ${profile.profile.lastName || ''}`.trim();
    }
    return profile.email.split('@')[0];
  };

  const getInitials = (profile: UserProfileType) => {
    const name = getDisplayName(profile);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white shadow-lg rounded-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'User not found'}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const canFollow = currentUser && !isOwnProfile;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 mb-8">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600">
          {profile.profile?.avatar ? (
            <img 
              src={profile.profile.avatar} 
              alt={getDisplayName(profile)}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            getInitials(profile)
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{getDisplayName(profile)}</h1>
              <div className="flex items-center space-x-4 text-gray-600 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  profile.role === 'CREATOR' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.role}
                </span>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {profile.profile?.bio && (
                <p className="text-gray-700 mb-2">{profile.profile.bio}</p>
              )}
              {profile.profile?.website && (
                <a
                  href={profile.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Website</span>
                </a>
              )}
            </div>
            
            {canFollow && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`mt-4 md:mt-0 px-4 py-2 rounded-md font-medium transition-colors ${
                  profile.isFollowing
                    ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? (
                  'Loading...'
                ) : profile.isFollowing ? (
                  <>
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6z" />
                    </svg>
                    Unfollow
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          <div className="text-2xl font-bold">{profile.stats.projectCount}</div>
          <div className="text-gray-600">Projects</div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div className="text-2xl font-bold">{profile.stats.followerCount}</div>
          <div className="text-gray-600">Followers</div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div className="text-2xl font-bold">{profile.stats.followingCount}</div>
          <div className="text-gray-600">Following</div>
        </div>
      </div>

      {/* Content Tabs */}
      <UserProfileTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projects={projects}
        userId={userId}
        isOwnProfile={isOwnProfile}
      />
    </div>
  );
}

interface UserProfileTabsProps {
  activeTab: 'projects' | 'followers' | 'following';
  setActiveTab: (tab: 'projects' | 'followers' | 'following') => void;
  projects: Project[];
  userId: string;
  isOwnProfile: boolean;
}

function UserProfileTabs({ activeTab, setActiveTab, projects, userId, isOwnProfile }: UserProfileTabsProps) {
  const tabs = [
    { id: 'projects' as const, label: 'Projects' },
    { id: 'followers' as const, label: 'Followers' },
    { id: 'following' as const, label: 'Following' }
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'projects' && (
          <div>
            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                <p className="text-gray-600">
                  {isOwnProfile ? "You haven't published any projects yet." : "No published projects yet."}
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'followers' && (
          <FollowList userId={userId} type="followers" />
        )}
        
        {activeTab === 'following' && (
          <FollowList userId={userId} type="following" />
        )}
      </div>
    </div>
  );
}