import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Disable built-in body parser so proxy can forward raw request bodies
  const app = await NestFactory.create(AppModule, { bodyParser: false });

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API Gateway running on port ${port}`);
}
bootstrap();
