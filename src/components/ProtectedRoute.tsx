import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'student' | 'admin';
}

export default function ProtectedRoute({
  requiredRole,
}: ProtectedRouteProps) {
  const { user, profile, loading, profileError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-forest-200 border-t-forest-600" />
          <p className="mt-4 text-sm text-ink-muted">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-lg border border-line bg-surface p-8 text-center">
          <h1 className="font-display text-2xl text-ink">
            Account verification failed
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            {profileError}
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Sign out and contact the platform administrator if this problem
            continues.
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (requiredRole && profile.role !== requiredRole) {
    const correctDashboard =
      profile.role === 'admin' ? '/admin' : '/student';

    return <Navigate to={correctDashboard} replace />;
  }

  return <Outlet />;
}
