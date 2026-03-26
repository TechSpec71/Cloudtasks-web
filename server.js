// FORCING GOOGLE DNS TO FIX ENOTFOUND ERROR
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cloudtasks_ids',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

// --- UPDATED DATABASE CONNECTION ---
// Using modern options for the legacy connection string
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('✕ MongoDB Error:', err));

// --- UPDATED USER MODEL ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  education: { type: String, default: "" },      
  idPhotoPath: { type: String, default: "" },    
  paymentMethod: { type: String, default: "" },  
  payoutAccount: { type: String, default: "" },  
  paymentRef: { type: String, default: "" },     
  isVerified: { type: Boolean, default: false },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// --- ROUTES ---

// 1. Registration
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
      payoutAccount: paymentAccount,
      paymentRef,
      idPhotoPath: req.file ? req.file.path : null
    });
    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// --- NEW: UPDATE PROFILE ROUTE ---
app.post('/api/user/update-profile', upload.single('idPhoto'), async (req, res) => {
  try {
    const { email, fullName, phoneNumber, education, paymentMethod, payoutAccount, paymentRef } = req.body;
    
    let updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (education !== undefined) updateData.education = education;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (payoutAccount !== undefined) updateData.payoutAccount = payoutAccount;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef;
    if (req.file) updateData.idPhotoPath = req.file.path;

    const user = await User.findOneAndUpdate({ email }, updateData, { new: true });
    
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// 2. Login
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

// 3. Admin: Fetch Users
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

// 4. Admin: Update Status
app.post('/api/admin/update-status', async (req, res) => {
  try {
    const { email, status } = req.body;
    await User.findOneAndUpdate({ email }, { status, isVerified: status === 'Accepted' });
    res.json({ message: `User marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`✓ Server live on port ${PORT}`));
