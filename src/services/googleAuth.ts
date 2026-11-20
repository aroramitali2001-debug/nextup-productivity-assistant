import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const PENDING_REDIRECT_KEY = 'nextup_pending_redirect_auth';
const PENDING_REDIRECT_TAB_KEY = 'nextup_pending_redirect_tab';

const configuredAuthDomain =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_FIREBASE_AUTH_DOMAIN?.trim()) ||
  firebaseConfig.authDomain;

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        ...firebaseConfig,
        authDomain: configuredAuthDomain,
      });

const auth = getAuth(app);

// Keep Firebase user session persisted across page refreshes
void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore persistence errors in restricted storage environments
});

function buildGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'consent select_account',
  });
  return provider;
}

export function isEmbeddedIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export type GoogleSignInMode = 'auto' | 'popup' | 'redirect';

export interface GoogleAuthErrorInfo {
  code: string;
  message: string;
  offerRedirect: boolean;
}

export class GoogleAuthFailure extends Error {
  code: string;
  offerRedirect: boolean;

  constructor(info: GoogleAuthErrorInfo) {
    super(info.message);
    this.name = 'GoogleAuthFailure';
    this.code = info.code;
    this.offerRedirect = info.offerRedirect;
  }
}

export function formatFirebaseAuthError(err: unknown): GoogleAuthErrorInfo {
  if (err instanceof GoogleAuthFailure) {
    return { code: err.code, message: err.message, offerRedirect: err.offerRedirect };
  }

  const rawCode =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err || 'Unknown authentication error');
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
  const canRedirect = typeof window !== 'undefined' && !isEmbeddedIframe();

  switch (rawCode) {
    case 'auth/unauthorized-domain':
      return {
        code: rawCode,
        message: `Domain "${hostname}" is not authorized in Firebase Authentication. Add "${hostname}" to Firebase Console → Authentication → Settings → Authorized domains.`,
        offerRedirect: false,
      };
    case 'auth/popup-blocked':
      return {
        code: rawCode,
        message: canRedirect
          ? 'Your browser blocked the Google sign-in popup. Use redirect sign-in below or allow popups for this site.'
          : 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.',
        offerRedirect: canRedirect,
      };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        code: rawCode,
        message: canRedirect
          ? 'The Google sign-in popup closed before authentication finished. On deployed browsers or strict popup settings, use redirect sign-in below instead.'
          : 'The Google sign-in window closed before completing authentication. Please try again and approve the permissions prompt.',
        offerRedirect: canRedirect,
      };
    case 'auth/operation-not-supported-in-this-environment':
      return {
        code: rawCode,
        message: canRedirect
          ? 'Popup authentication is not supported in this browser context. Please use redirect sign-in instead.'
          : 'Popup authentication is not supported in this embedded browser context.',
        offerRedirect: canRedirect,
      };
    case 'auth/redirect-cancelled-by-user':
    case 'auth/redirect-operation-pending':
      return {
        code: rawCode,
        message: 'Google redirect sign-in was cancelled or interrupted before completing. Please try again.',
        offerRedirect: false,
      };
    case 'auth/network-request-failed':
      return {
        code: rawCode,
        message: 'Network error while contacting Google authentication. Check your internet connection and try again.',
        offerRedirect: false,
      };
    case 'auth/user-disabled':
      return {
        code: rawCode,
        message: 'This Google account has been disabled in Firebase Authentication.',
        offerRedirect: false,
      };
    default:
      if (/access_denied/i.test(rawMessage)) {
        return {
          code: rawCode || 'auth/access-denied',
          message: 'Google permission was declined. Please approve access when prompted to connect Workspace services.',
          offerRedirect: false,
        };
      }
      return {
        code: rawCode || 'auth/unknown',
        message: rawMessage || 'Google authentication failed. Please try again.',
        offerRedirect: canRedirect,
      };
  }
}

function markPendingRedirect(originTab?: string): void {
  try {
    sessionStorage.setItem(PENDING_REDIRECT_KEY, '1');
    if (originTab) {
      sessionStorage.setItem(PENDING_REDIRECT_TAB_KEY, originTab);
    }
  } catch {
    // Ignore storage restriction
  }
}

function consumePendingRedirectFlag(): { wasPending: boolean; returnTab: string | null } {
  try {
    const wasPending = sessionStorage.getItem(PENDING_REDIRECT_KEY) === '1';
    const returnTab = sessionStorage.getItem(PENDING_REDIRECT_TAB_KEY);
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    sessionStorage.removeItem(PENDING_REDIRECT_TAB_KEY);
    return { wasPending, returnTab };
  } catch {
    return { wasPending: false, returnTab: null };
  }
}

// Keep access token strictly in memory (never in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGrantedScopes: string[] = [];

export async function verifyGrantedScopes(token: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { scope?: string; expires_in?: string | number };
    if (data.expires_in !== undefined && Number(data.expires_in) <= 0) {
      return [];
    }
    const scopes = (data.scope || '').split(/\s+/).filter(Boolean);
    cachedGrantedScopes = scopes;
    return scopes;
  } catch {
    return [];
  }
}

export function hasCalendarPermission(scopes: string[] = cachedGrantedScopes): boolean {
  return scopes.includes(CALENDAR_SCOPE) || scopes.includes('https://www.googleapis.com/auth/calendar');
}

export function hasSheetsPermission(scopes: string[] = cachedGrantedScopes): boolean {
  return scopes.includes(SHEETS_SCOPE) || scopes.includes('https://www.googleapis.com/auth/spreadsheets.readonly');
}

export function hasGmailReadPermission(scopes: string[] = cachedGrantedScopes): boolean {
  return scopes.includes(GMAIL_READ_SCOPE) || scopes.includes('https://mail.google.com/');
}

export function hasGmailSendPermission(scopes: string[] = cachedGrantedScopes): boolean {
  return scopes.includes(GMAIL_SEND_SCOPE);
}

interface RedirectResolutionOutcome {
  user: User | null;
  accessToken: string | null;
  grantedScopes: string[];
  returnTab: string | null;
  errorInfo: GoogleAuthErrorInfo | null;
}

let redirectResolutionPromise: Promise<RedirectResolutionOutcome> | null = null;

function resolveRedirectOnce(): Promise<RedirectResolutionOutcome> {
  if (redirectResolutionPromise) return redirectResolutionPromise;

  redirectResolutionPromise = (async () => {
    const { wasPending, returnTab } = consumePendingRedirectFlag();
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken ?? null;
        if (!token) {
          return {
            user: result.user,
            accessToken: null,
            grantedScopes: [],
            returnTab,
            errorInfo: {
              code: 'auth/missing-access-token',
              message:
                'Google sign-in returned without a Workspace access token. Please click Reconnect and allow requested permissions.',
              offerRedirect: false,
            },
          };
        }

        const scopes = await verifyGrantedScopes(token);
        if (scopes.length === 0) {
          return {
            user: result.user,
            accessToken: null,
            grantedScopes: [],
            returnTab,
            errorInfo: {
              code: 'auth/unverified-scopes',
              message:
                'Signed in with Google, but Workspace permissions could not be verified. Please try reconnecting.',
              offerRedirect: false,
            },
          };
        }

        cachedAccessToken = token;
        cachedGrantedScopes = scopes;
        return {
          user: result.user,
          accessToken: token,
          grantedScopes: scopes,
          returnTab,
          errorInfo: null,
        };
      }

      if (wasPending) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        return {
          user: auth.currentUser,
          accessToken: null,
          grantedScopes: [],
          returnTab,
          errorInfo: {
            code: 'auth/redirect-empty-result',
            message: `Returned from Google redirect without an active OAuth session. Your browser may block third-party storage between "${hostname}" and "${configuredAuthDomain}", or "${hostname}" may not be added to Firebase Authorized Domains.`,
            offerRedirect: false,
          },
        };
      }

      return {
        user: null,
        accessToken: null,
        grantedScopes: [],
        returnTab: null,
        errorInfo: null,
      };
    } catch (err) {
      return {
        user: auth.currentUser,
        accessToken: null,
        grantedScopes: [],
        returnTab,
        errorInfo: formatFirebaseAuthError(err),
      };
    }
  })();

  return redirectResolutionPromise;
}

export interface InitGoogleAuthCallbacks {
  onAuthSuccess?: (
    user: User,
    token: string,
    grantedScopes: string[],
    meta?: { fromRedirect?: boolean; returnTab?: string | null }
  ) => void;
  onAuthClear?: (user: User | null) => void;
  onAuthError?: (error: GoogleAuthErrorInfo, returnTab?: string | null) => void;
  onRedirectPendingChange?: (pending: boolean) => void;
}

export const initGoogleAuth = (callbacks: InitGoogleAuthCallbacks) => {
  let active = true;

  // Check if returning from Google redirect
  const hasPendingFlag = (() => {
    try {
      return sessionStorage.getItem(PENDING_REDIRECT_KEY) === '1';
    } catch {
      return false;
    }
  })();

  if (hasPendingFlag) {
    callbacks.onRedirectPendingChange?.(true);
  }

  const redirectTask = resolveRedirectOnce().then((outcome) => {
    if (!active) return outcome;
    callbacks.onRedirectPendingChange?.(false);

    if (outcome.user && outcome.accessToken && outcome.grantedScopes.length > 0) {
      callbacks.onAuthSuccess?.(outcome.user, outcome.accessToken, outcome.grantedScopes, {
        fromRedirect: true,
        returnTab: outcome.returnTab,
      });
    } else if (outcome.errorInfo) {
      callbacks.onAuthError?.(outcome.errorInfo, outcome.returnTab);
    }
    return outcome;
  });

  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    const outcome = await redirectTask;
    if (!active) return;

    // If redirect just delivered a verified token, onAuthSuccess was already fired above
    if (outcome.user && outcome.accessToken && outcome.grantedScopes.length > 0 && cachedAccessToken) {
      return;
    }

    if (user) {
      if (cachedAccessToken) {
        const scopes =
          cachedGrantedScopes.length > 0
            ? cachedGrantedScopes
            : await verifyGrantedScopes(cachedAccessToken);
        if (!active) return;

        if (scopes.length > 0) {
          callbacks.onAuthSuccess?.(user, cachedAccessToken, scopes);
        } else {
          cachedAccessToken = null;
          cachedGrantedScopes = [];
          callbacks.onAuthClear?.(user);
        }
      } else if (!isSigningIn) {
        // User session persisted across page reload; keep signed-in Firebase user while marking Workspace token as needed
        cachedAccessToken = null;
        cachedGrantedScopes = [];
        callbacks.onAuthClear?.(user);
      }
    } else {
      cachedAccessToken = null;
      cachedGrantedScopes = [];
      callbacks.onAuthClear?.(null);
    }
  });

  return () => {
    active = false;
    unsubscribe();
  };
};

export type GoogleSignInResult =
  | {
      status: 'success';
      user: User;
      accessToken: string;
      grantedScopes: string[];
    }
  | {
      status: 'redirecting';
    };

export const googleSignIn = async (
  mode: GoogleSignInMode = 'auto',
  originTab?: string
): Promise<GoogleSignInResult> => {
  if (isSigningIn) {
    throw new GoogleAuthFailure({
      code: 'auth/in-progress',
      message: 'Google sign-in is already in progress.',
      offerRedirect: false,
    });
  }

  const provider = buildGoogleProvider();
  const inIframe = isEmbeddedIframe();

  const startRedirect = async (): Promise<GoogleSignInResult> => {
    if (inIframe) {
      throw new GoogleAuthFailure({
        code: 'auth/iframe-redirect-blocked',
        message:
          'Redirect sign-in cannot load inside an embedded preview frame. Use the popup sign-in button or open the app in a separate browser tab.',
        offerRedirect: false,
      });
    }
    markPendingRedirect(originTab);
    await signInWithRedirect(auth, provider);
    return { status: 'redirecting' };
  };

  try {
    isSigningIn = true;

    if (mode === 'redirect') {
      return await startRedirect();
    }

    // If caller opted into same-origin custom authDomain proxy via env var on a standalone page,
    // redirect sign-in avoids popup blockers while keeping 1st-party storage intact.
    const hasCustomSameOriginDomain =
      Boolean(
        typeof import.meta !== 'undefined' &&
          (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_FIREBASE_AUTH_DOMAIN?.trim()
      ) && !inIframe;

    if (mode === 'auto' && hasCustomSameOriginDomain) {
      return await startRedirect();
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new GoogleAuthFailure({
          code: 'auth/missing-access-token',
          message:
            'Signed in to Google, but no Workspace access token was returned. Please approve the requested permissions and try again.',
          offerRedirect: !inIframe,
        });
      }

      const grantedScopes = await verifyGrantedScopes(credential.accessToken);
      if (grantedScopes.length === 0) {
        throw new GoogleAuthFailure({
          code: 'auth/unverified-scopes',
          message:
            'Could not verify Google Workspace permissions for this session. Please try signing in again.',
          offerRedirect: !inIframe,
        });
      }

      cachedAccessToken = credential.accessToken;
      cachedGrantedScopes = grantedScopes;
      return {
        status: 'success',
        user: result.user,
        accessToken: cachedAccessToken,
        grantedScopes,
      };
    } catch (err) {
      const errorInfo = formatFirebaseAuthError(err);

      // Automatic fallback to signInWithRedirect when popup is blocked or unsupported outside an iframe
      if (
        mode === 'auto' &&
        !inIframe &&
        (errorInfo.code === 'auth/popup-blocked' ||
          errorInfo.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        return await startRedirect();
      }

      throw new GoogleAuthFailure(errorInfo);
    }
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleSignOut = async (): Promise<void> => {
  cachedAccessToken = null;
  cachedGrantedScopes = [];
  await auth.signOut();
};
