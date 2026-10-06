import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // OpenAPI / Swagger — served at /api-docs (UI) and /api-docs-json (raw spec).
  // The API gateway fetches the raw spec from each service and merges them into
  // one aggregated reference at http://localhost:3000/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Curo Audit Service')
    .setDescription(`Audit-log write & query.`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDoc);
  const port = process.env.PORT ?? 3008;
  await app.listen(port);
  console.log(`Audit service running on port ${port}`);
}
bootstrap();
