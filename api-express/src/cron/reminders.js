const cron = require("node-cron");
const Subscription = require("../models/Subscription");
const { sendReminderEmail } = require("../services/email");

// Run every day at 9:00 AM
cron.schedule("0 9 * * *", async () => {
  try {
    const subs = await Subscription.find({
      isActive: true,
      nextBillingDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    })
      .populate("userId", "email name")
      .lean();

    for (const sub of subs) {
      const user = sub.userId;
      if (!user || !user.email) continue;
      const daysLeft = Math.ceil(
        (new Date(sub.nextBillingDate) - new Date()) / (24 * 60 * 60 * 1000)
      );
      if (daysLeft > sub.reminderDaysBefore) continue;

      const subject = `Reminder: ${sub.name} renews in ${daysLeft} day(s)`;
      const text = `Hi${user.name ? ` ${user.name}` : ""},\n\nYour subscription "${sub.name}" (₹${sub.amount}/${sub.cycle}) is due on ${new Date(sub.nextBillingDate).toLocaleDateString()}.\n\n— Fynix`;
      await sendReminderEmail(user.email, subject, text);
    }
  } catch (err) {
    console.error("Cron subscription reminders error:", err);
  }
});

console.log("Cron: subscription reminders scheduled (daily 9:00 AM)");
