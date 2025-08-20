'use client';

import { useState, useEffect } from 'react';
import { FollowUser, FollowersResponse, FollowingResponse } from '@/lib/types';
import { api } from '@/lib/api';
import Link from 'next/link';

interface FollowListProps {
  userId: string;
  type: 'followers' | 'following';
}

export function FollowList({ userId, type }: FollowListProps) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [userId, type, pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}/${type}?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (response.data.success) {
        const data: FollowersResponse | FollowingResponse = response.data.data;
        setUsers(type === 'followers' ? data.followers : data.following);
        setPagination(prev => ({
          ...prev,
          totalCount: data.pagination.totalCount,
          totalPages: data.pagination.totalPages
        }));
      } else {
        setError(response.data.error?.message || `Failed to load ${type}`);
      }
    } catch (err) {
      setError(`Failed to load ${type}`);
      console.error(`Error fetching ${type}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (user: FollowUser) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const getInitials = (user: FollowUser) => {
    const name = getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-gray-600">
          {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <Link href={`/profile/${user.id}`} className="flex items-center space-x-4 flex-1">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                  {user.profile?.avatar ? (
                    <img 
                      src={user.profile.avatar} 
                      alt={getDisplayName(user)}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(user)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {getDisplayName(user)}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'CREATOR' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                    <span>{user.stats.projectCount} projects</span>
                    <span>{user.stats.followerCount} followers</span>
                  </div>
                  {user.profile?.bio && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {user.profile.bio}
                    </p>
                  )}
                </div>
              </Link>
              
              <div className="text-sm text-gray-500">
                {new Date(user.followedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    pageNum === pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}