import fs from 'fs';
import path from 'path';

export type Technology = 'nodejs' | 'python' | 'go' | 'php' | 'static' | 'docker';

interface DetectionResult {
  technology: Technology;
  framework?: string;
  buildCommand?: string;
  startCommand?: string;
  port: number;
}

const TEMPLATES_PATH = path.resolve(process.cwd(), '../../templates');

export const builderService = {
  detect(projectPath: string): DetectionResult {
    // Check for user Dockerfile first
    if (fs.existsSync(path.join(projectPath, 'Dockerfile'))) {
      return { technology: 'docker', port: 3000 };
    }

    // Node.js
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      return this.detectNodeFramework(pkg);
    }

    // Python
    if (
      fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))
    ) {
      return this.detectPythonFramework(projectPath);
    }

    // Go
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      return { technology: 'go', port: 8080, startCommand: './app' };
    }

    // PHP
    if (fs.existsSync(path.join(projectPath, 'composer.json'))) {
      return { technology: 'php', port: 8080 };
    }

    // Static fallback (HTML files)
    return { technology: 'static', port: 80 };
  },

  detectNodeFramework(pkg: any): DetectionResult {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['next']) {
      return {
        technology: 'nodejs',
        framework: 'nextjs',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        port: 3000,
      };
    }

    if (deps['nuxt']) {
      return {
        technology: 'nodejs',
        framework: 'nuxt',
        buildCommand: 'npm run build',
        startCommand: 'npm start',
        port: 3000,
      };
    }

    if (deps['vite'] || deps['@vitejs/plugin-react']) {
      return {
        technology: 'nodejs',
        framework: 'vite',
        buildCommand: 'npm run build',
        startCommand: '',
        port: 80,
      };
    }

    if (deps['react-scripts']) {
      return {
        technology: 'nodejs',
        framework: 'cra',
        buildCommand: 'npm run build',
        startCommand: '',
        port: 80,
      };
    }

    // Backend Node (Express, Fastify, etc.)
    const startScript = pkg.scripts?.start;
    return {
      technology: 'nodejs',
      framework: 'node',
      buildCommand: pkg.scripts?.build ? 'npm run build' : undefined,
      startCommand: startScript || 'node index.js',
      port: 3000,
    };
  },

  detectPythonFramework(projectPath: string): DetectionResult {
    let requirements = '';
    if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) {
      requirements = fs.readFileSync(path.join(projectPath, 'requirements.txt'), 'utf-8');
    }

    if (requirements.includes('django') || fs.existsSync(path.join(projectPath, 'manage.py'))) {
      return {
        technology: 'python',
        framework: 'django',
        startCommand: 'gunicorn --bind 0.0.0.0:8000 app.wsgi',
        port: 8000,
      };
    }

    if (requirements.includes('fastapi')) {
      return {
        technology: 'python',
        framework: 'fastapi',
        startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        port: 8000,
      };
    }

    if (requirements.includes('flask')) {
      return {
        technology: 'python',
        framework: 'flask',
        startCommand: 'gunicorn --bind 0.0.0.0:8000 app:app',
        port: 8000,
      };
    }

    return {
      technology: 'python',
      startCommand: 'python main.py',
      port: 8000,
    };
  },

  getDockerfile(detection: DetectionResult): string {
    if (detection.technology === 'docker') {
      return 'Dockerfile';
    }

    const templateMap: Record<string, string> = {
      nodejs: 'node.Dockerfile',
      python: 'python.Dockerfile',
      go: 'go.Dockerfile',
      php: 'php.Dockerfile',
      static: 'node.Dockerfile', // Uses nginx via node template
    };

    const templateFile = templateMap[detection.technology];
    const templatePath = path.join(TEMPLATES_PATH, templateFile);

    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders
    template = template.replace('{{BUILD_COMMAND}}', detection.buildCommand || 'echo "no build"');
    template = template.replace('{{START_COMMAND}}', detection.startCommand || 'echo "no start"');
    template = template.replace('{{PORT}}', String(detection.port));
    template = template.replace('{{FRAMEWORK}}', detection.framework || 'default');

    return template;
  },

  async generateDockerfile(projectPath: string): Promise<{ dockerfile: string; detection: DetectionResult }> {
    const detection = this.detect(projectPath);

    if (detection.technology === 'docker') {
      return { dockerfile: path.join(projectPath, 'Dockerfile'), detection };
    }

    const dockerfileContent = this.getDockerfile(detection);
    const dockerfilePath = path.join(projectPath, 'Dockerfile.openflow');
    fs.writeFileSync(dockerfilePath, dockerfileContent);

    return { dockerfile: dockerfilePath, detection };
  },
};
