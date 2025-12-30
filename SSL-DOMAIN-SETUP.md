# SSL & Domain Setup Guide
## Setting up bill.jmdsupplychainsolutions.in with SSL

This guide will help you configure your subdomain with SSL certificate.

---

## Step 1: Configure DNS on GoDaddy

1. **Login to GoDaddy** and go to **DNS Management** for `jmdsupplychainsolutions.in`

2. **Add an A Record:**
   - **Type**: A
   - **Name**: bill
   - **Value**: `3.111.196.144` (your EC2 public IP)
   - **TTL**: 600 seconds (or default)

3. **Click Save**

4. **Wait for DNS propagation** (usually 5-30 minutes)
   - Test with: `nslookup bill.jmdsupplychainsolutions.in`
   - Or: `ping bill.jmdsupplychainsolutions.in`

---

## Step 2: Install Certbot on EC2

SSH into your EC2 instance and run:

```bash
# Update package list
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y

# Verify installation
certbot --version
```

---

## Step 3: Update Nginx Configuration

```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/bill-automation
```

Replace the entire file with:

```nginx
server {
    listen 80;
    server_name bill.jmdsupplychainsolutions.in;
    
    # Frontend - serve static files
    root /home/ubuntu/Bill-Automation/client/build;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

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
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Test and reload nginx:

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Step 4: Get SSL Certificate with Certbot

```bash
# Get SSL certificate (will auto-configure nginx)
sudo certbot --nginx -d bill.jmdsupplychainsolutions.in
```

**Follow the prompts:**
1. Enter your email address
2. Agree to Terms of Service (Y)
3. Share email with EFF (optional - Y or N)
4. Choose option 2: Redirect HTTP to HTTPS (recommended)

Certbot will:
- ✅ Obtain SSL certificate from Let's Encrypt
- ✅ Auto-configure nginx for HTTPS
- ✅ Set up auto-renewal

---

## Step 5: Update Backend CORS

```bash
# Edit server environment file
nano ~/Bill-Automation/server/.env
```

Update CORS_ORIGIN:

```env
PORT=5000
NODE_ENV=production
SESSION_SECRET=your-super-secret-random-string-here
CORS_ORIGIN=https://bill.jmdsupplychainsolutions.in
```

**Restart backend:**

```bash
pm2 restart bill-automation-backend
```

---

## Step 6: Verify SSL and Access

1. **Open in browser:** https://bill.jmdsupplychainsolutions.in
2. **Check SSL certificate:** Click the padlock icon
3. **Login:** Use admin / admin123
4. **Change password immediately!**

---

## Step 7: Test Auto-Renewal

```bash
# Test certificate renewal (dry run)
sudo certbot renew --dry-run
```

If successful, auto-renewal is configured! Certbot will automatically renew certificates before they expire.

---

## Troubleshooting

### DNS not resolving
```bash
# Check DNS propagation
nslookup bill.jmdsupplychainsolutions.in
dig bill.jmdsupplychainsolutions.in

# Wait 30 minutes if just added
```

### Certbot fails with "too many requests"
Let's Encrypt has rate limits. If you hit them:
- Wait 1 hour and try again
- Or use staging environment for testing:
```bash
sudo certbot --nginx --staging -d bill.jmdsupplychainsolutions.in
```

### SSL certificate not working
```bash
# Check nginx config
sudo nginx -t

# View nginx logs
sudo tail -50 /var/log/nginx/error.log

# Check certificate status
sudo certbot certificates
```

### Backend connection fails
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs bill-automation-backend

# Verify CORS settings
cat ~/Bill-Automation/server/.env
```

### Port 443 blocked
In AWS Security Group, ensure:
- **Inbound Rule**: HTTPS (443) from 0.0.0.0/0

---

## Force HTTPS Redirect (Already configured by Certbot)

Certbot automatically adds HTTPS redirect. Your final nginx config will look like:

```nginx
server {
    listen 80;
    server_name bill.jmdsupplychainsolutions.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name bill.jmdsupplychainsolutions.in;
    
    ssl_certificate /etc/letsencrypt/live/bill.jmdsupplychainsolutions.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bill.jmdsupplychainsolutions.in/privkey.pem;
    
    # ... rest of configuration
}
```

---

## Certificate Renewal

Certbot sets up automatic renewal via systemd timer:

```bash
# Check renewal timer status
sudo systemctl status certbot.timer

# View upcoming renewal dates
sudo certbot certificates

# Manual renewal (if needed)
sudo certbot renew
```

Certificates auto-renew 30 days before expiration.

---

## Update Cookie Security

After SSL is working, update backend for secure cookies:

```bash
nano ~/Bill-Automation/server/index.js
```

The code already sets `secure: process.env.NODE_ENV === 'production'`, so cookies will automatically be secure in production!

Restart:
```bash
pm2 restart bill-automation-backend
```

---

## Final Checklist

- ✅ DNS A record points to EC2 IP
- ✅ Nginx configured for domain
- ✅ SSL certificate obtained
- ✅ HTTPS redirect enabled
- ✅ Backend CORS updated
- ✅ Secure cookies enabled
- ✅ Auto-renewal tested
- ✅ AWS Security Group allows port 443
- ✅ Application accessible at https://bill.jmdsupplychainsolutions.in
- ✅ Default password changed

---

## Monitoring SSL

Check your SSL rating:
- Visit: https://www.ssllabs.com/ssltest/
- Enter: bill.jmdsupplychainsolutions.in
- Target: A or A+ rating

---

## Additional Security (Optional)

### 1. Enable HTTP Strict Transport Security (HSTS)

Add to nginx config inside the `server` block for port 443:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. Restrict SSH to your IP

In AWS Security Group:
- Edit SSH (22) rule
- Change source from 0.0.0.0/0 to your IP address

### 3. Setup Fail2Ban (protect against brute force)

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Need Help?

If you encounter issues:

1. Check nginx logs:
   ```bash
   sudo tail -100 /var/log/nginx/error.log
   ```

2. Check certbot logs:
   ```bash
   sudo tail -100 /var/log/letsencrypt/letsencrypt.log
   ```

3. Verify DNS:
   ```bash
   nslookup bill.jmdsupplychainsolutions.in
   ```

4. Check backend:
   ```bash
   pm2 logs bill-automation-backend
   ```

---

🎉 **Congratulations!** Your application is now secured with SSL and accessible via a custom domain!

Access: https://bill.jmdsupplychainsolutions.in
