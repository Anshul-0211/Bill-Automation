#!/bin/bash

# Backup Script - Backs up database and uploads

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Backup - Bill Automation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "./server/bills.db" ]; then
    echo -e "${BLUE}➜${NC} Backing up database..."
    cp ./server/bills.db $BACKUP_DIR/bills_$DATE.db
    echo -e "${GREEN}✓${NC} Database backed up: bills_$DATE.db"
else
    echo -e "${YELLOW}⚠${NC} Database file not found"
fi

# Backup uploads
if [ -d "./server/uploads" ]; then
    echo -e "${BLUE}➜${NC} Backing up uploads..."
    tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ./server/uploads
    echo -e "${GREEN}✓${NC} Uploads backed up: uploads_$DATE.tar.gz"
else
    echo -e "${YELLOW}⚠${NC} Uploads directory not found"
fi

# Cleanup old backups (keep last 7 days)
echo -e "${BLUE}➜${NC} Cleaning up old backups..."
find $BACKUP_DIR -type f -mtime +7 -delete
echo -e "${GREEN}✓${NC} Old backups cleaned up"

# Show backup info
echo -e "\n${BLUE}Backup Summary:${NC}"
echo "Location: $BACKUP_DIR"
echo "Files:"
ls -lh $BACKUP_DIR | tail -5

BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo -e "\nTotal backup size: $BACKUP_SIZE"
