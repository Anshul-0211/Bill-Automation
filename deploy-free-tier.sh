#!/bin/bash

# Free Tier EC2 Deployment Script
# Optimized for t2.micro (1GB RAM) - Skips React build on server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Bill Automation - Free Tier EC2 Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Trap errors
trap 'echo -e "${RED}✗ Deployment failed!${NC}"; exit 1' ERR

# Check if build directory exists
if [ ! -d "client/build" ]; then
    echo -e "${RED}✗ client/build directory not found!${NC}"
    echo -e "${YELLOW}Please build the React app on your local machine first:${NC}"
    echo -e "  1. On Windows: npm run build-client"
    echo -e "  2. Commit and push the build folder"
    echo -e "  3. Run this script again"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build directory found"

# Step 1: Setup swap (for stability)
echo -e "\n${BLUE}Step 1: Setting up swap space...${NC}"
if [ ! -f /swapfile ]; then
    echo "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo -e "${GREEN}✓${NC} Swap created"
else
    echo -e "${GREEN}✓${NC} Swap already exists"
fi

# Step 2: Install Node.js and npm
echo -e "\n${BLUE}Step 2: Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo -e "${GREEN}✓${NC} Node.js installed: $(node --version)"

# Step 3: Install nginx
echo -e "\n${BLUE}Step 3: Checking nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi
echo -e "${GREEN}✓${NC} Nginx installed"

# Step 4: Install PM2 (process manager)
echo -e "\n${BLUE}Step 4: Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi
echo -e "${GREEN}✓${NC} PM2 installed"

# Step 5: Install backend dependencies
echo -e "\n${BLUE}Step 5: Installing backend dependencies...${NC}"
cd server
npm install --production
cd ..
echo -e "${GREEN}✓${NC} Backend dependencies installed"

# Step 6: Setup environment
echo -e "\n${BLUE}Step 6: Setting up environment...${NC}"
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo -e "${YELLOW}⚠${NC} Created server/.env - Please update with your values"
fi
echo -e "${GREEN}✓${NC} Environment configured"

# Step 7: Configure nginx
echo -e "\n${BLUE}Step 7: Configuring nginx...${NC}"
sudo tee /etc/nginx/sites-available/bill-automation > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Frontend - serve static files
    root /home/ubuntu/Bill-Automation/client/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/bill-automation /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx configured"

# Step 8: Start backend with PM2
echo -e "\n${BLUE}Step 8: Starting backend service...${NC}"
cd server

# Stop existing process if any
pm2 delete bill-automation-backend 2>/dev/null || true

# Start with PM2
pm2 start index.js --name bill-automation-backend --time
pm2 save
pm2 startup | tail -n 1 | sudo bash

cd ..
echo -e "${GREEN}✓${NC} Backend started with PM2"

# Step 9: Display status
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to fetch")
echo "🌐 Application URL: http://$PUBLIC_IP"
echo "👤 Default Login: admin / admin123"
echo ""
echo "📊 Useful Commands:"
echo "  pm2 status              - Check backend status"
echo "  pm2 logs                - View backend logs"
echo "  pm2 restart all         - Restart backend"
echo "  sudo systemctl status nginx - Check nginx status"
echo "  sudo nginx -t           - Test nginx config"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Change default admin password after first login!${NC}\n"
