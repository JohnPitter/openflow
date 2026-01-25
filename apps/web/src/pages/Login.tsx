import { Github } from 'lucide-react';

export function Login() {
  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-blue-400">OpenFlow</h1>
        <p className="text-gray-400">Deploy your projects with ease</p>
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 mx-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors border border-gray-700"
        >
          <Github size={20} />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
