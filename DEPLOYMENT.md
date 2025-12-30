# Deployment Guide - AWS EC2 with Docker

This guide will help you deploy the Bill Automation application on AWS EC2 using Docker and nginx.

## Prerequisites

- AWS EC2 instance (Ubuntu/Amazon Linux recommended)
- Docker and Docker Compose installed on EC2
- Git installed on EC2
- Domain name (optional, but recommended)
- Security Group configured with ports 22, 80, and 443 open

## Step 1: Prepare Your EC2 Instance

SSH into your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
```

### Install Docker
```bash
# Update packages
sudo yum update -y  # For Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # For Ubuntu

# Install Docker
sudo yum install docker -y  # For Amazon Linux
# OR
sudo apt install docker.io -y  # For Ubuntu

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER
```

### Install Docker Compose
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Install Git
```bash
sudo yum install git -y  # For Amazon Linux
# OR
sudo apt install git -y  # For Ubuntu
```

## Step 2: Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/your-username/Bill-Automation.git

# Navigate to project directory
cd Bill-Automation
```

## Step 3: Configure Environment

### Update Backend Configuration

1. Copy the example environment file:
```bash
cp server/.env.example server/.env
```

2. Edit the environment file:
```bash
nano server/.env
```

Update these values:
```env
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-very-secure-random-string-here
CORS_ORIGIN=http://your-domain.com
```

### Update Frontend API URL

Edit `client/src/index.js` to update the axios baseURL:
```javascript
axios.defaults.baseURL = 'http://your-domain-or-ip';
axios.defaults.withCredentials = true;
```

Or create a `.env` file in the client directory:
```bash
nano client/.env
```

Add:
```env
REACT_APP_API_URL=http://your-domain-or-ip
```

## Step 4: Build and Run with Docker

### Build and start the containers:
```bash
# Build and start in detached mode
docker-compose up -d --build

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Useful Docker Commands:
```bash
# Stop containers
docker-compose down

# Restart containers
docker-compose restart

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend

# Rebuild specific service
docker-compose up -d --build backend

# Remove all containers and volumes
docker-compose down -v
```

## Step 5: Configure Security Group

In AWS EC2 Console, ensure your Security Group has these rules:

**Inbound Rules:**
- SSH (22) - Your IP
- HTTP (80) - 0.0.0.0/0
- HTTPS (443) - 0.0.0.0/0 (if using SSL)
- Custom TCP (5000) - Only if you want direct backend access (not recommended)

## Step 6: Access Your Application

Open your browser and navigate to:
- `http://your-ec2-public-ip` or `http://your-domain.com`

Default login credentials:
- Username: **admin**
- Password: **admin123**

**Important:** Change the default password after first login!

## Step 7: Set Up SSL (Optional but Recommended)

### Using Let's Encrypt (Free SSL)

1. Install Certbot:
```bash
sudo yum install certbot python3-certbot-nginx -y  # Amazon Linux
# OR
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu
```

2. Update nginx configuration for SSL
3. Obtain certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

4. Auto-renewal:
```bash
sudo certbot renew --dry-run
```

## Backup Strategy

### Backup Database and Uploads

Create a backup script:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp ~/Bill-Automation/server/bills.db $BACKUP_DIR/bills_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ~/Bill-Automation/server/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

Set up a cron job for daily backups:
```bash
crontab -e
```

Add:
```
0 2 * * * /path/to/backup-script.sh
```

## Updating the Application

```bash
# Navigate to project directory
cd ~/Bill-Automation

# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## Monitoring

### Check application status:
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Check disk space
df -h

# Check logs
docker-compose logs --tail=100 -f
```

## Troubleshooting

### Container won't start:
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Restart containers
docker-compose restart
```

### Permission issues:
```bash
# Fix permissions for uploads and database
sudo chown -R $USER:$USER ~/Bill-Automation/server/uploads
sudo chown -R $USER:$USER ~/Bill-Automation/server/bills.db
```

### Database issues:
```bash
# Connect to backend container
docker-compose exec backend sh

# Check database
ls -la bills.db
```

### Cannot access application:
1. Check Security Group rules
2. Check if containers are running: `docker-compose ps`
3. Check nginx logs: `docker-compose logs frontend`
4. Verify EC2 instance public IP

## Performance Optimization

### Enable swap (if needed):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Monitor resources:
```bash
# CPU and Memory usage
htop

# Docker resource usage
docker stats
```

## Security Best Practices

1. ✅ Change default admin password
2. ✅ Use strong session secret
3. ✅ Enable HTTPS with SSL certificate
4. ✅ Restrict SSH access to your IP only
5. ✅ Regularly update system packages
6. ✅ Set up automated backups
7. ✅ Use environment variables for sensitive data
8. ✅ Enable firewall (UFW/firewalld)
9. ✅ Regular security audits
10. ✅ Monitor logs for suspicious activity

## Support

For issues or questions, check the logs first:
```bash
docker-compose logs -f
```

Good luck with your deployment! 🚀
