'use strict';

const { Module } = require('@nestjs/common');
const { CommonModule } = require('./common/common.module');
const { AuthModule } = require('./auth/auth.module');
const { UsersModule } = require('./users/users.module');
const { ExpensesModule } = require('./expenses/expenses.module');
const { SubscriptionsModule } = require('./subscriptions/subscriptions.module');
const { AiModule } = require('./ai/ai.module');
const { AnalyticsModule } = require('./analytics/analytics.module');
const { NotificationsModule } = require('./notifications/notifications.module');
const { EventsModule } = require('./events/events.module');

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    ExpensesModule,
    SubscriptionsModule,
    AiModule,
    AnalyticsModule,
    NotificationsModule,
    EventsModule,
  ],
})
class AppModule {}

module.exports = { AppModule };
