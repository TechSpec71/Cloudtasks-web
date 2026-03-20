require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let otps = {};

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ CloudTasks Database Connected!'))
    .catch(err => console.error('❌ Database Connection Error:', err));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure:false, // true for 465, false for 587
    auth: {
        user: 'ritawamaa7@gmail.com',
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

    const mailOptions = {
        from: '"CloudTasks" <ritawamaa7@gmail.com>',
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${otp}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`--- ✅ SUCCESS: OTP sent to ${email} ---`);
        res.status(200).send({ message: 'OTP sent' });
    } catch (error) {
        console.error("--- ❌ Gmail Error:", error.message);
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
