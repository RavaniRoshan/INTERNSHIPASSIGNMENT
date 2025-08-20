'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingProjects, PersonalizedRecommendations } from '@/components/recommendations';

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Creator Portfolio Hub
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Discover amazing projects and showcase your creative work
            </p>
            
            {!isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/discover"
                  className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Explore Projects
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {user?.role === 'CREATOR' ? (
                  <>
                    <Link
                      href="/creator/dashboard"
                      className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Creator Dashboard
                    </Link>
                    <Link
                      href="/creator/projects"
                      className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                    >
                      My Projects
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/discover"
                      className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                    >
                      Discover Projects
                    </Link>
                    <Link
                      href="/search"
                      className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                    >
                      Search
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Personalized Recommendations (for authenticated users) */}
        {isAuthenticated && (
          <div className="mb-16">
            <PersonalizedRecommendations limit={8} />
          </div>
        )}

        {/* Trending Projects */}
        <div className="mb-16">
          <TrendingProjects limit={12} />
        </div>

        {/* Call to Action */}
        {!isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to showcase your work?
            </h2>
            <p className="text-gray-600 mb-6">
              Join thousands of creators sharing their projects and building their portfolios
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login?tab=register&role=creator"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Creating
              </Link>
              <Link
                href="/login?tab=register&role=viewer"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Join as Viewer
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
