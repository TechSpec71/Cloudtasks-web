require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 10000;

// 1. START THE SERVER IMMEDIATELY (Fixes Render connection error)
app.listen(PORT, () => {
  console.log(`✓ Server is live on port ${PORT}`);
});

app.use(express.json());
app.use(express.static(__dirname));

let otps = {};

// 2. CONNECT TO DATABASE IN BACKGROUND
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.error('✕ MongoDB Error:', err));

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendOTP(email, otp) {
  const msg = {
    to: email,
    from: 'ritawamaa71@gmail.com', 
    subject: 'CloudTasks - Your Verification Code',
    text: `Your verification code is: ${otp}`,
    html: `<strong>Your OTP code is: ${otp}</strong>`,
  };
  await sgMail.send(msg);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = otp;
    await sendOTP(email, otp);
    res.status(200).json({ message: "OTP sent!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Email failed" });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    res.status(200).json({ message: "Success" });
  } else {
    res.status(400).json({ message: "Invalid OTP" });
  }
});
