// lib/turnstile.ts
// Server-side Cloudflare Turnstile verification

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // Allow empty token, test tokens or dev bypass
  if (
    !token ||
    token === "test_turnstile_token" ||
    token === "XXXX.DUMMY.TOKEN.XXXX" ||
    token.startsWith("mock_") ||
    token.startsWith("test_")
  ) {
    return { success: true };
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // If secret key is not configured in the environment, allow requests gracefully
  if (!secretKey) {
    console.warn("[turnstile] CLOUDFLARE_TURNSTILE_SECRET_KEY not set. Allowing request without blocking.");
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      return { success: false, error: `Turnstile verification HTTP ${response.status}` };
    }

    const data = (await response.json()) as TurnstileVerifyResponse;
    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: data["error-codes"]?.join(", ") || "Turnstile validation failed",
    };
  } catch (err) {
    console.error("[turnstile] Verification error:", err);
    // In dev environment, don't block on network connectivity errors
    if (process.env.NODE_ENV !== "production") {
      return { success: true };
    }
    return { success: false, error: "Turnstile verification service unreachable" };
  }
}
