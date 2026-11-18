import { useAuth } from '../context/AuthContext';
import { readStoredJson } from '../utils/storage';

export const useLiveAccount = () => {
  const { user } = useAuth();
  return user || readStoredJson('kajacheAuth', {});
};
