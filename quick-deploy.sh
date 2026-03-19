#!/bin/bash

# Quick Deployment Script (Minimal checks, faster deployment)
# Use this after initial deployment for quick updates

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Quick Deployment - Bill Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Trap errors
trap 'echo -e "${RED}✗ Deployment failed! Check logs: docker-compose logs${NC}"; exit 1' ERR

echo -e "${BLUE}➜${NC} Stopping existing containers..."
docker-compose down

echo -e "${BLUE}➜${NC} Building images..."
docker-compose build

echo -e "${BLUE}➜${NC} Starting containers..."
docker-compose up -d

echo -e "${BLUE}➜${NC} Waiting for services to start..."
sleep 10

echo -e "\n${GREEN}✓ Deployment complete!${NC}\n"

# Show status
docker-compose ps

# Show access info
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
echo -e "\n${BLUE}Access your application at:${NC} http://$PUBLIC_IP"
echo -e "${BLUE}View logs with:${NC} docker-compose logs -f\n"
