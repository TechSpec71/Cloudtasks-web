require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const sgMail = require('@sendgrid/mail');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(__dirname));

let otps = {};

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ CloudTasks Database Connected!'))
  .catch(err => console.error('✕ Database Connection Error:', err));

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendOTP(email, otp) {
  const msg = {
    to: email,
    from: 'ritawamaa71@gmail.com', // Must match your Verified Sender
    subject: 'CloudTasks - Your Verification Code',
    text: `Your verification code is: ${otp}`,
    html: `<strong>Your OTP code is: ${otp}</strong>`,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent via SendGrid!");
  } catch (error) {
    console.error("SendGrid Error:", error.response ? error.response.body : error.message);
    throw new Error("Email failed");
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps[email] = otp;

  try {
    await sendOTP(email, otp);
    res.status(200).json({ message: "OTP sent!" });
  } catch (error) {
    res.status(500).json({ message: "Email failed" });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (otps[email] === otp) {
    delete otps[email];
    res.status(200).json({ message: "Registration successful" });
  } else {
    res.status(400).json({ message: "Invalid OTP" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
