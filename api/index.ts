import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { existsSync } from 'fs';
import { join } from 'path';
import express from 'express';
import { AppModule } from '../src/app.module';
import { LoggerService } from '../src/common/logger/logger.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const server = express();
let isInitialized = false;

async function bootstrapServer() {
  if (!isInitialized) {
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(server),
      { bufferLogs: true }
    );

    const logger = app.get(LoggerService);

    const publicPath = join(process.cwd(), 'public');
    if (existsSync(publicPath)) {
      app.useStaticAssets(publicPath);
    }

    app.useLogger(logger);
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(compression());
    app.use(cookieParser());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.enableCors({ origin: '*', credentials: true });

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

    await app.init();
    isInitialized = true;
  }
}

export default async function handler(req: any, res: any) {
  try {
    await bootstrapServer();
    server(req, res);
  } catch (err: any) {
    console.error('Serverless Bootstrap Error:', err);
    res.status(500).json({
      statusCode: 500,
      message: 'Serverless initialization error',
      error: err.message || String(err),
    });
  }
}
