# Bill Automation System

A comprehensive full-stack web application for generating professional bills/invoices with multi-company support, customer management, and PDF export capabilities.

## Features

### ✨ Core Functionality
- **Multi-Company Support**: Manage bills for multiple companies (North West Logistics & JMD Supply Chain Solutions)
- **User Authentication**: Secure login system with role-based access
- **Bill Generation**: Create professional bills with automatic calculations
- **Customer Management**: Add, edit, and manage customer information
- **Auto-fill Customer Data**: Select customer from dropdown to auto-populate details
- **Dynamic Line Items**: Add/remove multiple line items with automatic amount calculation
- **PDF Export**: Generate professional PDF bills matching your company format
- **Digital Signature**: Company-specific signatures on bills
- **Tax Calculations**: Automatic SGST, CGST, and IGST calculations (with No GST option)
- **Amount in Words**: Auto-convert total amount to words
- **Bill Tracking**: Track last generated bill per company
- **Audit Trail**: Records who generated each bill with timestamps
- **Persistent Storage**: SQLite database for reliable data storage

### 🎨 User Interface
- Material-UI components for modern, responsive design
- Mobile-responsive with optimized card layout for small screens
- Three main tabs:
  - Generate Bill
  - Manage Customers
  - Company Settings
- Real-time calculations and previews
- Last bill notifications

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Material-UI v5** - Component library
- **Axios** - HTTP client
- **date-fns** - Date formatting

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite3** - Database
- **bcrypt** - Password hashing
- **express-session** - Session management
- **PDFKit** - PDF generation
- **Multer** - File upload handling

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Local Development Setup

1. **Clone the Repository**
   ```bash
   git clone <your-repo-url>
   cd Bill-Automation
   ```

2. **Install Dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure Environment Variables**
   
   For Backend:
   ```bash
   cp server/.env.example server/.env
   ```
   
   For Frontend:
   ```bash
   cp client/.env.example client/.env.development
   ```

4. **Run the Application**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend React app on `http://localhost:3000`

5. **Default Login Credentials**
   - Username: **admin**
   - Password: **admin123**
   
   Additional users:
   - **Sss** / Nwl123
   - **Sudhanshu** / Jmd123
   - **Vinay** / Jmd123
   - **Manoj** / Jmd123

### Individual Commands

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install

# Run backend only
npm run server

# Run frontend only
npm run client
```

## 🚀 Production Deployment

For deploying to AWS EC2 with Docker and nginx, see the detailed guide:

👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment instructions

Quick deployment with Docker:
```bash
# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Usage Guide

### 1. Login
- Open the application in your browser
- Use one of the default credentials listed above
- **Important**: Change the default admin password after first login

### 2. Company Selection
- Navigate to the "Company Settings" tab
- Select company from dropdown (North West Logistics or JMD Supply Chain Solutions)
- Fill in/update company information
- Upload company-specific signature image
- Save the information

### 3. Add Customers
- Go to "Manage Customers" tab
- Click "Add Customer" button
- Fill in customer details:
  - Customer Name
  - GSTIN
  - Address
  - Contact Person
  - Contact Number
- Save the customer

### 4. Generate Bill
- Go to "Generate Bill" tab
- View last generated bills for each company at the top
- Enter Bill Number and Bill Date
- Select customer from dropdown (auto-fills customer details)
- Enter Place of Supply
- Select GST Type (In State, Out of State, or No GST)
- Add line items:
  - LR Date, LR No, Vehicle No
  - From and To locations
  - Freight charges, Loading, Halting, and Other charges
- View real-time calculations
- Click "Generate PDF Bill" to download

## Project Structure

```
Bill-Automation/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.js
│   │   │   ├── Login.js
│   │   │   ├── BillGenerator.js
│   │   │   ├── CustomerManagement.js
│   │   │   └── CompanySettings.js
│   │   ├── index.js
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js
│   ├── database.js
│   ├── bills.db            # SQLite database (auto-created)
│   ├── Dockerfile
│   └── package.json
├── uploads/               # Signature storage (company-specific)
│   ├── signature-northWestLogistics.png
│   └── signature-jmdSupplyChain.png
├── docker-compose.yml
├── DEPLOYMENT.md
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/users` - Get all users (admin only)

### Company
- `GET /api/companies` - Get all companies
- `GET /api/company` - Get company information
- `POST /api/company/select` - Select active company
- `PUT /api/company` - Update company information

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Add new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Files
- `POST /api/upload-signature` - Upload company-specific signature image

### Bills
- `GET /api/bills/last` - Get last generated bill for each company
- `POST /api/generate-bill` - Generate PDF bill

## Database Schema

### users
- id, username, password (hashed), role, created_at

### customers
- id, name, gstin, address, contactPerson, contactNo, created_at, updated_at

### companies
- id, name, ward, district, state, pinCode, gstin, pan, email, contactPerson, contactNo, bankName, accountNo, ifsc, branch, updated_at

### bill_counter
- company_id, last_bill_number, updated_at

### bills (audit trail)
- id, bill_number, company_id, customer_id, customer_name, total_amount, gst_type, generated_by, created_at

## Data Models

### Customer
```javascript
{
  id: string,
  name: string,
  gstin: string,
  address: string,
  contactPerson: string,
  contactNo: string
}
```

### Bill
```javascript
{
  billNo: string,
  billDate: string,
  placeOfSupply: string,
  customer: Customer,
  items: [
    {
      lrDate: string,
      lrNo: string,
      vehicleNo: string,
      fromLocation: string,
      toLocation: string,
      freightCharge: number,
      documentCharges: number,
      loadingCharges: number,
      doorDeliveryCharges: number,
      haltingCharges: number,
      otherCharges: number,
      amount: number
    }
  ]
}
```

## Customization

### Add New Users
Edit [server/database.js](server/database.js) to add more default users in the `additionalUsers` array.

### Modify Company Details
Update company information through the Company Settings UI, or edit directly in [server/database.js](server/database.js).

### Change Tax Rates
Modify the calculation logic in [client/src/components/BillGenerator.js](client/src/components/BillGenerator.js) in the `calculateTotals()` function.

### Customize PDF Layout
Edit the PDF generation logic in [server/index.js](server/index.js) in the `/api/generate-bill` endpoint.

### Update Session Configuration
Modify session settings in [server/index.js](server/index.js) or use environment variables in production.

## Security Features

✅ Password hashing with bcrypt (10 rounds)  
✅ Session-based authentication with httpOnly cookies  
✅ CORS configuration for credential-based requests  
✅ Environment variables for sensitive data  
✅ SQL injection protection via parameterized queries  
✅ Role-based access control (admin/user)  
✅ Audit trail for all bill generations  

## Technologies & Libraries

### Frontend Dependencies
```json
{
  "react": "^18.x",
  "@mui/material": "^5.x",
  "@mui/icons-material": "^5.x",
  "@emotion/react": "^11.x",
  "@emotion/styled": "^11.x",
  "axios": "^1.x",
  "date-fns": "^2.x"
}
```

### Backend Dependencies
```json
{
  "express": "^4.x",
  "cors": "^2.x",
  "multer": "^1.x",
  "pdfkit": "^0.x",
  "sqlite3": "^5.x",
  "bcrypt": "^5.x",
  "express-session": "^1.x"
}
```

## Docker Deployment

### Using Docker Compose
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Restart services
docker-compose restart
```

### Individual Container Build
```bash
# Build backend
cd server
docker build -t bill-automation-backend .

# Build frontend
cd client
docker build -t bill-automation-frontend .
```

## Troubleshooting

### Port Already in Use
```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### Database Issues
- Delete `server/bills.db` to reset the database
- Default data will be recreated on next server start

### Authentication Issues
- Clear browser cookies and session storage
- Check CORS configuration matches your frontend URL
- Ensure SESSION_SECRET is set in production

### PDF Generation Fails
- Verify company signature files exist in `uploads/` directory
- Check file naming: `signature-{companyId}.png`
- Ensure uploads directory has write permissions

## Performance Considerations

- SQLite is suitable for small to medium scale deployments
- For high-traffic applications, consider migrating to PostgreSQL/MySQL
- Enable HTTPS in production for secure cookie transmission
- Use PM2 or similar process manager for backend in production
- Consider using Redis for session storage in scaled deployments

## Completed Features

✅ Multi-company support (2 companies)  
✅ User authentication with 5 default users  
✅ SQLite database integration  
✅ Bill counter per company  
✅ Audit trail for bills  
✅ Last bill notifications  
✅ Company-specific signatures  
✅ Mobile-responsive design  
✅ GST type handling (In-state, Out-of-state, No GST)  
✅ Multiple charge types (Freight, Loading, Halting, Other)  
✅ PDF generation with Indian currency formatting  
✅ Docker deployment setup  

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For deployment issues, refer to [DEPLOYMENT.md](./DEPLOYMENT.md)  
For general issues or questions, please open an issue on GitHub.

---

**Bill Automation System** - Developed for North West Logistics & JMD Supply Chain Solutions



