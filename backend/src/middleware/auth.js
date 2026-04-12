const jwt = require("jsonwebtoken");
const { prisma } = require("../db");
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = require("../config/secrets");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (payload.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function signAccessToken(userId) {
  return jwt.sign({ userId, type: "access" }, ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
}

function signRefreshToken(userId) {
  return jwt.sign({ userId, type: "refresh" }, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
}

module.exports = {
  authMiddleware,
  signAccessToken,
  signRefreshToken,
};
