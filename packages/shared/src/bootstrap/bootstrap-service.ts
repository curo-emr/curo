import { NestFactory } from '@nestjs/core';
import { INestApplication, Type, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { registerHealthCheck } from '../health';

export interface ServiceInfo {
  title: string;
  description: string;
  defaultPort: number;
}

/**
 * The request handling every Curo backend shares: validation pipes, CORS and
 * `/health`. The API tests apply it too, so they see what production sees.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  registerHealthCheck(app);
}

/** Creates and starts a Curo backend service with the standard request handling and OpenAPI docs. */
export async function bootstrapService(
  appModule: Type<unknown>,
  info: ServiceInfo,
): Promise<void> {
  const app = await NestFactory.create(appModule);
  configureApp(app);

  // OpenAPI / Swagger — served at /api-docs (UI) and /api-docs-json (raw spec).
  // The API gateway fetches the raw spec from each service and merges them into
  // one aggregated reference at http://localhost:3000/docs.
  const swaggerConfig = new DocumentBuilder()
    .setTitle(info.title)
    .setDescription(info.description)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = process.env.PORT ?? info.defaultPort;
  await app.listen(port);
  console.log(`${info.title} running on port ${port}`);
}
