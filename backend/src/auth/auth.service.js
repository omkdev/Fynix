'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} = require('@nestjs/common');

const prisma = new PrismaClient();

class AuthService {
  async register({ name, email, password }, requestMeta = {}) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedName = (name || '').trim();

    if (!normalizedEmail || !password) {
      throw new BadRequestException('Email and password are required.');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Account already exists for this email.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: normalizedName || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        tokenVersion: true,
      },
    });

    const authResponse = this.createAuthResponse(createdUser);
    await this.recordLoginEvent({
      user: createdUser,
      method: 'register',
      requestMeta,
    });
    return authResponse;
  }

  async login(email, password, requestMeta = {}) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new BadRequestException('Email and password are required.');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isBlocked: true,
        blockedReason: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.ensureUserNotBlocked(user);

    const authResponse = this.createAuthResponse(user);
    await this.recordLoginEvent({
      user,
      method: 'password',
      requestMeta,
    });
    return authResponse;
  }

  async sendMagicLink(email) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required.');
    }

    const magicToken = jwt.sign(
      {
        email: normalizedEmail,
        nonce: crypto.randomBytes(12).toString('hex'),
      },
      this.getJwtAccessSecret(),
      { expiresIn: '15m' },
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const magicLink = `${frontendUrl}/login?magic_token=${encodeURIComponent(magicToken)}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Fynix <onboarding@resend.dev>';

    if (!resendApiKey) {
      const responsePayload = {
        success: true,
        message: 'Magic link service is not configured.',
      };

      if (process.env.NODE_ENV === 'development') {
        responsePayload.message = 'Resend is not configured. Magic link generated in development mode.';
        responsePayload.previewLink = magicLink;
      }

      return responsePayload;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedEmail],
        subject: 'Your Fynix magic login link',
        html: `<p>Click to sign in to Fynix:</p><p><a href="${magicLink}">${magicLink}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });

    const resendPayload = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      throw new BadRequestException(
        resendPayload?.message || 'Failed to send magic link email.',
      );
    }

    return {
      success: true,
      message: 'Magic link sent successfully.',
      provider: 'resend',
      requestId: resendPayload?.id,
    };
  }

  async verifyMagicLink(token, requestMeta = {}) {
    if (!token) {
      throw new BadRequestException('Magic token is required.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, this.getJwtAccessSecret());
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired magic link.');
    }

    const normalizedEmail = (decoded?.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new UnauthorizedException('Invalid magic link payload.');
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        blockedReason: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      // Password-based login is optional for magic-link-only users.
      const generatedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: generatedPasswordHash,
          name: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
          blockedReason: true,
          tokenVersion: true,
        },
      });
    }

    this.ensureUserNotBlocked(user);

    const authResponse = this.createAuthResponse(user);
    await this.recordLoginEvent({
      user,
      method: 'magic_link',
      requestMeta,
    });
    return authResponse;
  }

  async authenticateGoogleCallback({ code, state }, requestMeta = {}) {
    if (!code) {
      throw new BadRequestException('Google authorization code is missing.');
    }

    this.verifyOauthState(state, 'google');

    const tokenPayload = await this.exchangeGoogleCodeForTokens(code);
    const userProfile = await this.fetchGoogleUserProfile(tokenPayload.access_token);
    const normalizedEmail = (userProfile?.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new UnauthorizedException('Google account email is unavailable.');
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        blockedReason: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      const generatedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: generatedPasswordHash,
          name: (userProfile?.name || '').trim() || null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isBlocked: true,
          blockedReason: true,
          tokenVersion: true,
        },
      });
    }

    this.ensureUserNotBlocked(user);

    const authResponse = this.createAuthResponse(user);
    await this.recordLoginEvent({
      user,
      method: 'google_oauth',
      requestMeta,
    });
    return authResponse;
  }

  getOauthUrl(provider) {
    const normalizedProvider = (provider || '').toLowerCase();

    if (normalizedProvider !== 'google') {
      throw new BadRequestException('Unsupported OAuth provider.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException(
        'Google OAuth is not configured. Add GOOGLE_CLIENT_ID.',
      );
    }

    const state = jwt.sign(
      { provider: 'google', nonce: crypto.randomBytes(16).toString('hex') },
      this.getJwtAccessSecret(),
      { expiresIn: '10m' },
    );

    const scope = encodeURIComponent('openid email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(
      this.getGoogleRedirectUri(),
    )}&scope=${scope}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`;
  }

  getJwtAccessSecret() {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new BadRequestException('JWT_ACCESS_SECRET is not configured.');
    }
    return process.env.JWT_ACCESS_SECRET;
  }

  getJwtRefreshSecret() {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (refreshSecret) {
      return refreshSecret;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('JWT_REFRESH_SECRET is not configured.');
    }

    return this.getJwtAccessSecret();
  }

  getGoogleRedirectUri() {
    if (process.env.GOOGLE_REDIRECT_URI) {
      return process.env.GOOGLE_REDIRECT_URI;
    }
    const backendBaseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${backendBaseUrl}/auth/oauth/google/callback`;
  }

  getGoogleClientSecret() {
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      throw new BadRequestException('GOOGLE_CLIENT_SECRET is not configured.');
    }
    return process.env.GOOGLE_CLIENT_SECRET;
  }

  verifyOauthState(state, provider) {
    if (!state) {
      throw new UnauthorizedException('OAuth state is missing.');
    }
    try {
      const decoded = jwt.verify(state, this.getJwtAccessSecret());
      if (decoded?.provider !== provider) {
        throw new UnauthorizedException('OAuth state is invalid.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('OAuth state is invalid or expired.');
    }
  }

  async exchangeGoogleCodeForTokens(code) {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const body = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: this.getGoogleClientSecret(),
      redirect_uri: this.getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.access_token) {
      throw new BadRequestException(
        payload?.error_description || payload?.error || 'Google token exchange failed.',
      );
    }

    return payload;
  }

  async getSessionUser(accessToken) {
    if (!accessToken) {
      throw new UnauthorizedException('Not authenticated.');
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(accessToken, this.getJwtAccessSecret());
    } catch (error) {
      throw new UnauthorizedException('Session is invalid or expired.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.sub },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        blockedReason: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Session user not found.');
    }

    if (Number(decodedToken?.tv ?? -1) !== Number(user.tokenVersion)) {
      throw new UnauthorizedException('Session has been revoked.');
    }

    this.ensureUserNotBlocked(user);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  async refreshSession(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(refreshToken, this.getJwtRefreshSecret());
    } catch (error) {
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.sub },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
        blockedReason: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Refresh session user not found.');
    }

    if (Number(decodedToken?.tv ?? -1) !== Number(user.tokenVersion)) {
      throw new UnauthorizedException('Refresh session has been revoked.');
    }

    this.ensureUserNotBlocked(user);
    return this.createAuthResponse(user);
  }

  async blockUserByEmail({ email, reason }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, isBlocked: true },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const blockedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: (reason || '').trim() || null,
        tokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        email: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
      },
    });

    return blockedUser;
  }

  async unblockUserByEmail({ email }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    return prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
        tokenVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        email: true,
        isBlocked: true,
      },
    });
  }

  async fetchGoogleUserProfile(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new BadRequestException(payload?.error?.message || 'Failed to fetch Google profile.');
    }
    return payload;
  }

  async recordLoginEvent({ user, method, requestMeta }) {
    if (!user?.id || !user?.email) {
      return;
    }

    const ipAddress = this.normalizeIpAddress(requestMeta?.ipAddress);
    const userAgent = this.normalizeUserAgent(requestMeta?.userAgent);

    try {
      await prisma.loginEvent.create({
        data: {
          userId: user.id,
          email: user.email,
          method,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Non-blocking audit logging: auth should still succeed.
      console.warn('Login event write skipped:', error?.message || error);
    }
  }

  normalizeIpAddress(ipAddress) {
    if (!ipAddress || typeof ipAddress !== 'string') return null;
    return ipAddress.trim().slice(0, 120) || null;
  }

  normalizeUserAgent(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return null;
    return userAgent.trim().slice(0, 512) || null;
  }

  createAuthResponse(user) {
    const tokenPayload = { sub: user.id, email: user.email, tv: user.tokenVersion ?? 0 };

    const accessToken = jwt.sign(tokenPayload, this.getJwtAccessSecret(), {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    });

    const refreshToken = jwt.sign(tokenPayload, this.getJwtRefreshSecret(), {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  ensureUserNotBlocked(user) {
    if (!user?.isBlocked) return;
    const reason = user?.blockedReason ? ` Reason: ${user.blockedReason}` : '';
    throw new ForbiddenException(`Your account is blocked.${reason}`);
  }
}

module.exports = { AuthService };
