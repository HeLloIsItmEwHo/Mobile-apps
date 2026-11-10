export function loadConfig(env = process.env) {
  const publicUrl = (env.PUBLIC_URL || `http://localhost:${env.PORT || 8787}`).replace(/\/+$/, '');
  return {
    port: Number(env.PORT || 8787),
    databaseUrl: env.DATABASE_URL || 'postgres://qp:qp@localhost:5432/quotepilot_dev',
    // Where this server is reachable from the internet. Used in password
    // reset emails and as the page Stripe returns people to.
    publicUrl,
    // Optional link back to the web app from the "you're subscribed" page.
    appUrl: env.APP_URL || '',
    corsOrigins: (env.CORS_ORIGINS || '*').split(',').map((origin) => origin.trim()).filter(Boolean),
    trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) || env.TRUST_PROXY : false,
    stripeSecretKey: env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    stripeAutoSetup: env.STRIPE_AUTO_SETUP === '1' || env.STRIPE_AUTO_SETUP === 'true',
    resendApiKey: env.RESEND_API_KEY || '',
    mailFrom: env.MAIL_FROM || 'QuotePilot <no-reply@example.com>',
    trialDays: Number(env.TRIAL_DAYS ?? 7),
    authRateLimit: Number(env.AUTH_RATE_LIMIT ?? 30), // attempts per IP per 15 minutes
  };
}
