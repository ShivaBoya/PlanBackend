const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const auth = require("../middleware/authMiddleware");

// @desc    Get current user (Auto-Login)
// @route   GET /me
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Mail Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// @desc    Register new user
// @route   POST /register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please include all fields" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      // Set Cookie
      const token = generateToken(user._id);
      res.cookie("jwt", token, {
        httpOnly: true,
        secure: true, // Always true for cross-site
        sameSite: "none", // Required for cross-site
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Login user
// @route   POST /login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user email
    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);

      res.cookie("jwt", token, {
        httpOnly: true,
        secure: true, // Always true for cross-site
        sameSite: "none", // Required for cross-site
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Logout user
// @route   POST /logout
router.post("/logout", (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out" });
});

// --------------------------------------------------------------------------
// FORGOT PASSWORD FLOW
// --------------------------------------------------------------------------

// @desc    Send Reset OTP
// @route   POST /forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB (expires in 10 mins)
    user.resetOtp = otp;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send Mail
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "PlanMyOutings Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}\n\nIt expires in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Mail Error:", err);
        return res.status(500).json({ message: "Failed to send email" });
      }
      console.log("OTP Sent:", otp); // For Dev Debugging
      res.json({ message: "OTP sent to email" });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Verify OTP
// @route   POST /verify-otp
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpire: { $gt: Date.now() }
    }).select("+resetOtp +resetOtpExpire");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP Verified" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc   Reset Password
// @route  POST /reset-password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpire: { $gt: Date.now() }
    }).select("+resetOtp +resetOtpExpire");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
