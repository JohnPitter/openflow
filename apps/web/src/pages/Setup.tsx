import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Terminal,
  Shield,
  Globe,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
  ExternalLink,
} from 'lucide-react';

interface Step {
  title: string;
  description: string;
  icon: any;
  content: React.ReactNode;
}

export function Setup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative group">
      <pre className="bg-[var(--bg-deep)] rounded-lg p-4 text-sm font-mono overflow-x-auto">
        <code className="text-[var(--text-secondary)]">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 rounded-lg bg-[var(--surface)] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied === id ? (
          <Check size={14} className="text-[var(--success)]" />
        ) : (
          <Copy size={14} className="text-[var(--text-muted)]" />
        )}
      </button>
    </div>
  );

  const steps: Step[] = [
    {
      title: 'Get a VPS',
      description: 'Choose a cloud provider and create a server',
      icon: Server,
      content: (
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            First, you need a VPS (Virtual Private Server) from a cloud provider.
            Here are some recommended options:
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'DigitalOcean', url: 'https://digitalocean.com', min: '$6/mo' },
              { name: 'Hetzner', url: 'https://hetzner.com', min: '€4/mo' },
              { name: 'Vultr', url: 'https://vultr.com', min: '$6/mo' },
              { name: 'Linode', url: 'https://linode.com', min: '$5/mo' },
            ].map((provider) => (
              <a
                key={provider.name}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-4 hover:border-[var(--accent)]/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{provider.name}</span>
                  <ExternalLink
                    size={14}
                    className="text-[var(--text-muted)] group-hover:text-[var(--accent)]"
                  />
                </div>
                <span className="text-sm text-[var(--text-muted)]">Starting at {provider.min}</span>
              </a>
            ))}
          </div>

          <div className="card p-4 bg-[var(--accent)]/5 border-[var(--accent)]/20">
            <h4 className="font-medium mb-2">Minimum Requirements</h4>
            <ul className="text-sm text-[var(--text-secondary)] space-y-1">
              <li>• 2 GB RAM (4 GB recommended)</li>
              <li>• 1 CPU core (2+ recommended)</li>
              <li>• 20 GB storage</li>
              <li>• Ubuntu 22.04 LTS or Debian 12</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Install Docker',
      description: 'Set up Docker on your server',
      icon: Terminal,
      content: (
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            Connect to your VPS via SSH and run the following commands to install Docker:
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">1. Update system packages</h4>
              <CodeBlock code="sudo apt update && sudo apt upgrade -y" id="apt-update" />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">2. Install Docker</h4>
              <CodeBlock
                code={`curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh`}
                id="install-docker"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">3. Add your user to docker group</h4>
              <CodeBlock code="sudo usermod -aG docker $USER" id="docker-group" />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">4. Start Docker service</h4>
              <CodeBlock
                code={`sudo systemctl enable docker
sudo systemctl start docker`}
                id="start-docker"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">5. Verify installation</h4>
              <CodeBlock code="docker --version" id="docker-version" />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Install OpenFlow',
      description: 'Clone and configure OpenFlow',
      icon: Zap,
      content: (
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            Now let's install OpenFlow on your server:
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">1. Install Node.js 20+</h4>
              <CodeBlock
                code={`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs`}
                id="install-node"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">2. Clone OpenFlow repository</h4>
              <CodeBlock
                code={`git clone https://github.com/JohnPitter/openflow.git
cd openflow`}
                id="clone-repo"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">3. Install dependencies</h4>
              <CodeBlock code="npm install" id="npm-install" />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">4. Configure environment</h4>
              <CodeBlock
                code={`cp .env.example .env
nano .env`}
                id="config-env"
              />
            </div>

            <div className="card p-4 bg-[var(--warning)]/5 border-[var(--warning)]/20">
              <h4 className="font-medium mb-2 text-[var(--warning)]">Important .env settings</h4>
              <pre className="text-sm font-mono text-[var(--text-secondary)]">
{`# Set to false for production
DEV_MODE=false

# Your domain
DOMAIN=https://your-domain.com
API_URL=https://api.your-domain.com

# GitHub OAuth (create at github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Generate with: openssl rand -base64 32
JWT_SECRET=your_random_secret`}
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Configure SSL & Domain',
      description: 'Set up HTTPS with Traefik',
      icon: Shield,
      content: (
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            Configure Traefik as reverse proxy with automatic SSL certificates:
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">1. Point your domain to your server</h4>
              <p className="text-sm text-[var(--text-muted)] mb-2">
                Add these DNS records pointing to your server IP:
              </p>
              <CodeBlock
                code={`A    @              → YOUR_SERVER_IP
A    api            → YOUR_SERVER_IP
A    *.apps         → YOUR_SERVER_IP`}
                id="dns-records"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">2. Create Traefik config</h4>
              <CodeBlock
                code={`mkdir -p /opt/traefik
cat > /opt/traefik/traefik.yml << 'EOF'
api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your@email.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    exposedByDefault: false
EOF`}
                id="traefik-config"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">3. Start Traefik</h4>
              <CodeBlock
                code={`docker run -d \\
  --name traefik \\
  --restart always \\
  -p 80:80 -p 443:443 \\
  -v /var/run/docker.sock:/var/run/docker.sock:ro \\
  -v /opt/traefik/traefik.yml:/traefik.yml:ro \\
  -v /opt/traefik/letsencrypt:/letsencrypt \\
  traefik:v3.0`}
                id="start-traefik"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Start OpenFlow',
      description: 'Build and run the application',
      icon: Globe,
      content: (
        <div className="space-y-6">
          <p className="text-[var(--text-secondary)]">
            Finally, build and start OpenFlow:
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">1. Build the application</h4>
              <CodeBlock
                code={`npm run build:api
npm run build:web`}
                id="build-app"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">2. Install PM2 for process management</h4>
              <CodeBlock code="sudo npm install -g pm2" id="install-pm2" />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">3. Start the API</h4>
              <CodeBlock
                code={`cd apps/api
pm2 start dist/app.js --name openflow-api`}
                id="start-api"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">4. Serve the frontend</h4>
              <CodeBlock
                code={`# Option 1: Use nginx
sudo apt install nginx
sudo cp -r apps/web/dist/* /var/www/html/

# Option 2: Use a static server
pm2 serve apps/web/dist 5173 --name openflow-web`}
                id="serve-frontend"
              />
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">5. Enable PM2 startup</h4>
              <CodeBlock
                code={`pm2 startup
pm2 save`}
                id="pm2-startup"
              />
            </div>

            <div className="card p-4 bg-[var(--success)]/5 border-[var(--success)]/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-[var(--success)]" />
                <h4 className="font-medium text-[var(--success)]">You're all set!</h4>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                OpenFlow should now be running at your domain. Visit your URL and log in with
                GitHub to start deploying applications.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="max-w-4xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center">
              <Zap size={20} className="text-[var(--bg-deep)]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">OpenFlow Setup Guide</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Step-by-step guide to deploy OpenFlow on your VPS
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : isCompleted
                      ? 'text-[var(--success)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-[var(--accent)]'
                      : isCompleted
                        ? 'bg-[var(--success)]'
                        : 'bg-[var(--surface)]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={16} className="text-white" />
                  ) : (
                    <Icon size={16} className={isActive ? 'text-white' : ''} />
                  )}
                </div>
                <span className="hidden md:inline text-sm font-medium">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            {(() => {
              const Icon = steps[currentStep].icon;
              return (
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                  <Icon size={24} className="text-[var(--accent)]" />
                </div>
              );
            })()}
            <div>
              <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
              <p className="text-[var(--text-muted)]">{steps[currentStep].description}</p>
            </div>
          </div>

          {steps[currentStep].content}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="btn btn-secondary disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Previous
          </button>

          <span className="text-sm text-[var(--text-muted)]">
            Step {currentStep + 1} of {steps.length}
          </span>

          {currentStep === steps.length - 1 ? (
            <button onClick={() => navigate('/requirements')} className="btn btn-primary">
              Check Requirements
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="btn btn-primary"
            >
              Next
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
