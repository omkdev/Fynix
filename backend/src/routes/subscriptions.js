const express = require("express");
const { prisma } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/subscriptions
router.get("/", async (req, res) => {
  try {
    // Note: Prisma schema (Supabase) does not have a Subscription model yet.
    // For now return empty array — this can be extended when the schema is updated.
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch subscriptions" });
  }
});

// POST /api/subscriptions
router.post("/", async (req, res) => {
  try {
    const { name, amount, cycle, nextBillingDate, reminderDaysBefore } = req.body;
    if (!name || amount == null || !nextBillingDate) {
      return res.status(400).json({ message: "Name, amount and nextBillingDate required" });
    }
    // Placeholder — extend Prisma schema to add Subscription table to Supabase
    res.status(201).json({
      message: "Subscription model not yet migrated to Supabase. Coming soon.",
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to add subscription" });
  }
});

// PATCH /api/subscriptions/:id
router.patch("/:id", async (req, res) => {
  res.status(501).json({ message: "Not yet implemented for Supabase." });
});

// DELETE /api/subscriptions/:id
router.delete("/:id", async (req, res) => {
  res.status(501).json({ message: "Not yet implemented for Supabase." });
});

module.exports = router;
