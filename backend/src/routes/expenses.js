const express = require("express");
const Expense = require("../models/Expense");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const { type, from, to } = req.query;
    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch expenses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { amount, category, description, date, type } = req.body;
    if (amount == null || !category) {
      return res.status(400).json({ message: "Amount and category required" });
    }
    const expense = await Expense.create({
      userId: req.user._id,
      amount: Number(amount),
      category: String(category).trim(),
      description: description ? String(description).trim() : undefined,
      date: date ? new Date(date) : new Date(),
      type: type === "monthly" ? "monthly" : "daily",
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to add expense" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { userId: req.user._id };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const summary = await Expense.aggregate([
      { $match: match },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);
    const total = summary.reduce((s, i) => s + i.total, 0);
    res.json({ byCategory: summary, total });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to get summary" });
  }
});

router.get("/monthly", async (req, res) => {
  try {
    const { year } = req.query;
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const result = await Expense.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $match: { "_id.year": y } },
      { $sort: { "_id.month": 1 } },
    ]);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to get monthly report" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete" });
  }
});

module.exports = router;
