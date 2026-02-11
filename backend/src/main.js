'use strict';

require('reflect-metadata');

const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { AuthService } = require('./auth/auth.service');

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

function sanitizeAuthResponse(authPayload) {
  return {
    user: authPayload.user,
    tokenType: authPayload.tokenType,
  };
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

  server.post('/auth/register', async (request, response) => {
    try {
      const result = await authService.register({
        name: request.body?.name,
        email: request.body?.email,
        password: request.body?.password,
      });
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
      const result = await authService.login(request.body?.email, request.body?.password);
      setAuthCookies(response, result);
      return response.status(200).json(sanitizeAuthResponse(result));
    } catch (error) {
      const statusCode =
        typeof error?.getStatus === 'function' ? error.getStatus() : 500;
      const message = error?.message || 'Login failed.';
      return response.status(statusCode).json({ message });
    }
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
      const result = await authService.verifyMagicLink(request.body?.token);
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
      });
      setAuthCookies(response, result);
      return response.redirect(`${frontendUrl}/dashboard`);
    } catch (error) {
      const message = error?.message || 'Google sign-in failed.';
      return response.redirect(
        `${frontendUrl}/login?oauth_error=${encodeURIComponent(message)}`,
      );
    }
  });

  await app.listen(port);
  console.log(`Fynix API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
