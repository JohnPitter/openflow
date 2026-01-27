#!/bin/bash

#
# OpenFlow VPS Setup Script
# Automated installation for Ubuntu 22.04+
#
# Usage: curl -fsSL https://raw.githubusercontent.com/JohnPitter/openflow/main/scripts/setup.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
OPENFLOW_DIR="/opt/openflow"
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)
WEBHOOK_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Functions
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║   ⚡ OpenFlow - Self-hosted PaaS Setup                    ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Cannot detect OS. This script requires Ubuntu 22.04+"
        exit 1
    fi

    . /etc/os-release

    if [[ "$ID" != "ubuntu" && "$ID" != "debian" ]]; then
        log_warn "This script is designed for Ubuntu/Debian. Proceeding anyway..."
    fi

    log_success "Detected OS: $PRETTY_NAME"
}

check_requirements() {
    log_step "Checking System Requirements"

    # Check CPU
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -lt 1 ]]; then
        log_error "At least 1 CPU core is required"
        exit 1
    fi
    log_success "CPU: $CPU_CORES cores"

    # Check RAM
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    if [[ $TOTAL_RAM -lt 1800 ]]; then
        log_error "At least 2GB RAM is required (detected: ${TOTAL_RAM}MB)"
        exit 1
    fi
    log_success "RAM: ${TOTAL_RAM}MB"

    # Check disk
    FREE_DISK=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ $FREE_DISK -lt 15 ]]; then
        log_error "At least 15GB free disk space is required (detected: ${FREE_DISK}GB)"
        exit 1
    fi
    log_success "Disk: ${FREE_DISK}GB free"
}

install_dependencies() {
    log_step "Installing System Dependencies"

    apt-get update -qq
    apt-get install -y -qq \
        curl \
        git \
        wget \
        unzip \
        ca-certificates \
        gnupg \
        lsb-release \
        openssl \
        > /dev/null 2>&1

    log_success "System dependencies installed"
}

install_docker() {
    log_step "Installing Docker"

    if command -v docker &> /dev/null; then
        log_success "Docker already installed: $(docker --version)"
        return
    fi

    # Install Docker using official script
    curl -fsSL https://get.docker.com | sh > /dev/null 2>&1

    # Enable and start Docker
    systemctl enable docker > /dev/null 2>&1
    systemctl start docker

    log_success "Docker installed: $(docker --version)"
}

install_nodejs() {
    log_step "Installing Node.js 20"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        if [[ "$NODE_VERSION" == v20* || "$NODE_VERSION" == v21* || "$NODE_VERSION" == v22* ]]; then
            log_success "Node.js already installed: $NODE_VERSION"
            return
        fi
    fi

    # Install Node.js 20 via NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1

    log_success "Node.js installed: $(node --version)"
}

install_pm2() {
    log_step "Installing PM2"

    if command -v pm2 &> /dev/null; then
        log_success "PM2 already installed"
        return
    fi

    npm install -g pm2 > /dev/null 2>&1
    log_success "PM2 installed"
}

setup_postgresql() {
    log_step "Setting up PostgreSQL"

    # Check if PostgreSQL container already exists
    if docker ps -a --format '{{.Names}}' | grep -q '^openflow-postgres$'; then
        log_success "PostgreSQL container already exists"
        return
    fi

    # Run PostgreSQL in Docker
    docker run -d \
        --name openflow-postgres \
        -e POSTGRES_USER=openflow \
        -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        -e POSTGRES_DB=openflow \
        -p 127.0.0.1:5432:5432 \
        -v openflow-pgdata:/var/lib/postgresql/data \
        --restart unless-stopped \
        postgres:16-alpine > /dev/null 2>&1

    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to start..."
    sleep 5

    for i in {1..30}; do
        if docker exec openflow-postgres pg_isready -U openflow > /dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            return
        fi
        sleep 1
    done

    log_error "PostgreSQL failed to start"
    exit 1
}

clone_openflow() {
    log_step "Cloning OpenFlow"

    if [[ -d "$OPENFLOW_DIR" ]]; then
        log_info "OpenFlow directory exists, pulling latest changes..."
        cd "$OPENFLOW_DIR"
        git pull origin main > /dev/null 2>&1
    else
        git clone https://github.com/JohnPitter/openflow.git "$OPENFLOW_DIR" > /dev/null 2>&1
        cd "$OPENFLOW_DIR"
    fi

    log_success "OpenFlow cloned to $OPENFLOW_DIR"
}

configure_environment() {
    log_step "Configuring Environment"

    cd "$OPENFLOW_DIR"

    # Create .env file
    cat > .env << EOF
# OpenFlow Configuration
# Generated by setup script on $(date)

# IMPORTANT: Set to false in production!
DEV_MODE=false

# GitHub OAuth
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Security (auto-generated)
JWT_SECRET=$JWT_SECRET
WEBHOOK_SECRET=$WEBHOOK_SECRET

# Database
DATABASE_URL=postgresql://openflow:$POSTGRES_PASSWORD@localhost:5432/openflow

# Domain Configuration
# Update these with your actual domain
BASE_DOMAIN=localhost
API_URL=http://localhost:3001
WEB_URL=http://localhost:5173
API_PORT=3001
WEB_PORT=5173

# Docker
DOCKER_SOCKET=/var/run/docker.sock
EOF

    log_success "Environment configured"
    log_warn "Remember to update GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in $OPENFLOW_DIR/.env"
}

build_openflow() {
    log_step "Building OpenFlow"

    cd "$OPENFLOW_DIR"

    log_info "Installing dependencies..."
    npm install > /dev/null 2>&1

    log_info "Building application..."
    npm run build > /dev/null 2>&1

    log_success "OpenFlow built successfully"
}

run_migrations() {
    log_step "Running Database Migrations"

    cd "$OPENFLOW_DIR/apps/api"
    npx drizzle-kit push > /dev/null 2>&1

    log_success "Database migrations complete"
}

setup_pm2() {
    log_step "Configuring PM2"

    cd "$OPENFLOW_DIR"

    # Install serve for static files
    npm install -g serve > /dev/null 2>&1

    # Create PM2 ecosystem file
    cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'openflow-api',
      cwd: './apps/api',
      script: 'dist/app.js',
      node_args: '--experimental-specifier-resolution=node',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/openflow/api-error.log',
      out_file: '/var/log/openflow/api-out.log'
    },
    {
      name: 'openflow-web',
      cwd: './apps/web',
      script: 'serve',
      args: '-s dist -l 5173',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: '/var/log/openflow/web-error.log',
      out_file: '/var/log/openflow/web-out.log'
    }
  ]
};
EOF

    # Create log directory
    mkdir -p /var/log/openflow

    log_success "PM2 configured"
}

start_openflow() {
    log_step "Starting OpenFlow"

    cd "$OPENFLOW_DIR"

    # Stop existing processes
    pm2 delete all > /dev/null 2>&1 || true

    # Start with PM2
    pm2 start ecosystem.config.cjs

    # Save PM2 config
    pm2 save > /dev/null 2>&1

    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

    log_success "OpenFlow started"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}║   ✅ OpenFlow Installation Complete!                      ║${NC}"
    echo -e "${GREEN}║                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  • Web UI:  ${YELLOW}http://$(hostname -I | awk '{print $1}'):5173${NC}"
    echo -e "  • API:     ${YELLOW}http://$(hostname -I | awk '{print $1}'):3001${NC}"
    echo ""
    echo -e "${CYAN}Important Files:${NC}"
    echo -e "  • Config:  ${YELLOW}$OPENFLOW_DIR/.env${NC}"
    echo -e "  • Logs:    ${YELLOW}/var/log/openflow/${NC}"
    echo ""
    echo -e "${CYAN}Database Credentials:${NC}"
    echo -e "  • Host:     localhost:5432"
    echo -e "  • Database: openflow"
    echo -e "  • User:     openflow"
    echo -e "  • Password: ${YELLOW}$POSTGRES_PASSWORD${NC}"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  • View status:   ${YELLOW}pm2 status${NC}"
    echo -e "  • View logs:     ${YELLOW}pm2 logs${NC}"
    echo -e "  • Restart:       ${YELLOW}pm2 restart all${NC}"
    echo ""
    echo -e "${RED}⚠️  Next Steps:${NC}"
    echo -e "  1. Edit ${YELLOW}$OPENFLOW_DIR/.env${NC} to add GitHub OAuth credentials"
    echo -e "  2. Configure your domain and SSL (see README.md)"
    echo -e "  3. Run ${YELLOW}pm2 restart all${NC} after config changes"
    echo ""
}

# Main execution
main() {
    print_banner
    check_root
    check_os
    check_requirements
    install_dependencies
    install_docker
    install_nodejs
    install_pm2
    setup_postgresql
    clone_openflow
    configure_environment
    build_openflow
    run_migrations
    setup_pm2
    start_openflow
    print_summary
}

main "$@"
