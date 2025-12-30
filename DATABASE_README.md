# Bill Automation System

A complete bill generation system with SQLite database and user authentication.

## Features

- ✅ SQLite database for persistent storage
- ✅ User authentication with sessions
- ✅ Customer management (CRUD operations)
- ✅ Two company support (North West Logistics & JMD Supply Chain)
- ✅ Auto-incrementing bill numbers per company
- ✅ PDF bill generation with Indian format
- ✅ GST support (No GST, In State, Out of State)
- ✅ Responsive design (mobile-friendly)
- ✅ Audit trail (tracks who generated bills)

## Installation

1. Install dependencies:
```bash
npm run install-all
```

2. Start the application:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000

## Default Login

- **Username:** admin
- **Password:** admin123

**⚠️ IMPORTANT:** Change the admin password after first login!

## Database

The system uses SQLite database (`server/bills.db`) with the following tables:

- **users** - User accounts and authentication
- **customers** - Customer information
- **companies** - Company details (North West Logistics & JMD Supply Chain)
- **bill_counter** - Auto-incrementing bill numbers per company
- **bills** - Audit trail of all generated bills

## User Management

### Adding New Users (Admin Only)

1. Login as admin
2. Use the API endpoint:
```bash
POST /api/auth/register
{
  "username": "employee1",
  "password": "password123",
  "role": "user"
}
```

Roles:
- **admin** - Full access + can create users
- **user** - Can generate bills and manage customers

## Bill Numbering

- Each company has its own bill counter
- Bill numbers auto-increment starting from 1
- If bill number is provided manually, it will be used (for migration purposes)
- Stored in `bill_counter` table

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/users` - Get all users (admin only)

### Companies
- `GET /api/companies` - Get all companies
- `GET /api/company` - Get selected company info
- `POST /api/company/select` - Select company
- `PUT /api/company` - Update company info

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Bills
- `POST /api/generate-bill` - Generate PDF bill

All endpoints (except auth/login) require authentication.

## Deployment

### Local Network Deployment

1. Find your computer's IP address:
```bash
ipconfig  # Windows
ifconfig  # Mac/Linux
```

2. Update CORS in `server/index.js`:
```javascript
app.use(cors({
  origin: 'http://YOUR_IP:3000',
  credentials: true
}));
```

3. Start the server and access from other computers using `http://YOUR_IP:3000`

### Cloud Deployment (Production)

For production deployment:

1. Set environment variables:
```
NODE_ENV=production
SESSION_SECRET=your-secure-random-secret
```

2. Enable HTTPS and set secure cookies:
```javascript
cookie: {
  secure: true,  // requires HTTPS
  httpOnly: true,
  sameSite: 'strict'
}
```

3. Use a production-grade database (PostgreSQL) or keep SQLite with regular backups

4. Set up SSL certificate

## Backup

To backup your data, simply copy the `server/bills.db` file to a safe location.

## Security Notes

1. **Change default admin password immediately**
2. Use strong passwords for all users
3. Enable HTTPS in production
4. Keep regular backups of the database
5. Update the session secret in production

## Support

For issues or questions, check the code comments or create an issue in the repository.
