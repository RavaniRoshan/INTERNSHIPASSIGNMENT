'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'CREATOR' | 'VIEWER';
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requiredRole && user?.role !== requiredRole) {
        // Redirect based on user role
        if (user?.role === 'CREATOR') {
          router.push('/creator/dashboard');
        } else {
          router.push('/discover');
        }
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router, redirectTo]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or wrong role
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}

// Convenience components for specific roles
export function CreatorRoute({ children, redirectTo }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="CREATOR" redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
}

export function ViewerRoute({ children, redirectTo }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole="VIEWER" redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
}

export function AuthenticatedRoute({ children, redirectTo }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
}