'use strict';

require('reflect-metadata');

const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const { NestFactory } = require('@nestjs/core');
const { PrismaClient } = require('@prisma/client');
const { AppModule } = require('./app.module');
const { AuthService } = require('./auth/auth.service');

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_CONTACT_RATE_LIMIT_MAX_REQUESTS = 5;
const contactRateLimitStore = new Map();
const prisma = new PrismaClient();
const EXPENSE_CATEGORIES = [
  'Food',
  'Dining',
  'Coffee',
  'Groceries',
  'Rent',
  'Home',
  'Utilities',
  'Bills',
  'Internet',
  'Mobile',
  'Transport',
  'Fuel',
  'Parking',
  'Travel',
  'Subscription',
  'Insurance',
  'Health',
  'Pharmacy',
  'Education',
  'Shopping',
  'Beauty',
  'Personal Care',
  'Fitness',
  'Entertainment',
  'Family',
  'Childcare',
  'Pets',
  'EMI',
  'Loan',
  'Tax',
  'Investment',
  'Charity',
  'Gifts',
  'Misc',
  'Uncategorized',
];
const CATEGORIZATION_MODE = (process.env.CATEGORIZATION_MODE || 'rules_plus_openai')
  .trim()
  .toLowerCase();

function setAuthCookies(response, authPayload) {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookie('access_token', authPayload.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  response.cookie('refresh_token', authPayload.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

function clearAuthCookies(response) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };
  response.clearCookie('access_token', cookieOptions);
  response.clearCookie('refresh_token', cookieOptions);
}

function sanitizeAuthResponse(authPayload) {
  return {
    user: authPayload.user,
    tokenType: authPayload.tokenType,
  };
}

function extractRequestMeta(request) {
  const forwarded = request.headers?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : null;

  return {
    ipAddress:
      forwardedIp ||
      request.ip ||
      request.socket?.remoteAddress ||
      null,
    userAgent: request.headers?.['user-agent'] || null,
  };
}

function getCookieValue(request, name) {
  const cookieHeader = request.headers?.cookie;
  if (!cookieHeader) return null;

  const cookieParts = cookieHeader.split(';');
  for (const part of cookieParts) {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (rawKey !== name) continue;
    return decodeURIComponent(rawValueParts.join('='));
  }
  return null;
}

function verifyAdminKey(request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    throw new Error('ADMIN_API_KEY is not configured.');
  }
  const providedKey = request.headers?.['x-admin-key'];
  if (providedKey !== configuredKey) {
    return false;
  }
  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

function sanitizePlainText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function toBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function maskIpAddress(ipAddress) {
  if (!ipAddress || typeof ipAddress !== 'string') return null;
  const normalized = ipAddress.trim();
  if (!normalized) return null;

  // IPv6 localhost / loopback and IPv4 localhost should stay readable.
  if (normalized === '::1' || normalized === '127.0.0.1') {
    return normalized;
  }

  if (normalized.includes(':')) {
    const parts = normalized.split(':').filter(Boolean);
    if (!parts.length) return 'ipv6:*';
    return `${parts.slice(0, 3).join(':')}:*`;
  }

  const parts = normalized.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  return `${normalized.slice(0, 8)}*`;
}

function hashValue(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isContactRateLimited(requestKey) {
  const windowMs = Number(
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS || DEFAULT_CONTACT_RATE_LIMIT_WINDOW_MS,
  );
  const maxRequests = Number(
    process.env.CONTACT_RATE_LIMIT_MAX_REQUESTS || DEFAULT_CONTACT_RATE_LIMIT_MAX_REQUESTS,
  );
  const now = Date.now();
  const fromTime = now - windowMs;

  // Opportunistic cleanup for stale records.
  for (const [key, timestamps] of contactRateLimitStore.entries()) {
    const activeTimestamps = timestamps.filter((timestamp) => timestamp >= fromTime);
    if (!activeTimestamps.length) {
      contactRateLimitStore.delete(key);
      continue;
    }
    contactRateLimitStore.set(key, activeTimestamps);
  }

  const existing = contactRateLimitStore.get(requestKey) || [];
  const active = existing.filter((timestamp) => timestamp >= fromTime);
  if (active.length >= maxRequests) {
    contactRateLimitStore.set(requestKey, active);
    return true;
  }

  active.push(now);
  contactRateLimitStore.set(requestKey, active);
  return false;
}

async function sendContactEmail({ name, email, subject, message, requestMeta, submissionId }) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const recipientEmail = process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

  if (!smtpHost || !smtpUser || !smtpPass || !recipientEmail || !fromEmail) {
    throw new Error('Contact email service is not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const escapedMessage = message
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br />');
  const escapedName = name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const escapedEmail = email.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const escapedSubject = subject
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const ipAddress = requestMeta?.ipAddress || 'Unavailable';
  const userAgent = requestMeta?.userAgent || 'Unavailable';
  const includeRequestMeta = toBooleanEnv(process.env.CONTACT_INCLUDE_REQUEST_METADATA_IN_EMAIL, false);
  const requestMetaText = includeRequestMeta ? `\nIP: ${ipAddress}\nUser-Agent: ${userAgent}` : '';
  const requestMetaHtml = includeRequestMeta
    ? `<p><strong>IP:</strong> ${ipAddress}</p><p><strong>User-Agent:</strong> ${userAgent}</p>`
    : '';

  await transporter.sendMail({
    from: fromEmail,
    to: recipientEmail,
    replyTo: email,
    subject: `[Fynix Contact] ${subject}`,
    text: `New contact form submission\n\nSubmission ID: ${submissionId}\nName: ${name}\nEmail: ${email}\nSubject: ${subject}${requestMetaText}\n\nMessage:\n${message}`,
    html: `
      <h2>New contact form submission</h2>
      <p><strong>Submission ID:</strong> ${submissionId}</p>
      <p><strong>Name:</strong> ${escapedName}</p>
      <p><strong>Email:</strong> ${escapedEmail}</p>
      <p><strong>Subject:</strong> ${escapedSubject}</p>
      <p><strong>Message:</strong><br />${escapedMessage}</p>
      ${requestMetaHtml}
    `,
  });
}

function parseAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function normalizeCategory(category) {
  const normalized = sanitizePlainText(category, 60);
  if (!normalized) return '';

  const exact = EXPENSE_CATEGORIES.find(
    (item) => item.toLowerCase() === normalized.toLowerCase(),
  );
  return exact || normalized;
}

function normalizeMerchantText(value) {
  const normalized = sanitizePlainText(value, 200).toLowerCase();
  if (!normalized) return '';

  return normalized
    .replace(/[\.,\-_/\\]+/g, ' ')
    .replace(/\b(private|pvt|ltd|limited|india|inc|llp|co)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, (_, row) => [row]);
  for (let col = 0; col <= a.length; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row <= b.length; row += 1) {
    for (let col = 1; col <= a.length; col += 1) {
      const cost = a[col - 1] === b[row - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

function similarityScore(a, b) {
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 0.99;
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  if (!maxLength) return 0;
  return 1 - distance / maxLength;
}

function getMonthRange(monthInput) {
  const now = new Date();
  if (typeof monthInput === 'string' && /^\d{4}-\d{2}$/.test(monthInput.trim())) {
    const [year, month] = monthInput.trim().split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    return { start, end, key: `${year}-${String(month).padStart(2, '0')}` };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return { start, end, key };
}

function keywordCategoryInference({ description, merchant }) {
  const text = `${description || ''} ${merchant || ''}`.toLowerCase();
  if (!text) return null;

  const rules = [
    { category: 'Rent', keywords: ['rent', 'house rent', 'flat rent', 'landlord', 'lease'] },
    { category: 'EMI', keywords: ['emi', 'instalment', 'installment', 'monthly installment'] },
    { category: 'Loan', keywords: ['loan', 'repayment', 'personal loan', 'home loan', 'car loan'] },
    { category: 'Tax', keywords: ['tax', 'gst', 'income tax', 'tds', 'property tax'] },
    { category: 'Investment', keywords: ['sip', 'mutual fund', 'stock', 'demat', 'investment'] },
    { category: 'Insurance', keywords: ['insurance', 'premium', 'lic', 'health cover'] },
    { category: 'Utilities', keywords: ['electricity', 'water bill', 'gas bill', 'utility'] },
    { category: 'Internet', keywords: ['broadband', 'internet', 'wifi', 'fiber', 'jiofiber'] },
    { category: 'Mobile', keywords: ['mobile recharge', 'prepaid', 'postpaid', 'airtel', 'jio', 'vi'] },
    { category: 'Bills', keywords: ['bill payment', 'invoice payment', 'due payment'] },
    { category: 'Groceries', keywords: ['grocery', 'supermarket', 'bigbasket', 'dmart', 'blinkit', 'zepto'] },
    { category: 'Food', keywords: ['swiggy', 'zomato', 'food order', 'meal', 'lunch', 'dinner'] },
    { category: 'Dining', keywords: ['restaurant', 'dine', 'dining', 'eatery', 'cafe meal'] },
    { category: 'Coffee', keywords: ['coffee', 'starbucks', 'costa', 'barista'] },
    { category: 'Transport', keywords: ['uber', 'ola', 'metro', 'bus', 'train', 'taxi', 'auto'] },
    { category: 'Fuel', keywords: ['fuel', 'petrol', 'diesel', 'cng', 'gas station'] },
    { category: 'Parking', keywords: ['parking', 'toll', 'fastag'] },
    { category: 'Travel', keywords: ['flight', 'hotel', 'airbnb', 'trip', 'booking', 'makemytrip', 'goibibo'] },
    { category: 'Subscription', keywords: ['netflix', 'spotify', 'prime', 'subscription', 'youtube', 'hotstar'] },
    { category: 'Health', keywords: ['hospital', 'clinic', 'medicine', 'doctor', 'health check'] },
    { category: 'Pharmacy', keywords: ['pharmacy', 'apollo', 'medplus', 'chemist', 'drug store'] },
    { category: 'Education', keywords: ['course', 'tuition', 'school fee', 'college fee', 'udemy', 'coursera'] },
    { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'purchase'] },
    { category: 'Beauty', keywords: ['salon', 'spa', 'beauty', 'grooming', 'cosmetic'] },
    { category: 'Personal Care', keywords: ['toiletries', 'skincare', 'haircare', 'self care'] },
    { category: 'Fitness', keywords: ['gym', 'workout', 'fitness', 'yoga class'] },
    { category: 'Entertainment', keywords: ['movie', 'cinema', 'game', 'concert', 'ott'] },
    { category: 'Family', keywords: ['family', 'parents', 'household support'] },
    { category: 'Childcare', keywords: ['childcare', 'daycare', 'baby', 'kids class'] },
    { category: 'Pets', keywords: ['pet', 'dog food', 'cat food', 'veterinary', 'vet'] },
    { category: 'Charity', keywords: ['donation', 'charity', 'ngo', 'fundraiser'] },
    { category: 'Gifts', keywords: ['gift', 'present', 'birthday gift', 'anniversary gift'] },
    { category: 'Home', keywords: ['furniture', 'appliance', 'home decor', 'household item'] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return {
        category: rule.category,
        confidence: 0.82,
        reason: `Matched keyword rule for ${rule.category}.`,
      };
    }
  }

  return null;
}

async function findMerchantCategoryInference({ userId, merchant, description }) {
  const normalizedMerchant = normalizeMerchantText(merchant);
  const normalizedDescription = normalizeMerchantText(description);
  const candidates = [normalizedMerchant, normalizedDescription].filter(Boolean);
  if (!candidates.length) {
    return null;
  }

  try {
    const maps = await prisma.merchantCategoryMap.findMany({
      where: {
        isActive: true,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ confidenceScore: 'desc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    let bestMatch = null;
    for (const mapItem of maps) {
      const normalizedKeyword = normalizeMerchantText(mapItem.normalizedKeyword || mapItem.merchantKeyword);
      if (!normalizedKeyword) continue;

      for (const candidateText of candidates) {
        const score = similarityScore(candidateText, normalizedKeyword);
        const weightedScore = score * Number(mapItem.confidenceScore || 0.8);
        const minScore = Number(process.env.MERCHANT_MATCH_MIN_SCORE || 0.72);

        if (weightedScore < minScore) continue;
        if (!bestMatch || weightedScore > bestMatch.weightedScore) {
          bestMatch = {
            id: mapItem.id,
            category: normalizeCategory(mapItem.category) || 'Uncategorized',
            confidence: Math.min(0.99, weightedScore),
            weightedScore,
            source: mapItem.source || 'seed',
          };
        }
      }
    }

    if (!bestMatch) return null;

    await prisma.merchantCategoryMap.update({
      where: { id: bestMatch.id },
      data: {
        hitCount: { increment: 1 },
        lastMatchedAt: new Date(),
      },
    }).catch(() => null);

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      reason: `Matched merchant dictionary (${bestMatch.source}).`,
    };
  } catch (error) {
    // If migrations are not applied yet, this table may not exist.
    if (error?.code === 'P2021') {
      return null;
    }
    throw error;
  }
}

async function categorizeExpenseWithLocalModel({ amount, description, merchant, paymentMethod }) {
  const localCategorizerUrl = sanitizePlainText(process.env.LOCAL_CATEGORIZER_URL, 500);
  if (!localCategorizerUrl) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(localCategorizerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text: `${description || ''} ${merchant || ''}`.trim(),
        amount,
        paymentMethod: paymentMethod || null,
        categories: EXPENSE_CATEGORIES,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return null;

    const category = normalizeCategory(payload?.category);
    if (!category) return null;

    return {
      category,
      confidence: Number(payload?.confidence) || 0.7,
      reason: sanitizePlainText(payload?.reason, 120) || 'Categorized via local model.',
    };
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function categorizeExpenseWithAI({ amount, description, merchant, paymentMethod }) {
  const fallback = keywordCategoryInference({ description, merchant });
  if (fallback) return fallback;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      category: 'Uncategorized',
      confidence: 0.2,
      reason: 'OPENAI_API_KEY is not configured; applied fallback category.',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You categorize personal expenses into one category from this list: ${EXPENSE_CATEGORIES.join(', ')}.
Return JSON only with keys: category (string), confidence (number 0..1), reason (string max 120 chars).`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              amount,
              description: description || null,
              merchant: merchant || null,
              paymentMethod: paymentMethod || null,
            }),
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        category: 'Uncategorized',
        confidence: 0.2,
        reason: payload?.error?.message || 'AI request failed; fallback category applied.',
      };
    }

    const content = payload?.choices?.[0]?.message?.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : {};
    const normalizedCategory = normalizeCategory(parsed?.category);
    return {
      category: normalizedCategory || 'Uncategorized',
      confidence: Number(parsed?.confidence) || 0.5,
      reason: sanitizePlainText(parsed?.reason, 120) || 'Categorized by AI.',
    };
  } catch (error) {
    return {
      category: 'Uncategorized',
      confidence: 0.2,
      reason: 'AI timeout/error; fallback category applied.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function categorizeExpense({
  userId,
  amount,
  description,
  merchant,
  paymentMethod,
}) {
  const merchantMap = await findMerchantCategoryInference({
    userId,
    merchant,
    description,
  });
  if (merchantMap) {
    return merchantMap;
  }

  const fallback = keywordCategoryInference({ description, merchant });
  if (fallback) {
    return fallback;
  }

  if (CATEGORIZATION_MODE === 'rules_only') {
    return {
      category: 'Uncategorized',
      confidence: 0.2,
      reason: 'No rules matched.',
    };
  }

  if (CATEGORIZATION_MODE === 'rules_plus_local') {
    const localResult = await categorizeExpenseWithLocalModel({
      amount,
      description,
      merchant,
      paymentMethod,
    });
    if (localResult) return localResult;
    return {
      category: 'Uncategorized',
      confidence: 0.2,
      reason: 'No rules/local model match.',
    };
  }

  if (CATEGORIZATION_MODE === 'rules_plus_local_then_openai') {
    const localResult = await categorizeExpenseWithLocalModel({
      amount,
      description,
      merchant,
      paymentMethod,
    });
    if (localResult) return localResult;
  }

  return categorizeExpenseWithAI({
    amount,
    description,
    merchant,
    paymentMethod,
  });
}

async function resolveSessionUser({ request, response, authService }) {
  try {
    const accessToken = getCookieValue(request, 'access_token');
    return await authService.getSessionUser(accessToken);
  } catch (_accessError) {
    const refreshToken = getCookieValue(request, 'refresh_token');
    const refreshed = await authService.refreshSession(refreshToken);
    setAuthCookies(response, refreshed);
    return refreshed.user;
  }
}

async function buildExpenseSummary({ userId, monthStart, monthEnd }) {
  const [totals, grouped, count] = await Promise.all([
    prisma.expense.aggregate({
      where: {
        userId,
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: {
        userId,
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
    }),
    prisma.expense.count({
      where: {
        userId,
        occurredAt: { gte: monthStart, lt: monthEnd },
      },
    }),
  ]);

  const monthlyTotal = Number(totals?._sum?.amount || 0);
  const categoryData = grouped.map((item) => ({
    name: item.category || 'Uncategorized',
    value: Number(item?._sum?.amount || 0),
  }));

  return { monthlyTotal, categoryData, expenseCount: count };
}

async function learnMerchantMappingFromCorrection({
  userId,
  merchant,
  description,
  oldCategory,
  newCategory,
  expenseId,
}) {
  const normalizedMerchant = normalizeMerchantText(merchant);
  if (!normalizedMerchant) return;

  try {
    await prisma.categoryCorrection.create({
      data: {
        userId,
        expenseId,
        merchant: merchant || null,
        description: description || null,
        oldCategory: oldCategory || 'Uncategorized',
        newCategory,
      },
    });

    const existing = await prisma.merchantCategoryMap.findFirst({
      where: {
        userId,
        normalizedKeyword: normalizedMerchant,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      await prisma.merchantCategoryMap.update({
        where: { id: existing.id },
        data: {
          merchantKeyword: merchant || normalizedMerchant,
          category: newCategory,
          confidenceScore: Math.max(Number(existing.confidenceScore || 0.8), 0.95),
          source: 'user_correction',
          isActive: true,
        },
      });
      return;
    }

    await prisma.merchantCategoryMap.create({
      data: {
        userId,
        merchantKeyword: merchant || normalizedMerchant,
        normalizedKeyword: normalizedMerchant,
        category: newCategory,
        confidenceScore: 0.95,
        source: 'user_correction',
        hitCount: 0,
        isActive: true,
      },
    });
  } catch (error) {
    if (error?.code === 'P2021') {
      return;
    }
    throw error;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  const authService = new AuthService();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  const server = app.getHttpAdapter().getInstance();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

  server.post('/contact', async (request, response) => {
    try {
      const requestMeta = extractRequestMeta(request);
      const name = sanitizePlainText(request.body?.name, 120);
      const email = sanitizePlainText(request.body?.email, 200).toLowerCase();
      const subject = sanitizePlainText(request.body?.subject, 180);
      const message = sanitizePlainText(request.body?.message, 4000);
      const honeypot = sanitizePlainText(request.body?.website, 255);
      const consentGiven = request.body?.consent === true || request.body?.consent === 'true';

      if (honeypot) {
        // Quietly accept to avoid signaling spam detection behavior.
        return response.status(200).json({ success: true, message: 'Message sent successfully.' });
      }

      if (!name || !email || !subject || !message) {
        return response.status(400).json({ message: 'Name, email, subject, and message are required.' });
      }

      if (!isValidEmail(email)) {
        return response.status(400).json({ message: 'Please provide a valid email address.' });
      }

      if (!consentGiven) {
        return response.status(400).json({ message: 'Please provide consent before submitting.' });
      }

      const rateLimitKey = requestMeta?.ipAddress || email;
      if (isContactRateLimited(rateLimitKey)) {
        return response.status(429).json({
          message: 'Too many contact requests. Please wait a few minutes and try again.',
        });
      }

      const createdSubmission = await prisma.contactSubmission.create({
        data: {
          name,
          email,
          subject,
          message,
          status: 'NEW',
          consentGiven,
          ipAddressHash: hashValue(requestMeta?.ipAddress),
          ipAddressMasked: maskIpAddress(requestMeta?.ipAddress),
          userAgent: sanitizePlainText(requestMeta?.userAgent, 512) || null,
        },
        select: { id: true },
      });

      try {
        await sendContactEmail({
          name,
          email,
          subject,
          message,
          requestMeta,
          submissionId: createdSubmission.id,
        });

        await prisma.contactSubmission.update({
          where: { id: createdSubmission.id },
          data: { status: 'EMAILED' },
        });
      } catch (emailError) {
        await prisma.contactSubmission.update({
          where: { id: createdSubmission.id },
          data: { status: 'EMAIL_FAILED' },
        });
        throw emailError;
      }

      return response.status(200).json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
      if (error?.code === 'P2021') {
        return response.status(500).json({
          message: 'Contact storage is not ready. Run Prisma migration and retry.',
        });
      }
      const message = error?.message || 'Failed to send contact message.';
      return response.status(500).json({ message });
    }
  });

  server.get('/expenses', async (request, response) => {
    try {
      const sessionUser = await resolveSessionUser({ request, response, authService });
      const queryFrom = request.query?.from;
      const queryTo = request.query?.to;
      const queryCategory = normalizeCategory(request.query?.category);
      const limit = Math.min(Math.max(Number(request.query?.limit) || 50, 1), 200);

      const dateFilter = {};
      if (queryFrom) {
        const parsed = new Date(queryFrom);
        if (Number.isNaN(parsed.getTime())) {
          return response.status(400).json({ message: 'Invalid "from" date format.' });
        }
        dateFilter.gte = parsed;
      }
      if (queryTo) {
        const parsed = new Date(queryTo);
        if (Number.isNaN(parsed.getTime())) {
          return response.status(400).json({ message: 'Invalid "to" date format.' });
        }
        dateFilter.lte = parsed;
      }

      const expenses = await prisma.expense.findMany({
        where: {
          userId: sessionUser.id,
          ...(queryCategory ? { category: queryCategory } : {}),
          ...(Object.keys(dateFilter).length ? { occurredAt: dateFilter } : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
      });

      return response.status(200).json({
        expenses: expenses.map((expense) => ({
          ...expense,
          amount: Number(expense.amount || 0),
        })),
      });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('refresh') || error?.message?.toLowerCase().includes('session')) {
        clearAuthCookies(response);
        return response.status(401).json({ message: 'Not authenticated.' });
      }
      const message = error?.message || 'Failed to fetch expenses.';
      return response.status(500).json({ message });
    }
  });

  server.get('/expenses/summary', async (request, response) => {
    try {
      const sessionUser = await resolveSessionUser({ request, response, authService });
      const { start, end, key } = getMonthRange(request.query?.month);
      const summary = await buildExpenseSummary({
        userId: sessionUser.id,
        monthStart: start,
        monthEnd: end,
      });

      return response.status(200).json({
        month: key,
        ...summary,
      });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('refresh') || error?.message?.toLowerCase().includes('session')) {
        clearAuthCookies(response);
        return response.status(401).json({ message: 'Not authenticated.' });
      }
      const message = error?.message || 'Failed to build expense summary.';
      return response.status(500).json({ message });
    }
  });

  server.post('/expenses', async (request, response) => {
    try {
      const sessionUser = await resolveSessionUser({ request, response, authService });
      const amount = parseAmount(request.body?.amount);
      if (!amount) {
        return response.status(400).json({ message: 'Amount must be a positive number.' });
      }

      const description = sanitizePlainText(request.body?.description, 240) || null;
      const merchant = sanitizePlainText(request.body?.merchant, 120) || null;
      const paymentMethod = sanitizePlainText(request.body?.paymentMethod, 60) || null;
      const occurredAt = request.body?.occurredAt ? new Date(request.body.occurredAt) : new Date();
      if (Number.isNaN(occurredAt.getTime())) {
        return response.status(400).json({ message: 'Invalid occurredAt date.' });
      }

      const currency = sanitizePlainText(request.body?.currency, 8) || 'INR';
      const providedCategory = normalizeCategory(request.body?.category);
      const shouldAutoCategorize = request.body?.autoCategorize === true || !providedCategory;

      let category = providedCategory;
      let aiCategory = null;
      let aiConfidence = null;
      let aiReason = null;

      if (shouldAutoCategorize) {
        const aiResult = await categorizeExpense({
          userId: sessionUser.id,
          amount,
          description,
          merchant,
          paymentMethod,
        });
        aiCategory = aiResult.category;
        aiConfidence = aiResult.confidence;
        aiReason = aiResult.reason;
        if (!category) {
          category = aiResult.category;
        }
      }

      if (!category) {
        category = 'Uncategorized';
      }

      const expense = await prisma.expense.create({
        data: {
          userId: sessionUser.id,
          amount,
          category,
          aiCategory,
          aiConfidence,
          aiReason,
          description,
          merchant,
          paymentMethod,
          currency,
          occurredAt,
        },
      });

      const { start, end, key } = getMonthRange(request.query?.month);
      const summary = await buildExpenseSummary({
        userId: sessionUser.id,
        monthStart: start,
        monthEnd: end,
      });

      return response.status(201).json({
        expense: {
          ...expense,
          amount: Number(expense.amount || 0),
        },
        summary: {
          month: key,
          ...summary,
        },
      });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('refresh') || error?.message?.toLowerCase().includes('session')) {
        clearAuthCookies(response);
        return response.status(401).json({ message: 'Not authenticated.' });
      }
      const message = error?.message || 'Failed to create expense.';
      return response.status(500).json({ message });
    }
  });

  server.put('/expenses/:expenseId', async (request, response) => {
    try {
      const sessionUser = await resolveSessionUser({ request, response, authService });
      const expenseId = sanitizePlainText(request.params?.expenseId, 80);
      if (!expenseId) {
        return response.status(400).json({ message: 'Expense ID is required.' });
      }

      const existing = await prisma.expense.findFirst({
        where: { id: expenseId, userId: sessionUser.id },
      });
      if (!existing) {
        return response.status(404).json({ message: 'Expense not found.' });
      }

      const hasAmount = Object.prototype.hasOwnProperty.call(request.body || {}, 'amount');
      const hasCategory = Object.prototype.hasOwnProperty.call(request.body || {}, 'category');
      const hasDescription = Object.prototype.hasOwnProperty.call(request.body || {}, 'description');
      const hasMerchant = Object.prototype.hasOwnProperty.call(request.body || {}, 'merchant');
      const hasPaymentMethod = Object.prototype.hasOwnProperty.call(request.body || {}, 'paymentMethod');
      const hasOccurredAt = Object.prototype.hasOwnProperty.call(request.body || {}, 'occurredAt');
      const hasCurrency = Object.prototype.hasOwnProperty.call(request.body || {}, 'currency');

      let amount = Number(existing.amount || 0);
      if (hasAmount) {
        const parsedAmount = parseAmount(request.body?.amount);
        if (!parsedAmount) {
          return response.status(400).json({ message: 'Amount must be a positive number.' });
        }
        amount = parsedAmount;
      }

      const description = hasDescription
        ? sanitizePlainText(request.body?.description, 240) || null
        : existing.description;
      const merchant = hasMerchant
        ? sanitizePlainText(request.body?.merchant, 120) || null
        : existing.merchant;
      const paymentMethod = hasPaymentMethod
        ? sanitizePlainText(request.body?.paymentMethod, 60) || null
        : existing.paymentMethod;
      const currency = hasCurrency
        ? sanitizePlainText(request.body?.currency, 8) || 'INR'
        : existing.currency;

      let occurredAt = existing.occurredAt;
      if (hasOccurredAt) {
        occurredAt = new Date(request.body?.occurredAt);
        if (Number.isNaN(occurredAt.getTime())) {
          return response.status(400).json({ message: 'Invalid occurredAt date.' });
        }
      }

      const providedCategory = hasCategory ? normalizeCategory(request.body?.category) : '';
      const shouldAutoCategorize = request.body?.autoCategorize === true || (hasCategory && !providedCategory);

      let category = providedCategory || existing.category || 'Uncategorized';
      let aiCategory = existing.aiCategory;
      let aiConfidence = existing.aiConfidence;
      let aiReason = existing.aiReason;

      if (shouldAutoCategorize || (!providedCategory && hasDescription)) {
        const aiResult = await categorizeExpense({
          userId: sessionUser.id,
          amount,
          description,
          merchant,
          paymentMethod,
        });
        aiCategory = aiResult.category;
        aiConfidence = aiResult.confidence;
        aiReason = aiResult.reason;
        if (!providedCategory) {
          category = aiResult.category || category;
        }
      }

      const updated = await prisma.expense.update({
        where: { id: existing.id },
        data: {
          amount,
          category,
          aiCategory,
          aiConfidence,
          aiReason,
          description,
          merchant,
          paymentMethod,
          currency,
          occurredAt,
        },
      });

      const { start, end, key } = getMonthRange(request.query?.month);
      const summary = await buildExpenseSummary({
        userId: sessionUser.id,
        monthStart: start,
        monthEnd: end,
      });

      return response.status(200).json({
        expense: {
          ...updated,
          amount: Number(updated.amount || 0),
        },
        summary: {
          month: key,
          ...summary,
        },
      });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('refresh') || error?.message?.toLowerCase().includes('session')) {
        clearAuthCookies(response);
        return response.status(401).json({ message: 'Not authenticated.' });
      }
      const message = error?.message || 'Failed to update expense.';
      return response.status(500).json({ message });
    }
  });

  server.patch('/expenses/:expenseId/category', async (request, response) => {
    try {
      const sessionUser = await resolveSessionUser({ request, response, authService });
      const expenseId = sanitizePlainText(request.params?.expenseId, 80);
      const nextCategory = normalizeCategory(request.body?.category);

      if (!expenseId) {
        return response.status(400).json({ message: 'Expense ID is required.' });
      }
      if (!nextCategory) {
        return response.status(400).json({ message: 'Category is required.' });
      }

      const existing = await prisma.expense.findFirst({
        where: { id: expenseId, userId: sessionUser.id },
      });
      if (!existing) {
        return response.status(404).json({ message: 'Expense not found.' });
      }

      const updated = await prisma.expense.update({
        where: { id: existing.id },
        data: {
          category: nextCategory,
        },
      });

      const shouldLearn = request.body?.learnMapping !== false;
      if (shouldLearn && nextCategory !== existing.category) {
        await learnMerchantMappingFromCorrection({
          userId: sessionUser.id,
          merchant: existing.merchant,
          description: existing.description,
          oldCategory: existing.category,
          newCategory: nextCategory,
          expenseId: existing.id,
        });
      }

      const { start, end, key } = getMonthRange(request.query?.month);
      const summary = await buildExpenseSummary({
        userId: sessionUser.id,
        monthStart: start,
        monthEnd: end,
      });

      return response.status(200).json({
        expense: {
          ...updated,
          amount: Number(updated.amount || 0),
        },
        summary: {
          month: key,
          ...summary,
        },
      });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('refresh') || error?.message?.toLowerCase().includes('session')) {
        clearAuthCookies(response);
        return response.status(401).json({ message: 'Not authenticated.' });
      }
      if (error?.code === 'P2021') {
        return response.status(500).json({
          message: 'Category mapping tables are not ready. Run Prisma migration and retry.',
        });
      }
      const message = error?.message || 'Failed to update expense category.';
      return response.status(500).json({ message });
    }
  });

  server.post('/auth/register', async (request, response) => {
    try {
      const result = await authService.register({
        name: request.body?.name,
        email: request.body?.email,
        password: request.body?.password,
      }, extractRequestMeta(request));
      setAuthCookies(response, result);
      return response.status(201).json(sanitizeAuthResponse(result));
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Registration failed.';
      return response.status(statusCode).json({ message });
    }
  });

  server.post('/auth/login', async (request, response) => {
    try {
      const requestMeta = extractRequestMeta(request);
      const result = await authService.login(
        request.body?.email,
        request.body?.password,
        requestMeta,
      );
      setAuthCookies(response, result);
      return response.status(200).json(sanitizeAuthResponse(result));
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Login failed.';
      return response.status(statusCode).json({ message });
    }
  });

  server.get('/auth/me', async (request, response) => {
    try {
      const accessToken = getCookieValue(request, 'access_token');
      const user = await authService.getSessionUser(accessToken);
      return response.status(200).json({ user });
    } catch (error) {
      try {
        const refreshToken = getCookieValue(request, 'refresh_token');
        const refreshed = await authService.refreshSession(refreshToken);
        setAuthCookies(response, refreshed);
        return response.status(200).json({ user: refreshed.user });
      } catch (refreshError) {
        clearAuthCookies(response);
        const statusCode =
          typeof refreshError?.getStatus === 'function' ? refreshError.getStatus() : 401;
        const message = refreshError?.message || 'Not authenticated.';
        return response.status(statusCode).json({ message });
      }
    }
  });

  server.post('/auth/logout', (request, response) => {
    clearAuthCookies(response);
    return response.status(200).json({ success: true });
  });

  server.post('/auth/magic-link', async (request, response) => {
    try {
      const result = await authService.sendMagicLink(request.body?.email);
      return response.status(200).json(result);
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Failed to send magic link.';
      return response.status(statusCode).json({ message });
    }
  });

  server.post('/auth/magic-link/verify', async (request, response) => {
    try {
      const result = await authService.verifyMagicLink(
        request.body?.token,
        extractRequestMeta(request),
      );
      setAuthCookies(response, result);
      return response.status(200).json(sanitizeAuthResponse(result));
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Magic link verification failed.';
      return response.status(statusCode).json({ message });
    }
  });

  server.get('/auth/oauth/:provider', (request, response) => {
    try {
      const oauthUrl = authService.getOauthUrl(request.params?.provider);
      return response.redirect(oauthUrl);
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'OAuth initialization failed.';
      return response.status(statusCode).json({ message });
    }
  });

  server.get('/auth/oauth/google/callback', async (request, response) => {
    try {
      const result = await authService.authenticateGoogleCallback({
        code: request.query?.code,
        state: request.query?.state,
      }, extractRequestMeta(request));
      setAuthCookies(response, result);
      return response.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      const message = error?.message || 'Google sign-in failed.';
      return response.redirect(
        `${frontendUrl}/login?oauth_error=${encodeURIComponent(message)}`,
      );
    }
  });

  server.post('/auth/admin/block-user', async (request, response) => {
    try {
      if (!verifyAdminKey(request)) {
        return response.status(403).json({ message: 'Forbidden.' });
      }

      const result = await authService.blockUserByEmail({
        email: request.body?.email,
        reason: request.body?.reason,
      });
      return response.status(200).json({ user: result });
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Failed to block user.';
      return response.status(statusCode).json({ message });
    }
  });

  server.post('/auth/admin/unblock-user', async (request, response) => {
    try {
      if (!verifyAdminKey(request)) {
        return response.status(403).json({ message: 'Forbidden.' });
      }

      const result = await authService.unblockUserByEmail({
        email: request.body?.email,
      });
      return response.status(200).json({ user: result });
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Failed to unblock user.';
      return response.status(statusCode).json({ message });
    }
  });

  await app.listen(port);
  console.log(`Fynix API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
