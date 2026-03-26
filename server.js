require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const sgMail = require('@sendgrid/mail');
const multer = require('multer'); // Added for ID photo uploads
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// Setup File Upload Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads')); // Makes ID photos viewable via URL

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('✕ MongoDB Error:', err));

// Expanded User Model to capture ALL details
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  phoneNumber: String,
  idPhotoPath: String,    // Stores the path to their uploaded ID
  paymentAccount: String, // The account they paid from
  paymentRef: String,     // M-Pesa/Bank transaction code
  isVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- ROUTES ---

// 1. Registration with Profile Details & ID Upload
app.post('/api/register', upload.single('idPhoto'), async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, paymentAccount, paymentRef } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.create({ 
      email, 
      password: hashedPassword,
      fullName,
      phoneNumber,
      paymentAccount,
      paymentRef,
      idPhotoPath: req.file ? `/uploads/${req.file.filename}` : null
    });
    
    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// 2. Login (Remembers for 30 days)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.status(200).json({ message: "Login successful", redirect: '/dashboard.html' });
    }
    res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

// --- ADMIN ROUTES ---

// 3. Admin: Fetch ALL User Details
app.get('/api/admin/users', async (req, res) => {
  try {
    // You can add a check here for admin credentials if needed
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

// 4. Admin: Verify Payment & Approve User
app.post('/api/admin/update-status', async (req, res) => {
  try {
    const { email, status } = req.body;
    const isVerified = status === 'Accepted';
    
    await User.findOneAndUpdate({ email }, { status, isVerified });
    res.json({ message: `User marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

// Serve Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ CloudTasks Server live on port ${PORT}`);
});
