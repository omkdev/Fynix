const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "fynix-dev-secret-change-in-production";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    User.findById(decoded.userId)
      .then((user) => {
        if (!user) return res.status(401).json({ message: "User not found" });
        req.user = user;
        next();
      })
      .catch(() => res.status(500).json({ message: "Auth failed" }));
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function signToken(userId) {
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
