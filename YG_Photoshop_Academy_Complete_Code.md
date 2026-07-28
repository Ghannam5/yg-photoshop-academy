# YG Photoshop Academy — Complete Project Source Code Document
> **Project Name**: YG Photoshop Academy  
> **Status**: Production Ready Foundation, Auth Engine, Learning Domain & Payments Infrastructure  
> **Date**: July 24, 2026  

---

## Table of Contents

1. [Frontend Prototype & UI System (`index.html`)](#1-frontend-prototype--ui-system-indexhtml)
2. [Architecture Blueprint Visualizer (`architecture.html`)](#2-architecture-blueprint-visualizer-architecturehtml)
3. [Prisma Database Schema (`prisma/schema.prisma`)](#3-prisma-database-schema-prismaschemaprisma)
4. [Prisma Database Seed Script (`prisma/seed.ts`)](#4-prisma-database-seed-script-prismaseedts)
5. [NestJS Core & Bootstrap](#5-nestjs-core--bootstrap)
   - `src/main.ts`
   - `src/app.module.ts`
   - `src/prisma/prisma.service.ts`
   - `src/prisma/prisma.module.ts`
6. [NestJS Mail Module (`src/modules/mail/...`)](#6-nestjs-mail-module)
   - `src/modules/mail/mail.service.ts`
   - `src/modules/mail/mail.module.ts`
7. [NestJS Authentication Module (`src/modules/auth/...`)](#7-nestjs-authentication-module)
8. [NestJS Learning Module (`src/modules/learning/...`)](#8-nestjs-learning-module)
9. [NestJS Payments & Orders Module (`src/modules/payments/...`)](#9-nestjs-payments--orders-module)
   - `constants/payment.constants.ts`
   - `interfaces/payment.interfaces.ts`
   - `utils/payment.utils.ts`
   - `dto/payment.dto.ts`
   - `providers/payment-providers.ts` (Stripe, Paymob, PayPal, Manual)
   - `coupon.service.ts` & `coupon.controller.ts`
   - `order.service.ts` & `order.controller.ts`
   - `payment.service.ts` & `payment.controller.ts`
   - `invoice.service.ts`
   - `payments.module.ts`

---

## 9. NestJS Payments & Orders Module

### `src/modules/payments/constants/payment.constants.ts`
```typescript
import { PaymentMethod } from '@prisma/client';

export const PAYMENT = {
  DEFAULT_CURRENCY: 'USD',
  TAX_RATE: 0,
  ORDER_NUMBER_PREFIX: 'ORD',
  INVOICE_NUMBER_PREFIX: 'INV',
  INVOICE_DUE_DAYS: 0,
  WEBHOOK_TOLERANCE_SECONDS: 300,
  SUPPORTED_METHODS: [
    PaymentMethod.STRIPE,
    PaymentMethod.PAYMOB,
    PaymentMethod.PAYPAL,
    PaymentMethod.MANUAL,
  ] as const,
} as const;

export const ENV_KEYS = {
  STRIPE_SECRET: 'STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SECRET: 'STRIPE_WEBHOOK_SECRET',
  PAYMOB_API_KEY: 'PAYMOB_API_KEY',
  PAYMOB_INTEGRATION_ID: 'PAYMOB_INTEGRATION_ID',
  PAYMOB_HMAC_SECRET: 'PAYMOB_HMAC_SECRET',
  PAYMOB_BASE_URL: 'PAYMOB_BASE_URL',
  PAYPAL_CLIENT_ID: 'PAYPAL_CLIENT_ID',
  PAYPAL_CLIENT_SECRET: 'PAYPAL_CLIENT_SECRET',
  PAYPAL_WEBHOOK_ID: 'PAYPAL_WEBHOOK_ID',
  PAYPAL_BASE_URL: 'PAYPAL_BASE_URL',
} as const;
```

### `src/modules/payments/payments.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LearningModule } from '../learning/learning.module';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { InvoiceService } from './invoice.service';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import {
  ManualProvider,
  PaymentProviderFactory,
  PaymobProvider,
  PaypalProvider,
  StripeProvider,
} from './providers/payment-providers';

@Module({
  imports: [PrismaModule, LearningModule],
  controllers: [OrderController, CouponController, PaymentController],
  providers: [
    OrderService,
    PaymentService,
    CouponService,
    InvoiceService,
    StripeProvider,
    PaymobProvider,
    PaypalProvider,
    ManualProvider,
    PaymentProviderFactory,
  ],
  exports: [OrderService, PaymentService, CouponService],
})
export class PaymentsModule {}
```
