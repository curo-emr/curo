import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { intFromEnv } from '@curo/shared/config';
import { registerHealthCheck } from '@curo/shared/health';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable built-in body parser so proxy can forward raw request bodies
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  // How many proxies (a load balancer, nginx, Cloudflare) sit in front of the
  // gateway, so req.ip is the client's: the one each passes on is trusted.
  // With none, it is the address that connected.
  app.set('trust proxy', intFromEnv('TRUSTED_PROXIES', 0));

  const origins = (
    process.env.FRONTEND_ORIGINS ||
    'http://localhost:3010,http://localhost:3011,http://localhost:3012,http://localhost:3013,http://localhost:3014,http://localhost:3015,http://localhost:3016'
  ).split(',');
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  registerHealthCheck(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
}
void bootstrap();
