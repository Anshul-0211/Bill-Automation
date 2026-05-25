const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'bill-automation-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Storage for signature
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const companyId = req.session.selectedCompanyId || 'northWestLogistics';
    cb(null, `signature-${companyId}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// Helper function to get company info from database
const getCompanyInfo = (companyId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Routes

// ===== AUTHENTICATION ROUTES =====

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Register new user (admin only)
app.post('/api/auth/register', isAuthenticated, async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, password, role } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role || 'user'],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json({ id: this.lastID, username, role: role || 'user' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Get all users (admin only)
app.get('/api/users', isAuthenticated, (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  db.all('SELECT id, username, role, created_at FROM users', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// ===== COMPANY ROUTES =====

// Get all companies
app.get('/api/companies', isAuthenticated, (req, res) => {
  db.all('SELECT * FROM companies', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get company info (currently selected or by ID)
app.get('/api/company', isAuthenticated, (req, res) => {
  const companyId = req.query.id || req.session.selectedCompanyId || 'northWestLogistics';

  db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Company not found' });
    }
    req.session.selectedCompanyId = companyId;
    res.json(row);
  });
});

// Select company
app.post('/api/company/select', isAuthenticated, (req, res) => {
  const { companyId } = req.body;

  db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Company not found' });
    }
    req.session.selectedCompanyId = companyId;
    res.json(row);
  });
});

// Update company info
app.put('/api/company', isAuthenticated, (req, res) => {
  const companyId = req.session.selectedCompanyId || 'northWestLogistics';
  const { name, ward, district, state, pinCode, gstin, pan, email, contactPerson, contactNo, bankName, accountNo, ifsc, branch } = req.body;

  db.run(
    `UPDATE companies SET name = ?, ward = ?, district = ?, state = ?, pinCode = ?, gstin = ?, pan = ?, email = ?, 
     contactPerson = ?, contactNo = ?, bankName = ?, accountNo = ?, ifsc = ?, branch = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [name, ward, district, state, pinCode, gstin, pan, email, contactPerson, contactNo, bankName, accountNo, ifsc, branch, companyId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      db.get('SELECT * FROM companies WHERE id = ?', [companyId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json(row);
      });
    }
  );
});

// ===== CUSTOMER ROUTES =====

// ===== CUSTOMER ROUTES =====

// Get all customers
app.get('/api/customers', isAuthenticated, (req, res) => {
  db.all('SELECT * FROM customers ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Add customer
app.post('/api/customers', isAuthenticated, (req, res) => {
  const { name, gstin, address, contactPerson, contactNo } = req.body;
  const id = Date.now().toString();

  db.run(
    'INSERT INTO customers (id, name, gstin, address, contactPerson, contactNo) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, gstin, address, contactPerson, contactNo],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({ id, name, gstin, address, contactPerson, contactNo });
    }
  );
});

// Update customer
app.put('/api/customers/:id', isAuthenticated, (req, res) => {
  const { name, gstin, address, contactPerson, contactNo } = req.body;

  db.run(
    'UPDATE customers SET name = ?, gstin = ?, address = ?, contactPerson = ?, contactNo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, gstin, address, contactPerson, contactNo, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json({ id: req.params.id, name, gstin, address, contactPerson, contactNo });
    }
  );
});

// Delete customer
app.delete('/api/customers/:id', isAuthenticated, (req, res) => {
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted' });
  });
});

// Upload signature
app.post('/api/upload-signature', isAuthenticated, upload.single('signature'), (req, res) => {
  if (req.file) {
    res.json({
      message: 'Signature uploaded successfully',
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

// Helper function to format number in Indian currency format
const formatIndianCurrency = (num) => {
  const numStr = parseFloat(num).toFixed(2);
  const [integerPart, decimalPart] = numStr.split('.');

  // Indian numbering: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }

  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return formatted + '.' + decimalPart;
};

// Get last generated bill info for each company
app.get('/api/bills/last', isAuthenticated, (req, res) => {
  db.all(
    `SELECT b.bill_number, b.company_id, c.name as company_name, b.generated_by, b.created_at 
     FROM bills b 
     LEFT JOIN companies c ON b.company_id = c.id 
     WHERE b.id IN (
       SELECT MAX(id) FROM bills GROUP BY company_id
     )
     ORDER BY c.name`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows || []);
    }
  );
});

// Generate PDF
app.post('/api/generate-bill', isAuthenticated, async (req, res) => {
  try {
    const billData = req.body;
    const companyId = req.session.selectedCompanyId || 'northWestLogistics';

    // Get company info from database
    const companyInfo = await getCompanyInfo(companyId);
    if (!companyInfo) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get and increment bill number
    const getNextBillNumber = () => {
      return new Promise((resolve, reject) => {
        db.get('SELECT last_bill_number FROM bill_counter WHERE company_id = ?', [companyId], (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          const nextBillNumber = (row?.last_bill_number || 0) + 1;

          db.run(
            'UPDATE bill_counter SET last_bill_number = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
            [nextBillNumber, companyId],
            (err) => {
              if (err) reject(err);
              else resolve(nextBillNumber);
            }
          );
        });
      });
    };

    // If bill number not provided, get next available
    if (!billData.billNo) {
      const nextNumber = await getNextBillNumber();
      billData.billNo = nextNumber.toString();
    }

    // Save bill record to database
    db.run(
      `INSERT INTO bills (bill_number, company_id, customer_id, customer_name, total_amount, gst_type, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        billData.billNo,
        companyId,
        billData.customer.id || null,
        billData.customer.name,
        parseFloat(billData.totals.grandTotal),
        billData.gstType,
        req.session.username
      ]
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bill-${billData.billNo}.pdf`);

    // ===============================
    // CUSTOMER + BILL DETAILS SECTION
    // ===============================

    const detailsBoxTop = 155;
    const leftStartX = 50;
    const leftValueX = 135;

    const rightStartX = 310;
    const rightValueX = 430;

    // Track dynamic Y for left side
    let leftY = detailsBoxTop + 10;

    doc.fontSize(8);

    // CUSTOMER NAME
    doc.font('Helvetica-Bold').text('Customer Name:', leftStartX, leftY);

    doc.font('Helvetica').text(
      billData.customer.name || '',
      leftValueX,
      leftY,
      {
        width: 145,
        lineGap: 2
      }
    );

    leftY = doc.y + 8;

    // GSTIN
    doc.font('Helvetica-Bold').text('Customer GSTIN:', leftStartX, leftY);

    doc.font('Helvetica').text(
      billData.customer.gstin || '',
      leftValueX,
      leftY,
      {
        width: 145
      }
    );

    leftY = doc.y + 8;

    // ADDRESS
    doc.font('Helvetica-Bold').text('Address:', leftStartX, leftY);

    doc.font('Helvetica').text(
      billData.customer.address || '',
      leftValueX,
      leftY,
      {
        width: 145,
        lineGap: 2
      }
    );

    leftY = doc.y + 8;

    // CONTACT PERSON
    doc.font('Helvetica-Bold').text('Contact Person:', leftStartX, leftY);

    doc.font('Helvetica').text(
      billData.customer.contactPerson || '',
      leftValueX,
      leftY,
      {
        width: 145
      }
    );

    leftY = doc.y + 8;

    // CONTACT NO
    doc.font('Helvetica-Bold').text('Contact No:', leftStartX, leftY);

    doc.font('Helvetica').text(
      billData.customer.contactNo || '',
      leftValueX,
      leftY,
      {
        width: 145
      }
    );

    leftY = doc.y + 8;

    // ===============================
    // RIGHT SIDE BILL DETAILS
    // ===============================

    let rightY = detailsBoxTop + 10;

    doc.font('Helvetica-Bold').text('Bill No:', rightStartX, rightY);
    doc.font('Helvetica').text(
      billData.billNo || '',
      rightValueX,
      rightY,
      { width: 110 }
    );

    rightY += 16;

    doc.font('Helvetica-Bold').text('Bill Date:', rightStartX, rightY);
    doc.font('Helvetica').text(
      billData.billDate || '',
      rightValueX,
      rightY,
      { width: 110 }
    );

    rightY += 16;

    doc.font('Helvetica-Bold').text('Contact Person:', rightStartX, rightY);

    doc.font('Helvetica').text(
      companyInfo.contactPerson || '',
      rightValueX,
      rightY,
      {
        width: 110,
        lineGap: 2
      }
    );

    rightY = doc.y + 8;

    doc.font('Helvetica-Bold').text('Contact No:', rightStartX, rightY);

    doc.font('Helvetica').text(
      companyInfo.contactNo || '',
      rightValueX,
      rightY,
      {
        width: 110
      }
    );

    rightY = doc.y + 8;

    // ===============================
    // CALCULATE DYNAMIC BOX HEIGHT
    // ===============================

    const dynamicContentBottom = Math.max(leftY, rightY);

    const detailsBoxHeight =
      dynamicContentBottom - detailsBoxTop + 10;

    // OUTER BOX
    doc.rect(40, detailsBoxTop, 515, detailsBoxHeight).stroke();

    // MIDDLE DIVIDER
    doc.moveTo(297.5, detailsBoxTop)
      .lineTo(297.5, detailsBoxTop + detailsBoxHeight)
      .stroke();

    // ===============================
    // BOTTOM ROW
    // ===============================

    const bottomRowY = detailsBoxTop + detailsBoxHeight;

    doc.rect(40, bottomRowY, 515, 20).stroke();

    doc.moveTo(297.5, bottomRowY)
      .lineTo(297.5, bottomRowY + 20)
      .stroke();

    doc.font('Helvetica')
      .text(
        'Tax is payable on Reverse Charge (Y/N):',
        50,
        bottomRowY + 6
      );

    doc.font('Helvetica-Bold')
      .text('No', 200, bottomRowY + 6);

    doc.font('Helvetica')
      .text('Place of Supply', 310, bottomRowY + 6);

    doc.font('Helvetica-Bold')
      .text(
        billData.placeOfSupply || '',
        400,
        bottomRowY + 6
      );

    // ===============================
    // TABLE STARTS DYNAMICALLY
    // ===============================

    const tableTop = bottomRowY + 40;
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
