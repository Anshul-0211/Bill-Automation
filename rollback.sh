#!/bin/bash

# Rollback Script - Reverts to previous deployment

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Rollback - Bill Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}⚠ This will stop current containers and attempt to restore from backup${NC}"
read -p "Continue? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

# Stop containers
echo -e "${BLUE}➜${NC} Stopping containers..."
docker-compose down

# Check for backups
if [ -d ~/backups ]; then
    LATEST_DB=$(ls -t ~/backups/bills_*.db 2>/dev/null | head -1)
    LATEST_UPLOADS=$(ls -t ~/backups/uploads_*.tar.gz 2>/dev/null | head -1)
    
    if [ -n "$LATEST_DB" ]; then
        echo -e "${BLUE}➜${NC} Restoring database from: $LATEST_DB"
        cp "$LATEST_DB" ./server/bills.db
    else
        echo -e "${YELLOW}⚠ No database backup found${NC}"
    fi
    
    if [ -n "$LATEST_UPLOADS" ]; then
        echo -e "${BLUE}➜${NC} Restoring uploads from: $LATEST_UPLOADS"
        tar -xzf "$LATEST_UPLOADS" -C ./server/
    else
        echo -e "${YELLOW}⚠ No uploads backup found${NC}"
    fi
else
    echo -e "${RED}✗ No backup directory found at ~/backups${NC}"
    exit 1
fi

# Restart containers
echo -e "${BLUE}➜${NC} Starting containers..."
docker-compose up -d

echo -e "\n${GREEN}✓ Rollback complete!${NC}\n"
docker-compose ps
