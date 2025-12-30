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
      function(err) {
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
    function(err) {
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
    function(err) {
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
    function(err) {
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
  db.run('DELETE FROM customers WHERE id = ?', [req.params.id], function(err) {
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
    
    doc.pipe(res);

    // Top border
    doc.rect(40, 40, 515, 750).stroke();

    // Header - Left side
    doc.fontSize(18).font('Helvetica-Bold').text(companyInfo.name, 50, 50);
    doc.fontSize(8).font('Helvetica');
    doc.text(companyInfo.ward, 50, 72);
    doc.text(companyInfo.district, 50, 82);
    doc.text(companyInfo.state, 50, 92);
    doc.text(companyInfo.pinCode, 50, 102);
    doc.text(`GSTIN - ${companyInfo.gstin}`, 50, 112);
    doc.text(`Pan No. - ${companyInfo.pan}`, 50, 122);
    doc.text(`Email Id - ${companyInfo.email}`, 50, 132);

    // Header - Right side (Bill Of Supply or Tax Invoice based on GST type)
    const headerText = (billData.gstType === 'nogst') ? 'Bill Of Supply' : 'Tax Invoice';
    doc.fontSize(16).font('Helvetica-Bold').text(headerText, 380, 50);
    
    // Horizontal line after header
    doc.moveTo(40, 150).lineTo(555, 150).stroke();
    
    // Combined Customer and Bill details box
    const detailsBoxTop = 155;
    doc.rect(40, detailsBoxTop, 515, 95).stroke();
    
    // Vertical divider line (middle)
    doc.moveTo(297.5, detailsBoxTop).lineTo(297.5, detailsBoxTop + 95).stroke();
    
    // LEFT SIDE - Customer Details (50%)
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Customer Name:', 50, detailsBoxTop + 10);
    doc.font('Helvetica').text(billData.customer.name, 135, detailsBoxTop + 10, { width: 150 });
    
    doc.font('Helvetica-Bold').text('Customer GSTIN:', 50, detailsBoxTop + 22);
    doc.font('Helvetica').text(billData.customer.gstin, 135, detailsBoxTop + 22, { width: 150 });
    
    doc.font('Helvetica-Bold').text('Address:', 50, detailsBoxTop + 34);
    doc.font('Helvetica').text(billData.customer.address, 135, detailsBoxTop + 34, { width: 150, lineGap: 2 });
    
    doc.font('Helvetica-Bold').text('Contact Person:', 50, detailsBoxTop + 60);
    doc.font('Helvetica').text(billData.customer.contactPerson, 135, detailsBoxTop + 60, { width: 150 });
    
    doc.font('Helvetica-Bold').text('Contact No:', 50, detailsBoxTop + 72);
    doc.font('Helvetica').text(billData.customer.contactNo, 135, detailsBoxTop + 72, { width: 150 });
    
    // RIGHT SIDE - Bill Details (50%)
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Bill No:', 310, detailsBoxTop + 10);
    doc.font('Helvetica').text(billData.billNo, 430, detailsBoxTop + 10);
    
    doc.font('Helvetica-Bold').text('Bill Date:', 310, detailsBoxTop + 22);
    doc.font('Helvetica').text(billData.billDate, 430, detailsBoxTop + 22);
    
    doc.font('Helvetica-Bold').text('Contact Person:', 310, detailsBoxTop + 34);
    doc.font('Helvetica').text(companyInfo.contactPerson, 430, detailsBoxTop + 34, { width: 115 });
    
    doc.font('Helvetica-Bold').text('Contact No:', 310, detailsBoxTop + 46);
    doc.font('Helvetica').text(companyInfo.contactNo, 430, detailsBoxTop + 46);
    
    // Bottom row - Tax and Place of Supply
    const bottomRowY = detailsBoxTop + 95;
    doc.rect(40, bottomRowY, 515, 20).stroke();
    doc.moveTo(297.5, bottomRowY).lineTo(297.5, bottomRowY + 20).stroke();
    
    doc.font('Helvetica').text('Tax is payable on Reverse Charge (Y/N):', 50, bottomRowY + 6);
    doc.font('Helvetica-Bold').text('No', 200, bottomRowY + 6);
    
    doc.font('Helvetica').text('Place of Supply', 310, bottomRowY + 6);
    doc.font('Helvetica-Bold').text(billData.placeOfSupply || '', 400, bottomRowY + 6);

    // Table
    const tableTop = 290;
    const tableHeaders = [
      { text: 'Sr.', width: 20 },
      { text: 'LR Date', width: 40 },
      { text: 'LR No.', width: 35 },
      { text: 'Vehicle No.', width: 47 },
      { text: 'From Location', width: 50 },
      { text: 'To Location', width: 50 },
      { text: 'Freight Charge in Rs.', width: 42 },
      { text: 'Document Charges', width: 37 },
      { text: 'Loading / Unloading Charges', width: 42 },
      { text: 'Door Delivery Charges', width: 37 },
      { text: 'Halting Charges', width: 32 },
      { text: 'Other Charges (Rs.)', width: 32 },
      { text: 'Amount (Rs.)', width: 51 }
    ];
    
    // Draw table header box
    doc.rect(40, tableTop, 515, 35).stroke();
    
    let xPos = 40;
    doc.fontSize(6).font('Helvetica-Bold');
    
    tableHeaders.forEach((header, i) => {
      // Draw vertical lines
      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 35).stroke();
      doc.text(header.text, xPos + 1, tableTop + 12, { width: header.width - 2, align: 'center', lineGap: 1 });
      xPos += header.width;
    });
    doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 35).stroke(); // Last vertical line

    // Table rows
    let yPos = tableTop + 35;
    doc.font('Helvetica').fontSize(7);
    const rowHeight = 22;
    
    billData.items.forEach((item, index) => {
      xPos = 40;
      const rowData = [
        { text: (index + 1).toString(), width: 20 },
        { text: item.lrDate, width: 40 },
        { text: item.lrNo, width: 35 },
        { text: item.vehicleNo, width: 47 },
        { text: item.fromLocation, width: 50 },
        { text: item.toLocation, width: 50 },
        { text: item.freightCharge, width: 42 },
        { text: item.documentCharges || '0', width: 37 },
        { text: item.loadingCharges || '0', width: 42 },
        { text: item.doorDeliveryCharges || '0', width: 37 },
        { text: item.haltingCharges || '0', width: 32 },
        { text: item.otherCharges || '0', width: 32 },
        { text: item.amount, width: 51 }
      ];
      
      // Draw row border
      doc.rect(40, yPos, 515, rowHeight).stroke();
      
      rowData.forEach((data, i) => {
        // Draw vertical lines
        doc.moveTo(xPos, yPos).lineTo(xPos, yPos + rowHeight).stroke();
        doc.text(data.text, xPos + 1, yPos + 7, { width: data.width - 2, align: 'center' });
        xPos += data.width;
      });
      doc.moveTo(xPos, yPos).lineTo(xPos, yPos + rowHeight).stroke(); // Last vertical line
      yPos += rowHeight;
    });
    
    // Remarks row
    doc.rect(40, yPos, 515, 20).stroke();
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Remarks:-', 45, yPos + 6);
    if (billData.remarks) {
      doc.font('Helvetica').text(billData.remarks, 100, yPos + 6);
    }

    // Totals section - Table format
    yPos += 20;
    const taxTableLeft = 360;
    const taxTableWidth = 195;
    const taxRowHeight = 18;
    
    // Total taxable value row with borders
    doc.rect(taxTableLeft, yPos, taxTableWidth, taxRowHeight).stroke();
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Total taxable value of supply', taxTableLeft + 5, yPos + 5);
    doc.text(formatIndianCurrency(billData.totals.taxableValue), taxTableLeft + 100, yPos + 5, { width: 90, align: 'right' });
    
    // SGST row with borders - always show
    doc.rect(taxTableLeft, yPos + taxRowHeight, taxTableWidth, taxRowHeight).stroke();
    doc.text('SGST @ 9%', taxTableLeft + 5, yPos + taxRowHeight + 5);
    doc.text(formatIndianCurrency(billData.totals.sgst || 0), taxTableLeft + 100, yPos + taxRowHeight + 5, { width: 90, align: 'right' });
    
    // CGST row with borders - always show
    doc.rect(taxTableLeft, yPos + (2 * taxRowHeight), taxTableWidth, taxRowHeight).stroke();
    doc.text('CGST @ 9%', taxTableLeft + 5, yPos + (2 * taxRowHeight) + 5);
    doc.text(formatIndianCurrency(billData.totals.cgst || 0), taxTableLeft + 100, yPos + (2 * taxRowHeight) + 5, { width: 90, align: 'right' });
    
    // IGST row with borders - always show
    doc.rect(taxTableLeft, yPos + (3 * taxRowHeight), taxTableWidth, taxRowHeight).stroke();
    doc.text('IGST @ 18%', taxTableLeft + 5, yPos + (3 * taxRowHeight) + 5);
    doc.text(formatIndianCurrency(billData.totals.igst || 0), taxTableLeft + 100, yPos + (3 * taxRowHeight) + 5, { width: 90, align: 'right' });

    // Grand Total box - extends to outer border
    const grandTotalY = yPos + (4 * taxRowHeight);
    doc.rect(taxTableLeft, grandTotalY, taxTableWidth, 20).stroke();
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Grand Total Rs', taxTableLeft + 5, grandTotalY + 5);
    doc.text(formatIndianCurrency(billData.totals.grandTotal), taxTableLeft + 100, grandTotalY + 5, { width: 90, align: 'right' });

    // Line above Amount in Words
    doc.moveTo(40, grandTotalY + 30).lineTo(555, grandTotalY + 30).stroke();
    
    // Amount in words
    doc.fontSize(9).font('Helvetica');
    doc.text(`Amount in Words: ${billData.amountInWords}`, 50, grandTotalY + 38);
    
    // Line below Amount in Words
    doc.moveTo(40, grandTotalY + 55).lineTo(555, grandTotalY + 55).stroke();

    // Terms
    const termsY = grandTotalY + 65;
    doc.fontSize(9).font('Helvetica-Bold').text('Terms & Conditions', 50, termsY);
    doc.fontSize(8).font('Helvetica').text(`1) Payment by RTGS/NEFT/ Cheque only and to be made in Favor of "${companyInfo.name}" only.`, 50, termsY + 13);

    // Horizontal divider line
    doc.moveTo(40, termsY + 30).lineTo(555, termsY + 30).stroke();

    // Bank details - Left side
    doc.fontSize(9).font('Helvetica-Bold').text('Bank NEFT/RTGS Details:', 50, termsY + 40);
    doc.fontSize(8).font('Helvetica');
    doc.text('Bank Name', 50, termsY + 55);
    doc.text(`:- ${companyInfo.bankName}`, 140, termsY + 55);
    
    doc.text('Bank Account No.', 50, termsY + 68);
    doc.text(`:- ${companyInfo.accountNo}`, 140, termsY + 68);
    
    doc.text('IFSC Code', 50, termsY + 81);
    doc.text(`:- ${companyInfo.ifsc}`, 140, termsY + 81);
    doc.text('(All digits are "Zero")', 153, termsY + 93);
    
    doc.text('Branch Name', 50, termsY + 106);
    doc.text(`:- ${companyInfo.branch}`, 140, termsY + 106);
    
    doc.text('PAN No.', 50, termsY + 119);
    doc.text(`:- ${companyInfo.pan}`, 140, termsY + 119);
    
    // GST Details box
    doc.fontSize(9).font('Helvetica-Bold').text('GST DETAILS', 50, termsY + 140);
    doc.fontSize(8).font('Helvetica');
    doc.text('GSTIN', 50, termsY + 155);
    doc.text(`:- ${companyInfo.gstin}`, 140, termsY + 155);

    // Signature - Right side
    doc.fontSize(9).font('Helvetica').text(`For ${companyInfo.name}`, 380, termsY + 55);
    
    // Add signature image if exists (company-specific)
    const signaturePath = path.join(__dirname, `../uploads/signature-${companyId}.png`);
    if (fs.existsSync(signaturePath)) {
      doc.image(signaturePath, 400, termsY + 75, { width: 80, height: 50 });
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
