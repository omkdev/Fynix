const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { prisma } = require("../db");
const { signAccessToken, signRefreshToken, authMiddleware } = require("../middleware/auth");
const { REFRESH_TOKEN_SECRET } = require("../config/secrets");

const router = express.Router();

const REFRESH_COOKIE = "fynix_refresh";
const REFRESH_COOKIE_PATH = "/api/auth";
const REFRESH_MAX_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_MAX_MS,
    path: REFRESH_COOKIE_PATH,
  };
}

async function issueSession(res, userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const expiresAt = new Date(Date.now() + REFRESH_MAX_MS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId, expiresAt },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        name: name ? String(name).trim() : null,
      },
    });

    const accessToken = await issueSession(res, user.id);
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ message: "This account uses Google sign-in." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = await issueSession(res, user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Login failed" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    if (payload.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const stored = await prisma.refreshToken.findFirst({
      where: { token: refreshToken, userId: payload.userId },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const newAccessToken = signAccessToken(payload.userId);
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE];
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.clearCookie(REFRESH_COOKIE, {
    path: REFRESH_COOKIE_PATH,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out" });
});

// POST /api/auth/google — Google Identity Services (credential JWT)
router.post("/google", async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ message: "Google sign-in is not configured." });
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    const oAuthClient = new OAuth2Client(clientId);
    const ticket = await oAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Google did not return an email." });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ message: "Google email is not verified." });
    }

    const email = String(payload.email).trim().toLowerCase();
    const name = payload.name ? String(payload.name).trim() : null;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, name, passwordHash: null },
      });
    }

    const accessToken = await issueSession(res, user.id);
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ message: "Google sign-in failed. Try again." });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, email: u.email, name: u.name } });
});

module.exports = router;
