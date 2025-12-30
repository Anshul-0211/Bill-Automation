# Deployment Scripts Guide

This directory contains automated scripts to simplify deployment, maintenance, and troubleshooting of the Bill Automation application.

## 📜 Available Scripts

### 1. deploy.sh - Full Automated Deployment
**Purpose:** Complete deployment with comprehensive checks and error handling

**Features:**
- ✅ Pre-flight checks (Docker, Docker Compose, disk space)
- ✅ Environment validation
- ✅ Automated configuration setup
- ✅ Build and deploy containers
- ✅ Health checks and status verification
- 🐛 Debug console on errors
- 📊 Detailed logging

**Usage:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**When to use:** First-time deployment or when you need comprehensive validation

---

### 2. quick-deploy.sh - Fast Deployment
**Purpose:** Quick deployment for updates and rebuilds

**Features:**
- ⚡ Minimal checks for faster deployment
- 🔄 Stop, rebuild, and restart containers
- 📊 Show deployment status

**Usage:**
```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

**When to use:** Code updates, quick restarts, or when environment is already configured

---

### 3. diagnostics.sh - System Health Check
**Purpose:** Comprehensive system and application diagnostics

**Features:**
- 🔍 System information
- 🐳 Docker status and container health
- 💾 Resource usage (disk, memory)
- 🌐 Network port status
- 🏥 Application health checks
- 📝 Recent logs
- 📦 File and permission checks

**Usage:**
```bash
chmod +x diagnostics.sh
./diagnostics.sh
```

**When to use:** Troubleshooting, health monitoring, or before reporting issues

---

### 4. backup.sh - Backup Database and Uploads
**Purpose:** Create backups of critical data

**Features:**
- 💾 Backup SQLite database
- 📁 Backup signature files
- 🗑️ Auto-cleanup old backups (>7 days)
- 📊 Backup summary

**Usage:**
```bash
chmod +x backup.sh
./backup.sh
```

**When to use:** Before major updates, regularly scheduled backups, or before risky operations

**Automate with cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/Bill-Automation/backup.sh
```

---

### 5. rollback.sh - Restore from Backup
**Purpose:** Rollback to previous state using backups

**Features:**
- ⏮️ Restore database from latest backup
- 📁 Restore uploads from backup
- 🔄 Restart containers with restored data

**Usage:**
```bash
chmod +x rollback.sh
./rollback.sh
```

**When to use:** After failed updates, data corruption, or to revert changes

---

## 🚀 Typical Workflows

### Initial Deployment
```bash
# 1. Run full deployment
./deploy.sh

# 2. If successful, create initial backup
./backup.sh
```

### Regular Updates
```bash
# 1. Create backup before update
./backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Quick deploy
./quick-deploy.sh

# 4. If issues occur, rollback
./rollback.sh  # if needed
```

### Troubleshooting
```bash
# 1. Run diagnostics
./diagnostics.sh

# 2. Check logs
docker-compose logs -f

# 3. Try redeployment if needed
./deploy.sh
```

### Scheduled Maintenance
```bash
# Daily: Automated backup (via cron)
0 2 * * * /home/ec2-user/Bill-Automation/backup.sh

# Weekly: Health check
0 9 * * 1 /home/ec2-user/Bill-Automation/diagnostics.sh
```

---

## 📋 Script Output Locations

### Log Files
- `deployment_YYYYMMDD_HHMMSS.log` - Full deployment log
- `deployment_errors_YYYYMMDD_HHMMSS.log` - Error-specific logs

### Backups
- `~/backups/bills_YYYYMMDD_HHMMSS.db` - Database backups
- `~/backups/uploads_YYYYMMDD_HHMMSS.tar.gz` - Signature file backups

---

## 🐛 Debug Console

The deploy.sh script includes an automatic debug console that activates on errors:

**What it shows:**
- 📄 Error log contents
- 🐳 Docker container status
- 📊 Recent logs (last 50 lines)
- 💾 Disk space and memory usage
- 🔍 Running processes
- 💡 Diagnostic commands

**Interactive options:**
- View live logs
- Exit to investigate manually

---

## 🔧 Customization

### Modify Backup Retention
Edit `backup.sh`:
```bash
# Change 7 to desired days
find $BACKUP_DIR -type f -mtime +7 -delete
```

### Add Custom Checks
Edit `deploy.sh` to add custom validation steps in the pre-flight checks section.

### Change Log Locations
Modify the `LOG_FILE` and `ERROR_LOG` variables in `deploy.sh`.

---

## ⚠️ Important Notes

1. **Permissions:** All scripts need execute permissions (`chmod +x script.sh`)
2. **Run Location:** Execute scripts from the project root directory
3. **Docker Access:** Ensure your user has Docker permissions
4. **Backups:** Store backups in a safe location; consider off-server backups for production
5. **Environment Files:** Scripts will prompt for missing configurations

---

## 🆘 Common Issues

### "Permission denied" when running scripts
```bash
chmod +x *.sh
```

### "Docker command not found"
```bash
# Check if Docker is installed
docker --version

# If not, install following DEPLOYMENT.md
```

### Scripts fail silently
```bash
# Run with verbose output
bash -x ./deploy.sh
```

### Backup directory full
```bash
# Check backup size
du -sh ~/backups

# Manually cleanup old backups
find ~/backups -type f -mtime +30 -delete
```

---

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [README.md](./README.md) - Application documentation
- Docker Compose: `docker-compose --help`
- Docker: `docker --help`

---

**Pro Tip:** Keep these scripts updated in your repository so all team members can use them! 🚀
