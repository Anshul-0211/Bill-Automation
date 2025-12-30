#!/bin/bash

# Bill Automation - Automated Deployment Script
# This script performs pre-flight checks and deploys the application with error handling

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="deployment_$(date +%Y%m%d_%H%M%S).log"
ERROR_LOG="deployment_errors_$(date +%Y%m%d_%H%M%S).log"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE" "$ERROR_LOG"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to show debug console
debug_console() {
    print_header "DEBUG CONSOLE - Error Details"
    
    print_error "Deployment failed! Entering debug mode..."
    echo ""
    
    # Show error log
    if [ -f "$ERROR_LOG" ]; then
        print_info "Error Log Contents:"
        cat "$ERROR_LOG"
        echo ""
    fi
    
    # Show Docker status
    print_info "Docker Container Status:"
    docker-compose ps 2>&1 | tee -a "$ERROR_LOG"
    echo ""
    
    # Show recent logs
    print_info "Recent Docker Logs (Last 50 lines):"
    docker-compose logs --tail=50 2>&1 | tee -a "$ERROR_LOG"
    echo ""
    
    # Show disk space
    print_info "Disk Space:"
    df -h | tee -a "$ERROR_LOG"
    echo ""
    
    # Show memory
    print_info "Memory Usage:"
    free -h 2>&1 | tee -a "$ERROR_LOG"
    echo ""
    
    # Show running processes
    print_info "Docker Processes:"
    docker ps -a 2>&1 | tee -a "$ERROR_LOG"
    echo ""
    
    # Diagnostic commands
    print_header "Diagnostic Information"
    
    echo "1. Check backend logs: docker-compose logs backend"
    echo "2. Check frontend logs: docker-compose logs frontend"
    echo "3. Restart containers: docker-compose restart"
    echo "4. Rebuild containers: docker-compose up -d --build"
    echo "5. Check environment files: cat server/.env"
    echo "6. View full logs: cat $LOG_FILE"
    echo "7. View error logs: cat $ERROR_LOG"
    echo ""
    
    # Ask user if they want to see live logs
    read -p "Do you want to see live logs? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting live logs (Press Ctrl+C to exit)..."
        docker-compose logs -f
    fi
    
    exit 1
}

# Trap errors and call debug console
trap 'debug_console' ERR

# Start deployment
clear
print_header "Bill Automation - Deployment Script"
print_info "Starting deployment at $(date)"
print_info "Log file: $LOG_FILE"
echo ""

# Step 1: Pre-flight Checks
print_header "Step 1: Pre-flight Checks"

# Check if Docker is installed
print_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    print_info "Install Docker using: sudo yum install docker -y (Amazon Linux) or sudo apt install docker.io -y (Ubuntu)"
    exit 1
fi
print_success "Docker is installed ($(docker --version))"

# Check if Docker is running
print_info "Checking Docker service..."
if ! docker info &> /dev/null; then
    print_error "Docker is not running!"
    print_info "Start Docker using: sudo systemctl start docker"
    exit 1
fi
print_success "Docker service is running"

# Check if Docker Compose is installed
print_info "Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    print_info "Install Docker Compose following the instructions in DEPLOYMENT.md"
    exit 1
fi
print_success "Docker Compose is installed ($(docker-compose --version))"

# Check if user has Docker permissions
print_info "Checking Docker permissions..."
if ! docker ps &> /dev/null; then
    print_warning "Current user may not have Docker permissions"
    print_info "You may need to run: sudo usermod -aG docker $USER"
    print_info "Then logout and login again"
fi
print_success "Docker permissions verified"

# Check disk space
print_info "Checking disk space..."
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 2 ]; then
    print_warning "Low disk space: ${AVAILABLE_SPACE}GB available (Recommended: 2GB+)"
else
    print_success "Sufficient disk space: ${AVAILABLE_SPACE}GB available"
fi

# Check if project directory exists
print_info "Checking project directory..."
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found! Are you in the project directory?"
    exit 1
fi
print_success "Project directory verified"

# Step 2: Environment Configuration Checks
print_header "Step 2: Environment Configuration"

# Check backend environment file
print_info "Checking backend environment file..."
if [ ! -f "server/.env" ]; then
    print_warning "server/.env not found! Creating from example..."
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        print_warning "Created server/.env - PLEASE UPDATE with your values!"
        print_info "Edit using: nano server/.env"
        read -p "Press Enter after you've updated server/.env..."
    else
        print_error "server/.env.example not found!"
        exit 1
    fi
else
    print_success "Backend environment file exists"
fi

# Validate backend environment variables
print_info "Validating backend environment..."
source server/.env 2>/dev/null || true

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" == "change-this-to-a-secure-random-string-in-production" ]; then
    print_warning "SESSION_SECRET not configured properly!"
    print_info "Update SESSION_SECRET in server/.env with a secure random string"
fi

if [ -z "$CORS_ORIGIN" ]; then
    print_warning "CORS_ORIGIN not set, will use default"
fi

print_success "Backend environment validated"

# Check frontend environment file
print_info "Checking frontend environment file..."
if [ ! -f "client/.env.production" ]; then
    print_warning "client/.env.production not found! Creating..."
    echo "REACT_APP_API_URL=http://$(curl -s ifconfig.me 2>/dev/null || echo 'localhost')" > client/.env.production
    print_success "Created client/.env.production with EC2 public IP"
else
    print_success "Frontend environment file exists"
fi

# Step 3: Stop Existing Containers
print_header "Step 3: Stopping Existing Containers"

print_info "Checking for running containers..."
if docker-compose ps -q 2>/dev/null | grep -q .; then
    print_info "Stopping existing containers..."
    docker-compose down 2>&1 | tee -a "$LOG_FILE"
    print_success "Existing containers stopped"
else
    print_success "No running containers found"
fi

# Step 4: Build and Deploy
print_header "Step 4: Building and Deploying"

print_info "Building Docker images (this may take several minutes)..."
docker-compose build 2>&1 | tee -a "$LOG_FILE"
print_success "Docker images built successfully"

print_info "Starting containers..."
docker-compose up -d 2>&1 | tee -a "$LOG_FILE"
print_success "Containers started"

# Wait for containers to be healthy
print_info "Waiting for containers to be ready (30 seconds)..."
sleep 30

# Step 5: Health Checks
print_header "Step 5: Health Checks"

# Check if containers are running
print_info "Checking container status..."
BACKEND_STATUS=$(docker-compose ps -q backend | xargs docker inspect -f '{{.State.Status}}' 2>/dev/null || echo "not found")
FRONTEND_STATUS=$(docker-compose ps -q frontend | xargs docker inspect -f '{{.State.Status}}' 2>/dev/null || echo "not found")

if [ "$BACKEND_STATUS" != "running" ]; then
    print_error "Backend container is not running (Status: $BACKEND_STATUS)"
    docker-compose logs backend | tail -50 | tee -a "$ERROR_LOG"
    exit 1
fi
print_success "Backend container is running"

if [ "$FRONTEND_STATUS" != "running" ]; then
    print_error "Frontend container is not running (Status: $FRONTEND_STATUS)"
    docker-compose logs frontend | tail -50 | tee -a "$ERROR_LOG"
    exit 1
fi
print_success "Frontend container is running"

# Check if ports are accessible
print_info "Checking port accessibility..."
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    print_success "Port 80 (HTTP) is listening"
else
    print_warning "Port 80 might not be accessible"
fi

if netstat -tuln 2>/dev/null | grep -q ":5000 "; then
    print_success "Port 5000 (Backend) is listening"
else
    print_warning "Port 5000 might not be accessible"
fi

# Test backend health
print_info "Testing backend health..."
sleep 5
if curl -f http://localhost:5000/api/auth/status &>/dev/null; then
    print_success "Backend API is responding"
else
    print_warning "Backend API might not be fully ready yet"
fi

# Step 6: Display Information
print_header "Deployment Summary"

# Get EC2 public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to fetch")

print_success "Deployment completed successfully!"
echo ""
print_info "Application Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Application URL: http://$PUBLIC_IP"
echo "🔧 Backend API: http://$PUBLIC_IP/api"
echo "👤 Default Login:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 7: Useful Commands
print_header "Useful Commands"
echo "View logs:           docker-compose logs -f"
echo "Stop containers:     docker-compose down"
echo "Restart:             docker-compose restart"
echo "Rebuild:             docker-compose up -d --build"
echo "Backend logs:        docker-compose logs backend"
echo "Frontend logs:       docker-compose logs frontend"
echo "Container status:    docker-compose ps"
echo ""

# Security reminder
print_header "Security Reminders"
print_warning "IMPORTANT: Change default admin password after first login!"
print_warning "Update SESSION_SECRET in server/.env if you haven't already"
print_warning "Consider setting up SSL/HTTPS for production"
echo ""

# Ask if user wants to see logs
read -p "Do you want to see live logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting live logs (Press Ctrl+C to exit)..."
    docker-compose logs -f
fi

print_success "Deployment script completed at $(date)"
print_info "Full log saved to: $LOG_FILE"
