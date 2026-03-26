require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// Start Server
app.listen(PORT, () => {
  console.log(`✓ CloudTasks Server live on port ${PORT}`);
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('✕ MongoDB Error:', err));

// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  resetToken: String,
  resetTokenExpiry: Date
});
const User = mongoose.model('User', userSchema);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// --- ROUTES ---

// 1. Registration (No OTP)
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Save User
    await User.create({ email, password: hashedPassword });
    
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
      // Create Token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
      
      // Set Cookie
      res.cookie('token', token, { 
        httpOnly: true, 
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 Days
      });

      return res.status(200).json({ message: "Login successful", redirect: '/dashboard.html' });
    }
    res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

// 3. Password Reset Request
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create temporary token
    const resetToken = Math.random().toString(36).substring(2, 15);
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
    await user.save();

    // Send Email (Update the URL to your live CloudNova/Render domain later)
    const msg = {
      to: email,
      from: 'ritawamaa71@gmail.com',
      subject: 'CloudTasks - Password Reset',
      html: `<p>You requested a password reset.</p>
             <p>Click <a href="https://${req.headers.host}/reset-password.html?token=${resetToken}">HERE</a> to reset your password.</p>`
    };
    await sgMail.send(msg);
    res.json({ message: "Reset link sent to your email!" });
  } catch (error) {
    res.status(500).json({ message: "Error sending email" });
  }
});

// Serve Home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
