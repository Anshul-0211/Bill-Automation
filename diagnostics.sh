#!/bin/bash

# Diagnostics Script - Checks system health and displays logs

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  System Diagnostics - Bill Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# System Information
echo -e "${BLUE}=== System Information ===${NC}"
echo "Hostname: $(hostname)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
echo "Date: $(date)"
echo ""

# Docker Status
echo -e "${BLUE}=== Docker Status ===${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker installed: $(docker --version)"
    if docker info &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker is running"
    else
        echo -e "${RED}✗${NC} Docker is not running"
    fi
else
    echo -e "${RED}✗${NC} Docker not installed"
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker Compose: $(docker-compose --version)"
else
    echo -e "${RED}✗${NC} Docker Compose not installed"
fi
echo ""

# Container Status
echo -e "${BLUE}=== Container Status ===${NC}"
if docker-compose ps -q &> /dev/null; then
    docker-compose ps
else
    echo "No containers found or docker-compose.yml not present"
fi
echo ""

# Resource Usage
echo -e "${BLUE}=== Resource Usage ===${NC}"
echo "Disk Space:"
df -h | grep -E '^Filesystem|/$'
echo ""

echo "Memory:"
free -h 2>/dev/null || echo "Memory info not available"
echo ""

# Network Ports
echo -e "${BLUE}=== Network Ports ===${NC}"
if command -v netstat &> /dev/null; then
    echo "Listening ports:"
    netstat -tuln | grep -E ':80|:5000|:443' || echo "Ports 80, 443, 5000 not found"
elif command -v ss &> /dev/null; then
    echo "Listening ports:"
    ss -tuln | grep -E ':80|:5000|:443' || echo "Ports 80, 443, 5000 not found"
fi
echo ""

# Application Health
echo -e "${BLUE}=== Application Health ===${NC}"

# Check backend
echo -n "Backend API: "
if curl -sf http://localhost:5000/api/auth/status &> /dev/null; then
    echo -e "${GREEN}✓ Responding${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi

# Check frontend
echo -n "Frontend: "
if curl -sf http://localhost:80 &> /dev/null; then
    echo -e "${GREEN}✓ Responding${NC}"
else
    echo -e "${RED}✗ Not responding${NC}"
fi
echo ""

# Recent Logs
echo -e "${BLUE}=== Recent Logs (Last 20 lines) ===${NC}"
echo -e "${YELLOW}Backend:${NC}"
docker-compose logs --tail=20 backend 2>/dev/null || echo "Backend logs not available"
echo ""

echo -e "${YELLOW}Frontend:${NC}"
docker-compose logs --tail=20 frontend 2>/dev/null || echo "Frontend logs not available"
echo ""

# Docker Images
echo -e "${BLUE}=== Docker Images ===${NC}"
docker images | grep -E 'bill-automation|REPOSITORY'
echo ""

# File Permissions
echo -e "${BLUE}=== Important Files ===${NC}"
[ -f "server/.env" ] && echo -e "${GREEN}✓${NC} server/.env exists" || echo -e "${RED}✗${NC} server/.env missing"
[ -f "server/bills.db" ] && echo -e "${GREEN}✓${NC} server/bills.db exists" || echo -e "${YELLOW}⚠${NC} server/bills.db not found (will be created)"
[ -d "server/uploads" ] && echo -e "${GREEN}✓${NC} server/uploads exists" || echo -e "${YELLOW}⚠${NC} server/uploads not found"
[ -f "docker-compose.yml" ] && echo -e "${GREEN}✓${NC} docker-compose.yml exists" || echo -e "${RED}✗${NC} docker-compose.yml missing"
echo ""

# EC2 Public IP
echo -e "${BLUE}=== Network Information ===${NC}"
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to fetch")
echo "Public IP: $PUBLIC_IP"
echo "Access URL: http://$PUBLIC_IP"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
