const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();
const nodemailer = require('nodemailer');

const app = express();
// Middlewares
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'secureSecret123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));


// DB connection
mongoose.connect('mongodb://127.0.0.1:27017/myapp')
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// User Schema
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  registeredAt: Date,
  isAdmin: { type: Boolean, default: false }
}));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '',       // replace with your Gmail
    pass: ''         // use an App Password (NOT your real Gmail password)
  }
});

// Book Schema
const Book = mongoose.model('Book', new mongoose.Schema({
  title: String,
  author: String,
  price: Number,
  category: String,
  cover: String
}));

// Admin-protected CRUD endpoints for books
function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

// Create a new book
app.post('/api/books', requireAdmin, async (req, res) => {
  try {
    const { title, author, price, category, cover } = req.body;
    const book = new Book({ title, author, price, category, cover });
    await book.save();
    res.json({ success: true, book });
  } catch (err) {
    console.log(err); // Add this line
    res.status(400).json({ success: false, message: 'Failed to create book' });
  }
});

// Update a book
app.put('/api/books/:id', requireAdmin, async (req, res) => {
  try {
    const { title, author, price, category, cover } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, price, category, cover },
      { new: true }
    );
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true, book });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to update book' });
  }
});

// Delete a book
app.delete('/api/books/:id', requireAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: 'Failed to delete book' });
  }
});

// Fetch all books
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json({ success: true, books });
  } catch (err) {
    res.json({ success: false, message: "Failed to fetch books." });
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, message: "Invalid email or password" });

  req.session.user = { username: user.username, email: user.email };
  res.json({ success: true });
});

// Register API
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || username.length < 3) {
    return res.json({ success: false, message: "Username must be at least 3 characters." });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) return res.json({ success: false, message: "Email already exists." });

  const existingUsername = await User.findOne({ username });
  if (existingUsername) return res.json({ success: false, message: "Username already taken." });

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    registeredAt: new Date(),
  });

  await newUser.save();
  res.json({ success: true });
});

const crypto = require('crypto');
const otpStore = {}; // in-memory store { email: { otp, expiry } }

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ success: false, message: "Email not registered." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = {
    otp,
    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
  };

  const mailOptions = {
    from: 'shoaib232002@gmail.com',
    to: email,
    subject: 'Password Reset OTP - MyApp',
    html: `
      <p>Hi ${user.username},</p>
      <p>Your OTP for password reset is:</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 5 minutes.</p>
      <p>— MyApp Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.json({ success: false, message: "Failed to send OTP. Please try again later." });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Check if OTP exists for this email
  const record = otpStore[email];
  if (!record) {
    return res.json({ success: false, message: "No OTP request found for this email." });
  }

  // Check OTP validity and expiry
  if (record.otp !== otp) {
    return res.json({ success: false, message: "Invalid OTP." });
  }

  if (Date.now() > record.expiry) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired." });
  }

  // All good — Hash new password and update
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { password: hashedPassword });

  // Clean up the OTP
  delete otpStore[email];

  return res.json({ success: true, message: "Password reset successful. You can now log in." });
});

// Profile API (protected)
app.get('/api/profile', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false });
  }
  res.json({ success: true, user: req.session.user });
});

// Logout API
app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET Opening Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'opening.html'));
});

// GET Login Page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

//Get admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// GET Register Page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// GET Forgot Password Page
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

// GET Landing Page (Protected)
app.get('/landing', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Admin Login API
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, isAdmin: true });
  if (!user) return res.json({ success: false, message: "Invalid admin credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, message: "Invalid admin credentials" });

  req.session.user = { username: user.username, email: user.email };
  req.session.admin = true;
  res.json({ success: true });
});

// Protect admin dashboard
app.get('/admin-dashboard.html', (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin-login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Ensure admin user exists
(async () => {
  const adminEmail = 'AdminBookStores@gmail.com';
  const adminPassword = 'Admin@789';
  const existingAdmin = await User.findOne({ email: adminEmail, isAdmin: true });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      username: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      registeredAt: new Date(),
      isAdmin: true
    });
    
  } 
})();

// Contact form API
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.json({ success: false, message: 'Please fill all required fields.' });
  }
  const mailOptions = {
    from: email, // user's email as sender
    to: 'shoaib232002@gmail.com',   // replace with your admin/receiver email
    subject: `Contact Form: ${subject || 'No Subject'}`,
    html: `<p><strong>Name:</strong> ${name}</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Subject:</strong> ${subject}</p>
           <p><strong>Message:</strong></p>
           <p>${message}</p>`
  };
  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    console.log('Contact form mail error:', err);
    res.json({ success: false, message: 'Failed to send message. Please try again later.' });
  }
});

// Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
