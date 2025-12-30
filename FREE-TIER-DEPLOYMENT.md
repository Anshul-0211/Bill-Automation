# Free Tier EC2 Deployment Guide

## Problem
The standard Docker deployment requires too much memory for AWS EC2 free tier (t2.micro with 1GB RAM). Building React apps in Docker needs 2-4GB RAM.

## Solution: Hybrid Deployment
Build React app **locally** (on your Windows machine), then deploy both backend and pre-built frontend to EC2.

---

## Step-by-Step Deployment

### Part 1: On Your Local Machine (Windows)

#### 1. Build the React App Locally
```bash
# Navigate to project directory
cd C:\Users\anshu\OneDrive\Desktop\Bill-Automation

# Build the client
npm run build-client

# This creates client/build/ directory with optimized files
```

#### 2. Update Package.json (Add build script if not present)
Add this to root `package.json` scripts section:
```json
"build-client": "cd client && npm run build"
```

#### 3. Commit and Push Everything
```bash
git add .
git commit -m "Add production build for free tier deployment"
git push origin main
```

---

### Part 2: On Your EC2 Instance

#### 1. SSH into EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

#### 2. Clone/Pull Repository
```bash
cd ~
git clone https://github.com/your-username/Bill-Automation.git
# OR if already cloned:
cd ~/Bill-Automation
git pull origin main
```

#### 3. Make Script Executable and Run
```bash
chmod +x deploy-free-tier.sh
./deploy-free-tier.sh
```

The script will:
- ✅ Setup 2GB swap space (for stability)
- ✅ Install Node.js, nginx, and PM2
- ✅ Install backend dependencies
- ✅ Configure nginx to serve React build files
- ✅ Start backend with PM2 (auto-restart on crash/reboot)
- ✅ Display access information

---

## What This Approach Does

### Architecture:
```
Internet → EC2:80 (nginx) → {
    / → Static React Files (client/build/)
    /api → Backend (Node.js on :5000)
}
```

### Benefits:
- ✅ **No Docker** - Saves memory overhead
- ✅ **Pre-built React** - No memory-intensive build on server
- ✅ **PM2 Process Manager** - Auto-restart, monitoring
- ✅ **Nginx** - Fast static file serving
- ✅ **Free Tier Compatible** - Runs smoothly on t2.micro (1GB RAM)

---

## Managing Your Application

### Backend (PM2 Commands)
```bash
pm2 status                  # Check if running
pm2 logs                    # View logs in real-time
pm2 logs --lines 100        # View last 100 lines
pm2 restart bill-automation-backend
pm2 stop bill-automation-backend
pm2 start bill-automation-backend
pm2 monit                   # Monitor CPU/Memory
```

### Frontend (Nginx Commands)
```bash
sudo systemctl status nginx # Check nginx status
sudo systemctl restart nginx
sudo nginx -t               # Test config
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### System Resources
```bash
free -h                     # Check memory usage
df -h                       # Check disk space
htop                        # Interactive process monitor
```

---

## Updating Your Application

### When You Update Code:

**On Local Machine:**
```bash
# Make changes, then build
npm run build-client
git add .
git commit -m "Update application"
git push origin main
```

**On EC2:**
```bash
cd ~/Bill-Automation
git pull origin main

# If backend changed:
cd server
npm install --production
cd ..
pm2 restart bill-automation-backend

# If frontend changed (build files):
sudo systemctl reload nginx

# If nginx config changed:
sudo nginx -t
sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend not starting
```bash
pm2 logs bill-automation-backend  # Check errors
cd ~/Bill-Automation/server
node index.js                     # Test directly
```

### Cannot access website
```bash
# Check if nginx is running
sudo systemctl status nginx

# Check if backend is running
pm2 status

# Check ports
sudo netstat -tulpn | grep -E ':80|:5000'

# Check Security Group (AWS Console)
# Ensure port 80 is open to 0.0.0.0/0
```

### Out of memory
```bash
# Check swap
free -h
swapon --show

# Monitor processes
htop
pm2 monit
```

### Database issues
```bash
cd ~/Bill-Automation/server
ls -la bills.db        # Check if exists
chmod 644 bills.db     # Fix permissions if needed
```

---

## Performance Tips for Free Tier

1. **Use Swap**: Already configured by script (2GB)
2. **Limit Logs**: 
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```
3. **Monitor Memory**: 
   ```bash
   pm2 monit
   ```
4. **Optimize Node**: Already using `--production` flag
5. **Enable Gzip** in nginx (already configured)

---

## Cost Estimate

With AWS Free Tier:
- **EC2 t2.micro**: FREE (750 hours/month for 12 months)
- **Data Transfer**: 15GB/month outbound FREE
- **EBS Storage**: 30GB FREE

After Free Tier (per month):
- **EC2 t2.micro**: ~$8-10/month
- **EBS 8GB**: ~$1/month
- **Total**: ~$10/month

---

## Security Checklist

- ✅ Change default admin password
- ✅ Update SESSION_SECRET in server/.env
- ✅ Restrict SSH to your IP in Security Group
- ✅ Setup automated backups
- ✅ Consider adding SSL (Let's Encrypt free)
- ✅ Keep system updated: `sudo apt update && sudo apt upgrade`

---

## Adding SSL (Optional)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## Backup Script

Create ~/backup.sh:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
cp ~/Bill-Automation/server/bills.db $BACKUP_DIR/bills_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ~/Bill-Automation/server/uploads

# Keep last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

Schedule with cron:
```bash
chmod +x ~/backup.sh
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

---

## Summary

This free-tier deployment:
- 💰 **FREE** with AWS Free Tier
- ⚡ **Fast** - No Docker overhead
- 🔒 **Reliable** - PM2 auto-restart
- 📊 **Easy to manage** - Simple commands
- 🎯 **Production-ready** - Nginx + PM2

Your application will run smoothly on the smallest EC2 instance! 🚀
