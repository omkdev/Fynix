const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ["daily", "monthly"], default: "daily" },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, type: 1 });
module.exports = mongoose.model("Expense", expenseSchema);
