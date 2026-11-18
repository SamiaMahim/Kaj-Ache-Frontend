import { Navigate, useLocation } from 'react-router-dom';
import { readStoredJson } from '../../utils/storage';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ role, children }) {
  const location = useLocation();
  // Subscribing to auth re-renders this route when the session expires
  const { token } = useAuth();

  if (typeof window === 'undefined') {
    return null;
  }

  const session = readStoredJson('kajacheAuth');

  if (!token || !session || session.role !== role) {
    return <Navigate to={role === 'technician' ? '/join-technician' : '/join-customer'} state={{ from: location.pathname }} replace />;
  }

  return children;
}
