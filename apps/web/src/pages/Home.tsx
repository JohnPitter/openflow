import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Github, ArrowRight, Terminal, Box, Zap, Lock, Code } from 'lucide-react';

export function Home() {
  const { user } = useAuth();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    api.auth.devMode().then((res) => setDevMode(res.devMode)).catch(() => {});
  }, []);

  return (
    <div className="home">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@400;500;600;700;800;900&display=swap');

        .home {
          --accent: #00f0ff;
          --accent-2: #ff3366;
          --bg: #0a0a0f;
          --surface: #12121a;
          --border: #1e1e2e;
          --text: #e4e4e7;
          --text-muted: #71717a;
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Outfit', sans-serif;
          color: var(--text);
          overflow-x: hidden;
        }

        /* Grid background */
        .home::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 60px 60px;
          opacity: 0.4;
          pointer-events: none;
          mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%);
        }

        /* Glow orb */
        .glow-orb {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,240,255,0.15) 0%, transparent 70%);
          top: -200px;
          right: -100px;
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }

        .glow-orb-2 {
          position: fixed;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,51,102,0.1) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          pointer-events: none;
          animation: float 10s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }

        /* Nav */
        .nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 3rem;
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
          background: rgba(10,10,15,0.8);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 800;
          font-size: 1.5rem;
          letter-spacing: -0.03em;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1rem;
          color: var(--bg);
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .nav-btn:hover {
          border-color: var(--accent);
          box-shadow: 0 0 20px rgba(0,240,255,0.2);
        }

        .nav-btn.primary {
          background: linear-gradient(135deg, var(--accent) 0%, #00c4cc 100%);
          border: none;
          color: var(--bg);
        }

        .nav-btn.primary:hover {
          box-shadow: 0 0 30px rgba(0,240,255,0.4);
          transform: translateY(-1px);
        }

        /* Hero */
        .hero {
          position: relative;
          z-index: 1;
          padding: 8rem 3rem 6rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 100px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--accent);
          margin-bottom: 2rem;
          animation: fadeIn 0.6s ease-out;
        }

        .badge::before {
          content: '';
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero h1 {
          font-size: clamp(3rem, 8vw, 5.5rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          margin-bottom: 1.5rem;
          animation: fadeIn 0.6s ease-out 0.1s both;
        }

        .hero h1 .gradient {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero p {
          font-size: 1.25rem;
          color: var(--text-muted);
          max-width: 540px;
          line-height: 1.7;
          margin-bottom: 3rem;
          animation: fadeIn 0.6s ease-out 0.2s both;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          animation: fadeIn 0.6s ease-out 0.3s both;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.75rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.25s;
          text-decoration: none;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--accent) 0%, #00c4cc 100%);
          color: var(--bg);
          box-shadow: 0 4px 30px rgba(0,240,255,0.3);
        }

        .btn-primary:hover {
          box-shadow: 0 8px 40px rgba(0,240,255,0.5);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
        }

        .btn-secondary:hover {
          border-color: var(--text-muted);
        }

        /* Terminal preview */
        .terminal-section {
          position: relative;
          z-index: 1;
          padding: 0 3rem 6rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .terminal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 80px rgba(0,0,0,0.5);
          animation: fadeIn 0.8s ease-out 0.4s both;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--border);
        }

        .terminal-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .terminal-dot.red { background: #ff5f57; }
        .terminal-dot.yellow { background: #ffbd2e; }
        .terminal-dot.green { background: #28ca41; }

        .terminal-title {
          flex: 1;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .terminal-body {
          padding: 1.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          line-height: 1.8;
        }

        .terminal-line {
          display: flex;
          gap: 0.75rem;
          opacity: 0;
          animation: typeIn 0.4s ease-out forwards;
        }

        .terminal-line:nth-child(1) { animation-delay: 0.6s; }
        .terminal-line:nth-child(2) { animation-delay: 1s; }
        .terminal-line:nth-child(3) { animation-delay: 1.4s; }
        .terminal-line:nth-child(4) { animation-delay: 1.8s; }
        .terminal-line:nth-child(5) { animation-delay: 2.2s; }

        @keyframes typeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .terminal-prompt { color: var(--accent); }
        .terminal-cmd { color: var(--text); }
        .terminal-comment { color: var(--text-muted); }
        .terminal-success { color: #28ca41; }
        .terminal-url { color: var(--accent-2); }

        /* Features */
        .features {
          position: relative;
          z-index: 1;
          padding: 6rem 3rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .features-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .features-header h2 {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }

        .features-header p {
          color: var(--text-muted);
          font-size: 1.1rem;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          position: relative;
          padding: 2rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          transition: all 0.3s;
          overflow: hidden;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .feature-card:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .feature-card:hover::before {
          opacity: 1;
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(0,240,255,0.1) 0%, rgba(255,51,102,0.1) 100%);
          border-radius: 12px;
          margin-bottom: 1.25rem;
          color: var(--accent);
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }

        .feature-card p {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        /* CTA */
        .cta {
          position: relative;
          z-index: 1;
          padding: 6rem 3rem;
          text-align: center;
        }

        .cta-box {
          max-width: 700px;
          margin: 0 auto;
          padding: 4rem;
          background: linear-gradient(135deg, rgba(0,240,255,0.05) 0%, rgba(255,51,102,0.05) 100%);
          border: 1px solid var(--border);
          border-radius: 24px;
        }

        .cta h2 {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }

        .cta p {
          color: var(--text-muted);
          font-size: 1.1rem;
          margin-bottom: 2rem;
        }

        /* Footer */
        .footer {
          position: relative;
          z-index: 1;
          padding: 2rem 3rem;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .footer a {
          color: var(--accent);
          text-decoration: none;
        }
      `}</style>

      <div className="glow-orb" />
      <div className="glow-orb-2" />

      {/* Nav */}
      <nav className="nav">
        <div className="logo">
          <div className="logo-icon">O</div>
          OpenFlow
        </div>
        {user ? (
          <Link to="/dashboard" className="nav-btn primary">
            Dashboard <ArrowRight size={16} />
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {devMode && (
              <a href="/api/auth/dev" className="nav-btn primary">
                <Code size={16} />
                Dev Login
              </a>
            )}
            <a href="/api/auth/github" className="nav-btn">
              <Github size={16} />
              Sign in
            </a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="badge">Self-hosted PaaS</div>
        <h1>
          Deploy your apps<br />
          <span className="gradient">on your own server.</span>
        </h1>
        <p>
          Connect your GitHub repo, and OpenFlow builds and deploys it automatically.
          Full control over your VPS. Like Render, but self-hosted.
        </p>
        <div className="hero-buttons">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : devMode ? (
            <a href="/api/auth/dev" className="btn btn-primary">
              <Code size={18} />
              Enter Dev Mode
            </a>
          ) : (
            <a href="/api/auth/github" className="btn btn-primary">
              <Github size={18} />
              Start with GitHub
            </a>
          )}
          <a href="https://github.com/JohnPitter/openflow" target="_blank" rel="noopener" className="btn btn-secondary">
            View on GitHub
          </a>
        </div>
      </section>

      {/* Terminal */}
      <section className="terminal-section">
        <div className="terminal">
          <div className="terminal-header">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-title">~/my-project</span>
          </div>
          <div className="terminal-body">
            <div className="terminal-line">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd">git push origin main</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-comment"># OpenFlow detects push...</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-success">✓</span>
              <span className="terminal-cmd">Building Docker image...</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-success">✓</span>
              <span className="terminal-cmd">Deploying container...</span>
            </div>
            <div className="terminal-line">
              <span className="terminal-success">✓</span>
              <span className="terminal-cmd">Live at</span>
              <span className="terminal-url">https://my-project.openflow.dev</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-header">
          <h2>Everything you need</h2>
          <p>Production-ready infrastructure in your own VPS</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Terminal size={24} /></div>
            <h3>Auto-detection</h3>
            <p>Node.js, Python, Go, PHP — OpenFlow detects your stack and builds the perfect Docker image.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={24} /></div>
            <h3>Instant deploys</h3>
            <p>Push to GitHub, deploy in seconds. Zero-downtime with blue-green deployments.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Box size={24} /></div>
            <h3>Managed databases</h3>
            <p>PostgreSQL, MySQL, MongoDB, Redis — one click, auto-backups, internal networking.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Lock size={24} /></div>
            <h3>Secure by default</h3>
            <p>SSL via Let's Encrypt, container isolation, rate limiting, and DDoS protection built-in.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-box">
          <h2>Ready to deploy?</h2>
          <p>Start deploying your projects in seconds. No credit card required.</p>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : devMode ? (
            <a href="/api/auth/dev" className="btn btn-primary">
              <Code size={18} />
              Enter Dev Mode
            </a>
          ) : (
            <a href="/api/auth/github" className="btn btn-primary">
              <Github size={18} />
              Get Started Free
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>OpenFlow — Self-hosted PaaS for developers</p>
      </footer>
    </div>
  );
}
