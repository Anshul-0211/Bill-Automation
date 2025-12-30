const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'bills.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = () => {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers table
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gstin TEXT,
        address TEXT,
        contactPerson TEXT,
        contactNo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ward TEXT,
        district TEXT,
        state TEXT,
        pinCode TEXT,
        gstin TEXT,
        pan TEXT,
        email TEXT,
        contactPerson TEXT,
        contactNo TEXT,
        bankName TEXT,
        accountNo TEXT,
        ifsc TEXT,
        branch TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bill counter table
    db.run(`
      CREATE TABLE IF NOT EXISTS bill_counter (
        company_id TEXT PRIMARY KEY,
        last_bill_number INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bills history table (for audit trail)
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT NOT NULL,
        company_id TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        total_amount REAL,
        gst_type TEXT,
        generated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default companies
    const companies = [
      {
        id: 'northWestLogistics',
        name: 'North West Logistics',
        ward: 'Ward No. 5 Gopiganj',
        district: 'Dist. - Sant Ravidas Nagar',
        state: 'Uttar Pradesh',
        pinCode: 'Pin Code - 221306',
        gstin: '09CBKPS4617L1ZZ',
        pan: 'CBKPS4617L',
        email: 'finance@nwl.in',
        contactPerson: 'Laxmi Shankar Shukla',
        contactNo: '9760041241',
        bankName: 'Union Bank Of India',
        accountNo: '754701010050156',
        ifsc: 'UBIN0575470',
        branch: 'Ramapur, Uttar Pradesh'
      },
      {
        id: 'jmdSupplyChain',
        name: 'JMD SUPPLY CHAIN SOLUTIONS',
        ward: 'Ward No. 5 khamaria, manaurveer',
        district: 'Dist. - Sant Ravidas Nagar',
        state: 'Uttar Pradesh',
        pinCode: 'Pin Code - 221306',
        gstin: '09AAUFJ5102G1Z8',
        pan: 'AAUF5102G',
        email: 'jmdsupplychainsolutions@gmail.com',
        contactPerson: '',
        contactNo: '',
        bankName: '',
        accountNo: '',
        ifsc: '',
        branch: ''
      }
    ];

    companies.forEach(company => {
      db.run(`
        INSERT OR IGNORE INTO companies (id, name, ward, district, state, pinCode, gstin, pan, email, contactPerson, contactNo, bankName, accountNo, ifsc, branch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [company.id, company.name, company.ward, company.district, company.state, company.pinCode, company.gstin, company.pan, company.email, company.contactPerson, company.contactNo, company.bankName, company.accountNo, company.ifsc, company.branch]);

      // Initialize bill counter for each company
      db.run(`
        INSERT OR IGNORE INTO bill_counter (company_id, last_bill_number) VALUES (?, 0)
      `, [company.id]);
    });

    // Create default admin user (username: admin, password: admin123)
    // You should change this password after first login
    bcrypt.hash('admin123', 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }
      db.run(`
        INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)
      `, ['admin', hash, 'admin'], (err) => {
        if (!err) {
          console.log('Default admin user created (username: admin, password: admin123)');
        }
      });
    });

    // Create additional users
    const additionalUsers = [
      { username: 'Sss', password: 'Nwl123', role: 'user' },
      { username: 'Sudhanshu', password: 'Jmd123', role: 'user' },
      { username: 'Vinay', password: 'Jmd123', role: 'user' },
      { username: 'Manoj', password: 'Jmd123', role: 'user' }
    ];

    additionalUsers.forEach(user => {
      bcrypt.hash(user.password, 10, (err, hash) => {
        if (err) {
          console.error(`Error hashing password for ${user.username}:`, err);
          return;
        }
        db.run(`
          INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)
        `, [user.username, hash, user.role], (err) => {
          if (!err) {
            console.log(`User created: ${user.username}`);
          }
        });
      });
    });

    console.log('Database initialized successfully');
  });
};

initializeDatabase();

module.exports = db;
