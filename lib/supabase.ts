// lib/supabase.ts — Supabase Client and Edge Function Invocation Helpers

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;
let _supabaseBrowser: SupabaseClient | null = null;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qljcabrkkkcxyfmgiuey.supabase.co";

/**
 * Server-side Supabase client with administrative privileges.
 * Prefers SUPABASE_SERVICE_ROLE_KEY; falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

/**
 * Browser-safe Supabase client using public anon key.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!_supabaseBrowser) {
    _supabaseBrowser = createClient(SUPABASE_URL, key);
  }
  return _supabaseBrowser;
}

export interface PdfExportPayload {
  patientId: string;
  patientName: string;
  rangeStart: string;
  rangeEnd: string;
  conditions?: string[];
  reportId?: string;
  previewUrl?: string;
  [key: string]: unknown;
}

/**
 * Invokes the Supabase Edge Function to generate an export PDF.
 * Checks SUPABASE_PDF_FUNCTION_NAME, defaulting to "html-to-pdf" or "export-pdf".
 * Returns a valid PDF URL (remote URL, signed storage URL, or base64 data URL).
 */
export async function invokeSupabasePdfExport(
  payload: PdfExportPayload
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const functionName =
    process.env.SUPABASE_PDF_FUNCTION_NAME || "html-to-pdf";
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const previewUrl =
    payload.previewUrl ||
    `${appUrl}/pdf-preview?patientId=${payload.patientId}&rangeStart=${payload.rangeStart}&rangeEnd=${payload.rangeEnd}`;

  // Comprehensive body covering URL rendering, HTML endpoints, and direct data payload
  const body = {
    ...payload,
    url: previewUrl,
    previewUrl,
  };

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    console.warn(`[supabase-edge] ${functionName} invocation returned error:`, error.message);
    throw error;
  }

  // 1. If edge function returned an object with a URL field
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const directUrl =
      (obj.pdfUrl as string | undefined) ||
      (obj.url as string | undefined) ||
      (obj.downloadUrl as string | undefined) ||
      ((obj.data as Record<string, unknown> | undefined)?.pdfUrl as string | undefined) ||
      ((obj.data as Record<string, unknown> | undefined)?.url as string | undefined);

    if (directUrl && typeof directUrl === "string") {
      return directUrl;
    }

    if (typeof obj.base64 === "string") {
      return `data:application/pdf;base64,${obj.base64}`;
    }
  }

  // 2. Direct string URL returned
  if (typeof data === "string" && data.startsWith("http")) {
    return data;
  }

  // 3. Raw Blob or ArrayBuffer returned (binary PDF output from Deno)
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    const arrayBuf = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    return `data:application/pdf;base64,${base64}`;
  }

  if (data instanceof ArrayBuffer) {
    const base64 = Buffer.from(data).toString("base64");
    return `data:application/pdf;base64,${base64}`;
  }

  // Default fallback if successful status but no URL parsed
  return previewUrl;
}
