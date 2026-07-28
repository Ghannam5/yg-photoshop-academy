import * as Joi from 'joi';

export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
});

export const appValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
}).options({ allowUnknown: true });
