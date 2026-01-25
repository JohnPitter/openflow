import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('openflow_token', token);
      // Full page reload to ensure auth state is refreshed
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/';
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );
}
