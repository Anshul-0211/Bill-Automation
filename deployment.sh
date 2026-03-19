#!/bin/bash

# Bill Automation - EC2 Deployment Script
# Deploy both frontend and backend to EC2 instance
# Assumes nginx and proxy are already configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_DIR="/home/ubuntu/Bill-Automation"
BACKEND_PORT=5000
FRONTEND_PORT=3000

# Functions for colored output
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_step() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Error handler
trap 'print_error "Deployment failed!"; exit 1' ERR

# Start deployment
print_header "Bill Automation EC2 Deployment"

# Step 1: Navigate to project directory
print_step "Navigating to project directory..."
cd $PROJECT_DIR
print_success "Project directory: $PROJECT_DIR"

# Step 2: Pull latest code (if using git)
if [ -d ".git" ]; then
    print_step "Pulling latest code from git..."
    git pull origin main || git pull origin master
    print_success "Code updated"
fi

# Step 3: Setup Backend
print_header "Backend Setup"

print_step "Installing backend dependencies..."
cd $PROJECT_DIR/server
npm install --production
print_success "Backend dependencies installed"

# Step 4: Create or update .env file for server if it doesn't exist
if [ ! -f ".env" ]; then
    print_step "Creating server/.env file..."
    cp .env.example .env
    print_info "Environment file created at server/.env"
    print_warning "⚠ Please update server/.env with your production values if needed"
fi

cd $PROJECT_DIR

# Step 5: Setup Frontend
print_header "Frontend Setup"

print_step "Installing frontend dependencies..."
cd $PROJECT_DIR/client
npm install
print_success "Frontend dependencies installed"

print_step "Building React application..."
print_info "Skipping build - using pre-built frontend from git..."
print_success "Frontend already built"

cd $PROJECT_DIR

# Step 6: Setup PM2 (Process Manager)
print_header "Process Management Setup"

print_step "Checking if PM2 is installed globally..."
if ! command -v pm2 &> /dev/null; then
    print_step "Installing PM2..."
    sudo npm install -g pm2
    print_success "PM2 installed globally"
fi

# Stop existing PM2 process if running
print_step "Stopping any existing backend processes..."
pm2 stop "Bill-Automation-Backend" 2>/dev/null || true
pm2 delete "Bill-Automation-Backend" 2>/dev/null || true

# Start backend with PM2
print_step "Starting backend server with PM2..."
cd $PROJECT_DIR/server
pm2 start index.js --name "Bill-Automation-Backend" --env production
cd $PROJECT_DIR
print_success "Backend server started"

# Step 7: Setup systemctl for PM2 (auto-restart on reboot)
print_step "Setting up PM2 to restart on system reboot..."
sudo pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
print_success "PM2 configured to auto-start on reboot"

# Step 8: Verify services
print_header "Verification"

print_step "Checking backend health..."
sleep 2
if curl -s http://localhost:$BACKEND_PORT/api/auth/status > /dev/null 2>&1; then
    print_success "Backend is responding on port $BACKEND_PORT"
else
    print_warning "Backend might not be fully started yet, check logs with: pm2 logs"
fi

print_step "Checking frontend build..."
if [ -d "client/build" ] && [ -f "client/build/index.html" ]; then
    print_success "Frontend build is ready"
else
    print_error "Frontend build not found"
    exit 1
fi

# Step 9: Show deployment summary
print_header "Deployment Summary"

echo -e "${GREEN}Deployment completed successfully!${NC}\n"

echo "Backend Status:"
pm2 list --name "Bill-Automation-Backend"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo "  View backend logs:     pm2 logs Bill-Automation-Backend"
echo "  Monitor processes:     pm2 monit"
echo "  Restart backend:       pm2 restart Bill-Automation-Backend"
echo "  Stop backend:          pm2 stop Bill-Automation-Backend"
echo "  Start backend:         pm2 start Bill-Automation-Backend"
echo "  View all PM2 apps:     pm2 list"

echo -e "\n${BLUE}Application URLs:${NC}"
echo "  Frontend:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_EC2_IP')"
echo "  Backend:   http://localhost:$BACKEND_PORT"

echo -e "\n${BLUE}Logs Location:${NC}"
echo "  Backend logs: ~/.pm2/logs/Bill-Automation-Backend*.log"
echo "  Nginx logs:   /var/log/nginx/"

echo -e "\n${GREEN}✓${NC} Deployment process completed!\n"
