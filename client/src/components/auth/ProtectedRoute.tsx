import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // If authentication is not required, allow access but pass auth status to children
  if (!requireAuth) {
    return <Outlet />;
  }

  // If authentication is required but user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, check user's role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role || '')) {
    return <Navigate to="/" replace />;
  }

  // If all checks pass, render the protected route
  return <Outlet />;
};

export default ProtectedRoute;