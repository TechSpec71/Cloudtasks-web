<<<<<<< HEAD
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // This is the missing "light switch"
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let otps = {};
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ CloudTasks Database Connected!'))
  .catch(err => console.error('❌ Database Connection Error:', err));

// UPDATED: Using Port 465 which is often more stable on Render's network
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Must be true for port 465
    auth: {
        user: 'ritawamaa71@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = otp;

    console.log(`--- 📬 Trying Port 465 for ${email} ---`);

    const mailOptions = {
        from: '"CloudTasks" <ritawamaa71@gmail.com>',
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("--- ✅ SUCCESS: Port 465 Worked! ---");
        res.status(200).send({ message: 'OTP sent' });
    } catch (error) {
        console.error("--- ❌ Gmail Error:", error.message);
        res.status(500).send({ message: 'Email failed' });
    }
});

app.post('/api/register', (req, res) => {
    const { email, otp, profileData } = req.body;
    if (otps[email] === otp) {
        delete otps[email]; 
        res.status(200).send({ message: 'Registration successful' });
    } else {
        res.status(400).send({ message: 'Invalid OTP' });
    }
});
image.png
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
3
=======
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let otps = {};

// 🚀 Professional SendGrid Configuration (Bypasses Render Block)
const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 2525,
    secure: false,
    auth: {
        user: 'apikey', 
        pass: process.env.SENDGRID_API_KEY // 👈 This tells the code to look on Render for the key
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = otp;

    console.log(`--- 📬 Sending OTP ${otp} via SendGrid to ${email} ---`);

    const mailOptions = {
    from: '"CloudTasks Security" <ritawamaa71@gmail.com>', // Friendly name + Verified email
    to: email,
    subject: '🔑 Your CloudTasks Verification Code', // Emoji + Clear purpose
    text: `Your verification code is: ${otp}`, // Plain text backup
    html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #4A3AFF; text-align: center;">CloudTasks</h2>
            <p>Hello,</p>
            <p>To finish securing your account, please use the 6-digit verification code below:</p>
            <div style="background: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
                ${otp}
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 20px;">
                If you did not request this, please ignore this email. This code will expire in 10 minutes.
            </p>
        </div>
    `
};

    try {
        await transporter.sendMail(mailOptions);
        console.log("--- ✅ SUCCESS: SendGrid delivered the code! ---");
        res.status(200).send({ message: 'OTP sent' });
    } catch (error) {
        console.error("--- ❌ SendGrid Error:", error.message);
        res.status(500).send({ message: 'Email failed' });
    }
});

app.post('/api/register', (req, res) => {
    const { email, otp } = req.body;
    if (otps[email] === otp) {
        delete otps[email]; 
        res.status(200).send({ message: 'Registration successful' });
    } else {
        res.status(400).send({ message: 'Invalid OTP' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
>>>>>>> 1fa4e9e265fa4fc73e3fd15b28fc4d058b184fd9
