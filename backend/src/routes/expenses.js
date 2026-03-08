const express = require("express");
const { prisma } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/expenses
router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { userId: req.user.id };
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }
    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { occurredAt: "desc" },
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch expenses" });
  }
});

// POST /api/expenses
router.post("/", async (req, res) => {
  try {
    const { amount, category, description, date, merchant, paymentMethod } = req.body;
    if (amount == null || !category) {
      return res.status(400).json({ message: "Amount and category required" });
    }
    const expense = await prisma.expense.create({
      data: {
        userId: req.user.id,
        amount: Number(amount),
        category: String(category).trim(),
        description: description ? String(description).trim() : null,
        merchant: merchant ? String(merchant).trim() : null,
        paymentMethod: paymentMethod ? String(paymentMethod).trim() : null,
        occurredAt: date ? new Date(date) : new Date(),
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to add expense" });
  }
});

// GET /api/expenses/summary
router.get("/summary", async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { userId: req.user.id };
    if (from || to) {
      where.occurredAt = {};
      if (from) where.occurredAt.gte = new Date(from);
      if (to) where.occurredAt.lte = new Date(to);
    }

    const grouped = await prisma.expense.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });

    const total = grouped.reduce((s, i) => s + Number(i._sum.amount || 0), 0);
    const byCategory = grouped.map((i) => ({
      _id: i.category,
      total: Number(i._sum.amount || 0),
      count: i._count,
    }));

    res.json({ byCategory, total });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to get summary" });
  }
});

// GET /api/expenses/monthly
router.get("/monthly", async (req, res) => {
  try {
    const { year } = req.query;
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y + 1, 0, 1));

    const expenses = await prisma.expense.findMany({
      where: {
        userId: req.user.id,
        occurredAt: { gte: start, lt: end },
      },
      select: { amount: true, occurredAt: true },
    });

    // Group by month in JS
    const monthMap = {};
    for (const e of expenses) {
      const month = new Date(e.occurredAt).getMonth() + 1;
      if (!monthMap[month]) monthMap[month] = { total: 0, count: 0 };
      monthMap[month].total += Number(e.amount);
      monthMap[month].count += 1;
    }

    const result = Object.entries(monthMap)
      .map(([month, data]) => ({ _id: { month: Number(month), year: y }, ...data }))
      .sort((a, b) => a._id.month - b._id.month);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to get monthly report" });
  }
});

// DELETE /api/expenses/:id
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: "Expense not found" });

    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete" });
  }
});

module.exports = router;
