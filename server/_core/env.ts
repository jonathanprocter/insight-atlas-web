export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

// Validate critical environment variables at startup
function validateEnv() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Critical variables (app won't work without these)
  if (!ENV.databaseUrl) {
    errors.push("DATABASE_URL is not set - database operations will fail");
  }
  if (!ENV.cookieSecret) {
    errors.push("JWT_SECRET is not set - authentication will fail");
  }

  // Important variables (features may not work)
  if (!ENV.forgeApiKey) {
    warnings.push("BUILT_IN_FORGE_API_KEY is not set - storage operations may fail");
  }
  if (!ENV.forgeApiUrl) {
    warnings.push("BUILT_IN_FORGE_API_URL is not set - using default forge.manus.im");
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn("[ENV] Configuration warnings:");
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Throw errors for critical missing variables
  if (errors.length > 0) {
    console.error("[ENV] Critical configuration errors:");
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error(`Missing critical environment variables: ${errors.join(", ")}`);
  }

  console.log("[ENV] Environment validation passed");
}

// Run validation on module load
validateEnv();
