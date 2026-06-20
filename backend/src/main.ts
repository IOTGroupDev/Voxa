import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  app.setGlobalPrefix('api');
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  logger.log(`Backend listening on port ${port} with global prefix /api`);
}

void bootstrap();
