'use client';

import { useAuth } from '@/contexts/AuthContext';
import { CreatorRoute } from '@/components/auth/ProtectedRoute';
import DashboardAnalytics from '@/components/analytics/DashboardAnalytics';

function DashboardContent() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Creator Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.profile?.firstName || user?.email}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Analytics Dashboard */}
          <DashboardAnalytics />
        </div>
      </main>
    </div>
  );
}

export default function CreatorDashboard() {
  return (
    <CreatorRoute>
      <DashboardContent />
    </CreatorRoute>
  );
}