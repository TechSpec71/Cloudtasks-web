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
const uploadFields = upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'selfiePhoto', maxCount: 1 }
]);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('✕ MongoDB Error:', err));

// --- USER MODEL ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "" },
  phoneNumber: { type: String, default: "" },
  education: { type: String, default: "" },      
  referralCode: { type: String, default: "" },
  idPhotoPath: { type: String, default: "" },    
  selfiePath: { type: String, default: "" },      
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
app.post('/api/register', uploadFields, async (req, res) => {
  try {
    const { email, password, fullName, phoneNumber, education, referralCode, paymentAccount, paymentRef } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const idPath = req.files && req.files['idPhoto'] ? req.files['idPhoto'][0].path : null;
    const selfiePath = req.files && req.files['selfiePhoto'] ? req.files['selfiePhoto'][0].path : null;

    await User.create({ 
      email, 
      password: hashedPassword,
      fullName,
      phoneNumber,
      education,
      referralCode,
      payoutAccount: paymentAccount,
      paymentRef,
      idPhotoPath: idPath,
      selfiePath: selfiePath
    });
    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// 2. Profile Update
app.post('/api/user/update-profile', uploadFields, async (req, res) => {
  try {
    const { email, fullName, phoneNumber, education, referralCode, paymentMethod, payoutAccount, paymentRef } = req.body;
    
    let updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (education !== undefined) updateData.education = education;
    if (referralCode !== undefined) updateData.referralCode = referralCode;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (payoutAccount !== undefined) updateData.payoutAccount = payoutAccount;
    if (paymentRef !== undefined) updateData.paymentRef = paymentRef;

    if (req.files && req.files['idPhoto']) updateData.idPhotoPath = req.files['idPhoto'][0].path;
    if (req.files && req.files['selfiePhoto']) updateData.selfiePath = req.files['selfiePhoto'][0].path;

    const user = await User.findOneAndUpdate({ email }, updateData, { new: true });
    
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// 3. Login (UPDATED: Session Cookie Logic)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      // Create a token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });
      
      // Set as a Session Cookie (No maxAge means it expires when the tab/browser closes)
      res.cookie('token', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
        sameSite: 'strict'
      });

      return res.status(200).json({ message: "Login successful", redirect: '/dashboard.html' });
    }
    res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

// 4. Admin Routes
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

app.post('/api/admin/update-status', async (req, res) => {
  try {
    const { email, status } = req.body;
    await User.findOneAndUpdate({ email }, { status, isVerified: status === 'Accepted' });
    res.json({ message: `User marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
});

// --- FORCED ENTRANCE ROUTE (UPDATED) ---
// Now points to login.html as the primary page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => console.log(`✓ Server live on port ${PORT}`));
