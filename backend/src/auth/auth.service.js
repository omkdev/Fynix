'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { BadRequestException, UnauthorizedException } = require('@nestjs/common');

const prisma = new PrismaClient();

class AuthService {
  async login(email, password) {
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokenPayload = { sub: user.id, email: user.email };

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
      return {
        success: true,
        message:
          'Resend is not configured. Magic link generated in development mode.',
        previewLink: magicLink,
      };
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

  getOauthUrl(provider) {
    const normalizedProvider = (provider || '').toLowerCase();

    if (!['google', 'github'].includes(normalizedProvider)) {
      throw new BadRequestException('Unsupported OAuth provider.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const state = crypto.randomBytes(16).toString('hex');

    if (normalizedProvider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri =
        process.env.GOOGLE_REDIRECT_URI || `${frontendUrl}/login?oauth=google`;
      if (!clientId) {
        throw new BadRequestException(
          'Google OAuth is not configured. Add GOOGLE_CLIENT_ID.',
        );
      }

      const scope = encodeURIComponent('openid email profile');
      return `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
        clientId,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI || `${frontendUrl}/login?oauth=github`;
    if (!clientId) {
      throw new BadRequestException(
        'GitHub OAuth is not configured. Add GITHUB_CLIENT_ID.',
      );
    }

    return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      clientId,
    )}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent('read:user user:email')}&state=${state}`;
  }

  getJwtAccessSecret() {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new BadRequestException('JWT_ACCESS_SECRET is not configured.');
    }
    return process.env.JWT_ACCESS_SECRET;
  }

  getJwtRefreshSecret() {
    return process.env.JWT_REFRESH_SECRET || this.getJwtAccessSecret();
  }
}

module.exports = { AuthService };
