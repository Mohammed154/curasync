// ─── CuraSync i18n Configuration ───────────────────────────────────────────
// Phase 1 MVP: English only.
// Phase 2: Hindi (hi-IN) + Gujarati (gu-IN) via next-intl.
// All UI strings should use the t() function once next-intl is wired.
//
// To activate: npm install next-intl, add NextIntlClientProvider to layout.tsx
// and create messages/en.json, messages/hi.json, messages/gu.json

export const SUPPORTED_LOCALES = ["en", "hi", "gu"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_METADATA: Record<SupportedLocale, { label: string; nativeLabel: string; dir: "ltr" | "rtl" }> = {
  en: { label: "English",   nativeLabel: "English",  dir: "ltr" },
  hi: { label: "Hindi",     nativeLabel: "हिन्दी",    dir: "ltr" },
  gu: { label: "Gujarati",  nativeLabel: "ગુજરાતી",  dir: "ltr" },
};

export const DEFAULT_LOCALE: SupportedLocale = "en";

// ── Stub t() function — replace with next-intl's useTranslations() in Phase 2 ──
// Usage: const t = useLocale(); t("dashboard.greeting", { name: "Arjun" })
export function createStubTranslator(locale: SupportedLocale = "en") {
  return function t(key: string, _vars?: Record<string, string | number>): string {
    // Phase 1: return key as-is (English strings are hardcoded in components)
    // Phase 2: lookup key in messages/{locale}.json and interpolate vars
    return key;
  };
}

// ── Medical number formatting — locale-aware ──────────────────────────────────
// Blood glucose: 142 mg/dL (same in all locales)
// Weight: 84.2 kg (en) | 84.2 किलोग्राम (hi) | 84.2 kg (gu)
export function formatMedicalValue(
  value: number,
  unit: string,
  _locale: SupportedLocale = "en"
): string {
  // Phase 1: always English
  return `${value} ${unit}`;
}

// ── Date formatting — locale-aware ────────────────────────────────────────────
export function formatLocalDate(date: Date, _locale: SupportedLocale = "en"): string {
  // Phase 2: use Intl.DateTimeFormat with locale
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Phase 2 implementation notes ────────────────────────────────────────────────
// 1. npm install next-intl
// 2. Create next-intl middleware: middleware.ts at project root
// 3. Wrap app/layout.tsx with <NextIntlClientProvider messages={messages} locale={locale}>
// 4. Move all hardcoded UI strings to messages/en.json
// 5. Translate to messages/hi.json and messages/gu.json
// 6. Replace createStubTranslator() calls with useTranslations("namespace")
// 7. Medical terminology translations reviewed by a certified medical translator
//    (not AI-generated — required for patient safety)
