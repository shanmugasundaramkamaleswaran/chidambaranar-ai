import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT || 5000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "*",
  REDIS_URL: process.env.REDIS_URL || null,
};

if (!ENV.REDIS_URL) {
  console.warn("⚠️ REDIS_URL not configured. Running in local backend mode without Redis adapter.");
}