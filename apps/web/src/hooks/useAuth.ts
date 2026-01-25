import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  plan: string;
  isAdmin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('openflow_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('openflow_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('openflow_token');
    setUser(null);
    window.location.href = '/';
  };

  return { user, loading, logout };
}
