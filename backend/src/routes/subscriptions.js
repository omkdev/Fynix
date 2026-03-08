const express = require("express");
const Subscription = require("../models/Subscription");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const subs = await Subscription.find({ userId: req.user._id, isActive: true })
      .sort({ nextBillingDate: 1 })
      .lean();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch subscriptions" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, amount, cycle, nextBillingDate, reminderDaysBefore } = req.body;
    if (!name || amount == null || !nextBillingDate) {
      return res.status(400).json({ message: "Name, amount and nextBillingDate required" });
    }
    const sub = await Subscription.create({
      userId: req.user._id,
      name: String(name).trim(),
      amount: Number(amount),
      cycle: cycle === "yearly" ? "yearly" : "monthly",
      nextBillingDate: new Date(nextBillingDate),
      reminderDaysBefore: reminderDaysBefore != null ? Number(reminderDaysBefore) : 3,
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to add subscription" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["name", "amount", "cycle", "nextBillingDate", "reminderDaysBefore", "isActive"];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    if (update.nextBillingDate) update.nextBillingDate = new Date(update.nextBillingDate);
    const sub = await Subscription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      update,
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const sub = await Subscription.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!sub) return res.status(404).json({ message: "Subscription not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete" });
  }
});

module.exports = router;
