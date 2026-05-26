// lib/env.ts
// Validates required environment variables at startup.
// Called from next.config.mjs so missing vars fail BEFORE the build, not at runtime.

interface EnvSpec {
  key:         string;
  required:    "always" | "production" | "optional";
  description: string;
}

const ENV_SPECS: EnvSpec[] = [
  // Always required
  { key: "NEXT_PUBLIC_APP_URL",                required: "always",     description: "Public app URL for redirects" },
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",  required: "always",     description: "Clerk publishable key" },
  { key: "CLERK_SECRET_KEY",                   required: "always",     description: "Clerk secret key" },

  // Production required
  { key: "DATABASE_URL",                       required: "production",  description: "Supabase PostgreSQL connection string (pooler)" },
  { key: "NEXT_PUBLIC_SUPABASE_URL",           required: "production",  description: "Supabase project URL" },
  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",      required: "production",  description: "Supabase anon public key" },

  // Optional (feature-gated)
  { key: "ANTHROPIC_API_KEY",                  required: "optional",    description: "Anthropic API key (AI Doctor feature)" },
  { key: "RESEND_API_KEY",                     required: "optional",    description: "Resend API key (email)" },
  { key: "TWILIO_ACCOUNT_SID",                 required: "optional",    description: "Twilio SID (SMS alerts)" },
  { key: "TWILIO_AUTH_TOKEN",                  required: "optional",    description: "Twilio auth token" },
  { key: "TWILIO_PHONE_NUMBER",                required: "optional",    description: "Twilio sender number" },
  { key: "AWS_ACCESS_KEY_ID",                  required: "optional",    description: "AWS access key (PDF Lambda)" },
  { key: "AWS_SECRET_ACCESS_KEY",              required: "optional",    description: "AWS secret key" },
  { key: "AWS_REGION",                         required: "optional",    description: "AWS region" },
  { key: "AWS_S3_BUCKET",                      required: "optional",    description: "S3 bucket for PDF reports" },
  { key: "GOOGLE_APPLICATION_CREDENTIALS_JSON",required: "optional",    description: "GCP Vision credentials (OCR)" },
  { key: "WEBHOOK_SECRET",                     required: "optional",    description: "HMAC secret for wearable webhooks" },
];

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.key];
    const isEmpty = !value || value.trim() === "";

    if (spec.required === "always" && isEmpty) {
      missing.push(`  ❌ ${spec.key} — ${spec.description}`);
    } else if (spec.required === "production" && isProd && isEmpty) {
      missing.push(`  ❌ ${spec.key} — ${spec.description}`);
    } else if (spec.required === "optional" && isEmpty) {
      warnings.push(`  ⚠️  ${spec.key} — ${spec.description} (feature disabled)`);
    }
  }

  if (warnings.length > 0 && !isProd) {
    console.warn("\n[CuraSync] Optional env vars not set (features will be disabled):");
    warnings.forEach((w) => console.warn(w));
    console.warn("");
  }

  if (missing.length > 0) {
    console.error("\n[CuraSync] ❌ Required environment variables are missing:\n");
    missing.forEach((m) => console.error(m));
    console.error("\nAdd these to .env.local (dev) or Vercel Environment Variables (production).\n");
    if (isProd) {
      throw new Error(`Missing required environment variables. See above.`);
    }
  }
}
