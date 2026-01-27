#!/bin/bash

#
# OpenFlow Uninstall Script
# Removes OpenFlow and optionally its data
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

OPENFLOW_DIR="/opt/openflow"

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}[ERROR]${NC} This script must be run as root (use sudo)"
        exit 1
    fi
}

confirm() {
    echo ""
    echo -e "${RED}⚠️  WARNING: This will remove OpenFlow and all related services.${NC}"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
}

stop_services() {
    log_info "Stopping PM2 services..."
    pm2 delete all > /dev/null 2>&1 || true
    log_success "PM2 services stopped"
}

remove_postgresql() {
    read -p "Remove PostgreSQL container and data? (y/N): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        log_info "Removing PostgreSQL..."
        docker stop openflow-postgres > /dev/null 2>&1 || true
        docker rm openflow-postgres > /dev/null 2>&1 || true
        docker volume rm openflow-pgdata > /dev/null 2>&1 || true
        log_success "PostgreSQL removed"
    else
        log_warn "PostgreSQL kept"
    fi
}

remove_openflow_containers() {
    log_info "Removing OpenFlow managed containers..."

    # Remove all containers with openflow label
    CONTAINERS=$(docker ps -aq --filter "label=openflow.managed=true" 2>/dev/null || true)
    if [[ -n "$CONTAINERS" ]]; then
        docker stop $CONTAINERS > /dev/null 2>&1 || true
        docker rm $CONTAINERS > /dev/null 2>&1 || true
        log_success "OpenFlow containers removed"
    else
        log_info "No OpenFlow containers found"
    fi
}

remove_files() {
    log_info "Removing OpenFlow files..."

    if [[ -d "$OPENFLOW_DIR" ]]; then
        rm -rf "$OPENFLOW_DIR"
        log_success "Removed $OPENFLOW_DIR"
    fi

    if [[ -d "/var/log/openflow" ]]; then
        rm -rf /var/log/openflow
        log_success "Removed /var/log/openflow"
    fi
}

cleanup_pm2() {
    log_info "Cleaning up PM2..."
    pm2 save > /dev/null 2>&1 || true
    pm2 unstartup systemd > /dev/null 2>&1 || true
    log_success "PM2 cleaned up"
}

main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   OpenFlow Uninstaller                                    ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"

    check_root
    confirm
    stop_services
    remove_openflow_containers
    remove_postgresql
    remove_files
    cleanup_pm2

    echo ""
    echo -e "${GREEN}✅ OpenFlow has been uninstalled.${NC}"
    echo ""
    echo -e "${YELLOW}Note: Docker and Node.js were not removed.${NC}"
    echo -e "${YELLOW}To remove them manually:${NC}"
    echo -e "  apt remove docker-ce docker-ce-cli containerd.io"
    echo -e "  apt remove nodejs"
    echo ""
}

main "$@"
