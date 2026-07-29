import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParserModule from 'cookie-parser';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as express from 'express';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware';

function safeCookieParser() {
  try {
    const fn = typeof cookieParserModule === 'function'
      ? cookieParserModule
      : (cookieParserModule && typeof (cookieParserModule as any).default === 'function' ? (cookieParserModule as any).default : null);
    if (typeof fn === 'function') {
      return fn();
    }
  } catch (e) {
    // Ignore
  }
  return (_req: any, _res: any, next: any) => next();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  const port = configService.get('PORT', 3001);

  const defaultUploadDir = process.env.VERCEL ? join(tmpdir(), 'uploads') : join(process.cwd(), 'uploads');
  const uploadDir = configService.get('UPLOAD_DIR') ?? defaultUploadDir;
  try {
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  } catch (err) {
    logger.warn(`Skipped creating/mounting static uploads directory: ${(err as Error).message}`);
  }
  app.useStaticAssets(join(process.cwd(), 'public'));

  app.useLogger(logger);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(safeCookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('YG Photoshop Academy API')
    .setDescription('Backend API for YG Photoshop Academy — Online Learning Platform')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Enter your JWT token' },
      'JWT-Auth'
    )
    .addTag('Auth', 'Authentication & Registration')
    .addTag('Users', 'User Profile Management')
    .addTag('Courses', 'Course Catalog & Curriculum')
    .addTag('Enrollments', 'Student Enrollments')
    .addTag('Enrollment Codes', 'Admin Code Generation & Student Redemption')
    .addTag('Progress', 'Lesson Progress Tracking')
    .addTag('Reviews', 'Course Reviews & Ratings')
    .addTag('Certificates', 'Certificate Issuance & Verification')
    .addTag('Support', 'Support Tickets & Replies')
    .addTag('Analytics', 'Admin Dashboard Analytics')
    .addTag('Admin', 'Course & Curriculum Administration')
    .addTag('CMS', 'Content Management & Testimonials')
    .addTag('RBAC', 'Role-Based Access Control')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'YG Photoshop Academy — API Docs',
  });

  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
