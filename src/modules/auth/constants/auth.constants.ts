export const AUTH = {
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000,
  NAME_REGEX: /^[a-zA-Z\u00C0-\u00ff\s'-]+$/,
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;
