'use strict';

require('reflect-metadata');

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { AuthService } = require('./auth/auth.service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  const authService = new AuthService();

  app.enableCors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  const server = app.getHttpAdapter().getInstance();

  server.post('/auth/login', async (request, response) => {
    try {
      const result = await authService.login(request.body?.email, request.body?.password);
      return response.status(200).json(result);
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

  await app.listen(port);
  console.log(`Fynix API running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
