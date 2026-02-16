import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  autosaveIntervalSeconds: Number(process.env.AUTOSAVE_INTERVAL_SECONDS || 5)
};

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}
