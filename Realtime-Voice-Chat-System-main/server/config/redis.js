import { createClient } from "redis";
import { ENV } from "./env.js";

const createMemoryRedisClient = () => {
  const store = new Map();

  const makeSet = (key) => {
    const value = store.get(key);
    if (value instanceof Set) return value;
    const next = new Set();
    store.set(key, next);
    return next;
  };

  return {
    isOpen: true,
    duplicate() {
      return createMemoryRedisClient();
    },
    async connect() {
      return true;
    },
    async set(key, value, opts = {}) {
      store.set(key, value);
      return "OK";
    },
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async del(key) {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    },
    async expire(key, ttl) {
      return 1;
    },
    async lPush(key, value) {
      const arr = store.get(key) || [];
      arr.unshift(value);
      store.set(key, arr);
      return arr.length;
    },
    async lTrim(key, start, end) {
      const arr = store.get(key) || [];
      store.set(key, arr.slice(start, end + 1));
      return 1;
    },
    async lRange(key, start, end) {
      const arr = store.get(key) || [];
      return arr.slice(start, end + 1);
    },
    async sAdd(key, value) {
      const set = makeSet(key);
      set.add(value);
      return 1;
    },
    async sRem(key, value) {
      const set = store.get(key);
      if (!(set instanceof Set)) return 0;
      const removed = set.delete(value) ? 1 : 0;
      if (set.size === 0) store.delete(key);
      return removed;
    },
    async sMembers(key) {
      const set = store.get(key);
      return set instanceof Set ? [...set] : [];
    },
    async exists(key) {
      return store.has(key) ? 1 : 0;
    },
  };
};

export let redisPub = ENV.REDIS_URL ? createClient({ url: ENV.REDIS_URL }) : createMemoryRedisClient();
export let redisSub = ENV.REDIS_URL ? redisPub.duplicate() : createMemoryRedisClient();

export async function connectRedis() {
  if (!ENV.REDIS_URL) {
    console.log("✅ Redis not configured; continuing in standalone backend mode.");
    return false;
  }

  try {
    if (!redisPub.isOpen) await redisPub.connect();
    if (!redisSub.isOpen) await redisSub.connect();
    console.log("✅ Redis connected");
    return true;
  } catch (error) {
    console.warn("⚠️ Redis unavailable. Falling back to in-memory backend mode.", error.message);
    redisPub = createMemoryRedisClient();
    redisSub = createMemoryRedisClient();
    return false;
  }
}