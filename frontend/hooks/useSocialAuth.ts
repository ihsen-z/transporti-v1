/**
 * useSocialAuth — Google & Facebook OAuth SDK integration
 *
 * Handles SDK loading, OAuth popup flows, and backend token exchange.
 * Uses the official Google Identity Services and Facebook Login SDKs.
 */
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type UserRole } from "@/lib/auth";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

// ─── Type declarations for provider SDKs ────────────────────────────────────

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
    FB?: {
      init: (config: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken: string };
          status: string;
        }) => void,
        options?: { scope: string; return_scopes?: boolean },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

// ─── SDK Script Loading ─────────────────────────────────────────────────────

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useSocialAuth() {
  const { loginWithSocialToken } = useAuth();
  const { showToast } = useToast();
  const { t } = useAppI18n();
  const googleClientRef = useRef<GoogleTokenClient | null>(null);
  const isGoogleLoadingRef = useRef(false);
  const isFacebookLoadingRef = useRef(false);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const facebookAppId =
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "";

  // ── Load Google Identity Services SDK on mount ──────────────────────────

  useEffect(() => {
    if (!googleClientId || isGoogleLoadingRef.current) return;
    isGoogleLoadingRef.current = true;

    loadScript(
      "https://accounts.google.com/gsi/client",
      "google-gsi-script",
    )
      .then(() => {
        if (window.google) {
          googleClientRef.current =
            window.google.accounts.oauth2.initTokenClient({
              client_id: googleClientId,
              scope: "openid email profile",
              callback: () => {
                // Overridden at call time in loginWithGoogle
              },
            });
        }
      })
      .catch(() => {
        // Silently fail — button will show error when clicked
      })
      .finally(() => {
        isGoogleLoadingRef.current = false;
      });
  }, [googleClientId]);

  // ── Load Facebook SDK on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!facebookAppId || isFacebookLoadingRef.current) return;
    isFacebookLoadingRef.current = true;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: "v19.0",
      });
      isFacebookLoadingRef.current = false;
    };

    loadScript(
      "https://connect.facebook.net/en_US/sdk.js",
      "facebook-jssdk",
    ).catch(() => {
      isFacebookLoadingRef.current = false;
    });
  }, [facebookAppId]);

  // ── Google Login ────────────────────────────────────────────────────────

  const loginWithGoogle = useCallback(async (): Promise<{
    success: boolean;
    role?: UserRole;
    isNewUser?: boolean;
    error?: string;
  }> => {
    if (!googleClientId) {
      showToast("error", t.auth.socialLoginError);
      return { success: false, error: "Google Client ID not configured" };
    }

    return new Promise((resolve) => {
      // Ensure SDK is loaded
      if (!window.google) {
        showToast("error", t.auth.socialLoginError);
        resolve({ success: false, error: "Google SDK not loaded" });
        return;
      }

      // Create a fresh token client with the real callback
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        callback: async (tokenResponse: GoogleTokenResponse) => {
          if (tokenResponse.error) {
            showToast("warning", t.auth.socialLoginCancelled);
            resolve({
              success: false,
              error: tokenResponse.error_description || "Google login cancelled",
            });
            return;
          }

          showToast("info", t.auth.socialLoginLoading);

          const result = await loginWithSocialToken(
            "google",
            tokenResponse.access_token,
          );

          if (result.success) {
            showToast("success", t.auth.loginSuccess);
          } else {
            showToast("error", result.error || t.auth.socialLoginError);
          }

          resolve(result);
        },
        error_callback: (error: { type: string; message?: string }) => {
          if (error.type === "popup_closed") {
            showToast("info", t.auth.socialLoginCancelled);
            resolve({ success: false, error: "Popup closed" });
          } else {
            showToast("error", t.auth.socialLoginError);
            resolve({ success: false, error: error.message || "Google error" });
          }
        },
      });

      client.requestAccessToken({ prompt: "select_account" });
    });
  }, [googleClientId, loginWithSocialToken, showToast, t]);

  // ── Facebook Login ──────────────────────────────────────────────────────

  const loginWithFacebook = useCallback(async (): Promise<{
    success: boolean;
    role?: UserRole;
    isNewUser?: boolean;
    error?: string;
  }> => {
    if (!facebookAppId) {
      showToast("error", t.auth.socialLoginError);
      return { success: false, error: "Facebook App ID not configured" };
    }

    return new Promise((resolve) => {
      if (!window.FB) {
        showToast("error", t.auth.socialLoginError);
        resolve({ success: false, error: "Facebook SDK not loaded" });
        return;
      }

      window.FB.login(
        async (response) => {
          if (!response.authResponse) {
            showToast("info", t.auth.socialLoginCancelled);
            resolve({ success: false, error: "Facebook login cancelled" });
            return;
          }

          showToast("info", t.auth.socialLoginLoading);

          const result = await loginWithSocialToken(
            "facebook",
            response.authResponse.accessToken,
          );

          if (result.success) {
            showToast("success", t.auth.loginSuccess);
          } else {
            showToast("error", result.error || t.auth.socialLoginError);
          }

          resolve(result);
        },
        { scope: "email,public_profile" },
      );
    });
  }, [facebookAppId, loginWithSocialToken, showToast, t]);

  // ── Public API ──────────────────────────────────────────────────────────

  return {
    loginWithGoogle,
    loginWithFacebook,
    isGoogleAvailable: !!googleClientId,
    isFacebookAvailable: !!facebookAppId,
  };
}
