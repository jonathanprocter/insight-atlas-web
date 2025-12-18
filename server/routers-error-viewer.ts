import { publicProcedure } from "./_core/trpc.js";
import { getErrorLogs, clearErrorLogs } from "./errorLogger.js";

export const errorViewerRouter = {
  // Get all logged errors
  getErrors: publicProcedure.query(async () => {
    return getErrorLogs();
  }),

  // Clear all logged errors
  clearErrors: publicProcedure.mutation(async () => {
    clearErrorLogs();
    return { success: true };
  }),
};
