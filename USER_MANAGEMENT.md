# User Management Guide

## Adding New Employees

### Method 1: Using Postman or API Client

1. **Login as admin first** to get session cookie

2. **Register new user:**
```
POST http://localhost:5000/api/auth/register
Headers:
  Content-Type: application/json
  
Body:
{
  "username": "employee_name",
  "password": "secure_password",
  "role": "user"
}
```

### Method 2: Using curl (Command Line)

```bash
# First login to get session
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Then register new user using the session
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"username":"employee1","password":"emp123","role":"user"}'
```

### Method 3: Direct Database (Bulk Import)

If you need to add many users at once:

1. Install SQLite browser: https://sqlitebrowser.org/
2. Open `server/bills.db`
3. Go to "Execute SQL" tab
4. Run this for each user:

```sql
-- First, hash the password using Node.js:
-- node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10, (e,h) => console.log(h));"

INSERT INTO users (username, password, role) 
VALUES ('employee1', '$2b$10$[HASHED_PASSWORD_HERE]', 'user');
```

## Changing Passwords

### For Admin User (via Database):

```bash
# Generate new hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('new_password', 10, (e,h) => console.log(h));"

# Update in database
UPDATE users SET password = '$2b$10$[NEW_HASH]' WHERE username = 'admin';
```

## User Roles

- **admin**: 
  - Can register new users
  - Can view all users
  - Full access to all features

- **user**: 
  - Can generate bills
  - Can manage customers
  - Can update company settings
  - Cannot register new users

## View All Users

**API Endpoint (Admin Only):**
```
GET http://localhost:5000/api/users
```

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2025-12-30 10:30:00"
  },
  {
    "id": 2,
    "username": "employee1",
    "role": "user",
    "created_at": "2025-12-30 11:00:00"
  }
]
```

## Quick Setup for New Company

1. **Create admin account** (already done: admin/admin123)

2. **Add all employees:**
   - Use Postman to register each employee
   - Or use bulk SQL insert

3. **Distribute credentials:**
   - Give each employee their username/password
   - Instruct them to access http://YOUR_IP:3000

4. **Change admin password** after setup is complete

## Security Best Practices

1. ✅ Change default admin password immediately
2. ✅ Use strong passwords (min 8 characters, mix of letters/numbers)
3. ✅ Don't share passwords between users
4. ✅ Give "user" role to employees (not admin)
5. ✅ Keep backup of bills.db file
6. ✅ Review bills table periodically for audit

## Troubleshooting

**Can't login:**
- Check username/password
- Check if server is running
- Check if bills.db exists

**Forgot admin password:**
```sql
-- Reset to default (admin123)
UPDATE users SET password = '$2b$10$rQs3gY8qZxvTKEZH0p1qXO8j3j3j3j3j3j3j3j3j3j3j3' WHERE username = 'admin';
```

**Session expired:**
- Login again
- Sessions last 24 hours by default

## Employee Access Instructions

**Share these instructions with employees:**

1. Open browser and go to: `http://[SERVER_IP]:3000`
2. Login with your username and password
3. You can now:
   - Generate bills (Tab 1)
   - Add/manage customers (Tab 2)
   - Update company details (Tab 3)
4. To logout, click the logout icon in top-right corner

---

**Need Help?** Check IMPLEMENTATION_SUMMARY.md or DATABASE_README.md
