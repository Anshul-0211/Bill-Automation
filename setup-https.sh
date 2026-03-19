#!/bin/bash

# EC2 Setup Script for Bill Automation
# Configures nginx, HTTPS, and domain settings
# Run this on your EC2 instance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_step() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Error handler
trap 'print_error "Setup failed!"; exit 1' ERR

# Get domain from user
read -p "Enter your domain (e.g., bill.jmdsupplychainsolutions.in): " DOMAIN
read -p "Enter your email for Let's Encrypt (e.g., your@email.com): " EMAIL

print_header "Bill Automation - EC2 HTTPS Setup"

# Step 1: Install Certbot
print_step "Installing Certbot for Let's Encrypt..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

# Step 2: Generate SSL Certificate
print_step "Generating SSL certificate for $DOMAIN..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --preferred-challenges http
print_success "SSL certificate generated"

# Step 3: Verify certificate
print_step "Verifying certificate..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_success "Certificate verified"
else
    print_error "Certificate not found!"
    exit 1
fi

# Step 4: Update nginx config with domain
print_step "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/bill-automation > /dev/null << EOF
# Nginx configuration for EC2 deployment with PM2 backend
# Domain: $DOMAIN

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Root directory for frontend
    root /home/ubuntu/Bill-Automation/client/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # React app - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Proxy API requests to backend (running on localhost:5000 with PM2)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy uploads to backend
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to sensitive files
    location ~ /\\. {
        deny all;
    }
}
EOF
print_success "Nginx configuration created"

# Step 5: Enable site
print_step "Enabling nginx site..."
sudo ln -sf /etc/nginx/sites-available/bill-automation /etc/nginx/sites-enabled/bill-automation
sudo rm -f /etc/nginx/sites-enabled/default
print_success "Site enabled"

# Step 6: Test nginx
print_step "Testing nginx configuration..."
if sudo nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors!"
    exit 1
fi

# Step 7: Reload nginx
print_step "Reloading nginx..."
sudo systemctl reload nginx
print_success "Nginx reloaded"

# Step 8: Verify backend
print_step "Verifying backend is running..."
sleep 2
if curl -s http://localhost:5000/api/auth/status > /dev/null 2>&1; then
    print_success "Backend is responding"
else
    print_warning "Backend might not be running. Check with: pm2 list"
fi

# Step 9: Setup auto-renewal for certificate
print_step "Setting up certificate auto-renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
print_success "Certificate auto-renewal enabled"

# Summary
print_header "Setup Complete!"

echo -e "${GREEN}✓ HTTPS is now configured!${NC}\n"

echo -e "${BLUE}Your site is ready at:${NC}"
echo -e "  https://$DOMAIN\n"

echo -e "${BLUE}Useful commands:${NC}"
echo "  View SSL info:       sudo certbot certificates"
echo "  Renew certificates:  sudo certbot renew"
echo "  View nginx logs:     sudo tail -f /var/log/nginx/access.log"
echo "  Check backend:       pm2 logs Bill-Automation-Backend"
echo "  Restart nginx:       sudo systemctl restart nginx"
echo ""

echo -e "${YELLOW}⚠ Next steps:${NC}"
echo "1. Verify your domain DNS is pointing to your EC2 IP"
echo "2. Wait for DNS propagation (may take a few minutes)"
echo "3. Visit https://$DOMAIN in your browser"
echo "4. Check backend logs if you see errors: pm2 logs"
echo ""
