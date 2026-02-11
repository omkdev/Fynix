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
      clearAuthCookies(response);
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 401;
      const message = error?.message || 'Not authenticated.';
      return response.status(statusCode).json({ message });
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
