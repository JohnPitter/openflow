import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('openflow_token', token);
      // Redirect to requirements check first, then to dashboard
      window.location.href = '/requirements';
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
