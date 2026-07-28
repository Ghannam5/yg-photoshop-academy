import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import cookieParser from 'cookie-parser';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  const port = configService.get('PORT', 3001);

  const uploadDir = configService.get('UPLOAD_DIR') ?? join(process.cwd(), 'uploads');
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  app.useStaticAssets(join(process.cwd(), 'public'));

  app.useLogger(logger);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('YG Photoshop Academy API')
    .setDescription('Backend API for YG Photoshop Academy — Online Learning Platform')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'JWT-Auth',
    )
    .addTag('Auth', 'Authentication & Registration')
    .addTag('Users', 'User Profile Management')
    .addTag('Courses', 'Course Catalog & Curriculum')
    .addTag('Enrollments', 'Student Enrollments')
    .addTag('Enrollment Codes', 'Admin Code Generation & Student Redemption')
    .addTag('Progress', 'Lesson Progress Tracking')
    .addTag('Reviews', 'Course Reviews & Ratings')
    .addTag('Certificates', 'Certificate Issuance & Verification')
    .addTag('Admin', 'Admin Dashboard & Management')
    .addTag('CMS', 'Content Management System')
    .addTag('Media', 'File Uploads & Video Streaming')
    .addTag('Support', 'Support Tickets & Helpdesk')
    .addTag('Analytics', 'Dashboard Analytics & Metrics')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
  });

  await app.listen(port);
  logger.log(`Application running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
