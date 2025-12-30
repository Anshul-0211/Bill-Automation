# Quick Fix for EC2 Deployment Issue

## Problem
The Docker build is failing because `package.json` files are missing in the server directory.

## Solution

Run these commands on your EC2 instance:

```bash
# Navigate to your project directory
cd ~/Bill-Automation

# Pull the latest changes (after you push from local)
git pull origin main

# Verify the files exist
ls -la server/package.json
ls -la client/package.json

# If package.json files exist, run the deployment
./deploy.sh
```

## Alternative: Manual Fix on EC2

If you can't pull the changes yet, create the package.json manually:

```bash
cd ~/Bill-Automation/server

# Create package.json
cat > package.json << 'EOF'
{
  "name": "bill-automation-server",
  "version": "1.0.0",
  "description": "Backend server for Bill Automation System",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.13.0",
    "sqlite3": "^5.1.6",
    "bcrypt": "^5.1.1",
    "express-session": "^1.17.3"
  }
}
EOF

# Return to project root
cd ~/Bill-Automation

# Try deployment again
./deploy.sh
```

## Next Steps

1. **From your local machine**: Push the changes
   ```bash
   git add .
   git commit -m "Add package.json files for Docker build"
   git push origin main
   ```

2. **On EC2**: Pull and deploy
   ```bash
   cd ~/Bill-Automation
   git pull origin main
   ./deploy.sh
   ```

## What Changed

- ✅ Created `server/package.json` with all backend dependencies
- ✅ Removed deprecated `version` field from `docker-compose.yml`
- ✅ Docker build should now work correctly

## If Still Failing

Run diagnostics:
```bash
./diagnostics.sh
```

Check the error:
```bash
cat deployment_errors_*.log
```

View the build context:
```bash
ls -la server/
```
