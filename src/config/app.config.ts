import * as Joi from 'joi';

const defaultDbUrl = 'postgres://postgres.bzqjfobngshicszfoydg:My01062680608@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';

export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_SECRET || 'yg_photoshop_academy_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'yg_photoshop_academy_super_secret_refresh_key_2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || defaultDbUrl,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
});

export const appValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('production'),
  DATABASE_URL: Joi.string().default(defaultDbUrl),
  JWT_SECRET: Joi.string().default('yg_photoshop_academy_super_secret_jwt_key_2026'),
  JWT_REFRESH_SECRET: Joi.string().default('yg_photoshop_academy_super_secret_refresh_key_2026'),
}).options({ allowUnknown: true });
