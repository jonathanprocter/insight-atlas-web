import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { cache } from "./redis";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Rate limiting middleware factory for tRPC procedures
 * Uses Redis (with memory fallback) for distributed rate limiting
 */
function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  message?: string;
}) {
  return t.middleware(async ({ ctx, next }) => {
    const ip = ctx.req.ip || ctx.req.socket.remoteAddress || 'unknown';
    const userId = ctx.user?.id || 'anonymous';
    const key = `ratelimit:${options.keyPrefix}:${userId}:${ip}`;

    try {
      const current = await cache.incr(key);

      // Set expiry on first request in window
      if (current === 1) {
        await cache.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.maxRequests) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: options.message || `Rate limit exceeded. Please try again later.`,
        });
      }
    } catch (error) {
      // If it's already a TRPC error, rethrow
      if (error instanceof TRPCError) {
        throw error;
      }
      // Otherwise, log and continue (fail open for rate limiting)
      console.warn('[RateLimit] Error checking rate limit:', error);
    }

    return next();
  });
}

// Expensive operation rate limiters
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  keyPrefix: 'upload',
  message: 'Upload limit reached. Maximum 20 uploads per hour.',
});

const insightGenerationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  keyPrefix: 'insight',
  message: 'Insight generation limit reached. Maximum 10 generations per hour.',
});

const audioGenerationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 15,
  keyPrefix: 'audio',
  message: 'Audio generation limit reached. Maximum 15 generations per hour.',
});

const exportRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30,
  keyPrefix: 'export',
  message: 'Export limit reached. Maximum 30 exports per hour.',
});

// Export rate-limited procedures for use in routers
export const uploadProcedure = t.procedure.use(uploadRateLimiter);
export const insightProcedure = t.procedure.use(insightGenerationRateLimiter);
export const audioProcedure = t.procedure.use(audioGenerationRateLimiter);
export const exportProcedure = t.procedure.use(exportRateLimiter);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
