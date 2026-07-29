import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

const expressApp: any = express || require('express');
const server = typeof expressApp === 'function' ? expressApp() : (expressApp.default || expressApp)();
let isInitialized = false;

async function bootstrapServer() {
  if (!isInitialized) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { logger: ['error', 'warn', 'log'] }
    );

    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    app.setGlobalPrefix('api', { exclude: ['health', 'metrics'] });
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
      stack: err.stack,
    });
  }
}
