const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name || undefined,
    });
    const token = signToken(user._id);
    res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken(user._id);
    res.json({
      user: { id: user._id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Login failed" });
  }
});

module.exports = router;
