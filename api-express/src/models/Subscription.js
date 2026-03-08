const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    cycle: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
    nextBillingDate: { type: Date, required: true },
    reminderDaysBefore: { type: Number, default: 3 },
    isActive: { type: Boolean, default: true },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, nextBillingDate: 1 });
module.exports = mongoose.model("Subscription", subscriptionSchema);
