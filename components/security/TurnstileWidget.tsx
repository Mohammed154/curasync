"use client";

import React, { useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: any) => void;
          theme?: string;
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoaded?: () => void;
  }
}

export default function TurnstileWidget({
  onVerify,
  onError,
  className = "",
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  // Official Cloudflare testing sitekey (Always Passes)
  const siteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    "1x00000000000000000000AA";

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || isRendered) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token: string) => {
            if (isMounted) onVerify(token);
          },
          "error-callback": (err: any) => {
            console.warn("[turnstile] Widget error:", err);
            if (onError && isMounted) onError(String(err));
            // In dev environment, provide fallback valid test token
            if (process.env.NODE_ENV !== "production") {
              onVerify("test_turnstile_token");
            }
          },
        });
        if (isMounted) {
          setWidgetId(id);
          setIsRendered(true);
        }
      } catch (e: any) {
        console.warn("[turnstile] Render error:", e);
        if (process.env.NODE_ENV !== "production") {
          onVerify("test_turnstile_token");
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // Check if script is already in document
      let script = document.getElementById("cloudflare-turnstile-script") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "cloudflare-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!isRendered && process.env.NODE_ENV !== "production") {
          // Dev fallback token if script blocked by ad-blocker
          onVerify("test_turnstile_token");
        }
      }, 3000);

      return () => {
        isMounted = false;
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [siteKey, theme, isRendered, onVerify, onError]);

  return (
    <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
      <div ref={containerRef} className="min-h-[65px]" />
      <span className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
        Protected by Cloudflare Turnstile
      </span>
    </div>
  );
}
