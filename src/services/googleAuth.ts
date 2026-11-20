import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({ prompt: 'consent' });

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
    const data = (await res.json()) as { scope?: string };
    const scopes = (data.scope || '').split(/\s+/).filter(Boolean);
    cachedGrantedScopes = scopes;
    return scopes;
  } catch {
    return [];
  }
}

export function hasGmailSendPermission(scopes: string[] = cachedGrantedScopes): boolean {
  return scopes.includes(GMAIL_SEND_SCOPE);
}

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string, grantedScopes: string[]) => void,
  onAuthClear?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        const scopes =
          cachedGrantedScopes.length > 0
            ? cachedGrantedScopes
            : await verifyGrantedScopes(cachedAccessToken);
        onAuthSuccess?.(user, cachedAccessToken, scopes);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        cachedGrantedScopes = [];
        onAuthClear?.(user);
      }
    } else {
      cachedAccessToken = null;
      cachedGrantedScopes = [];
      onAuthClear?.(null);
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  grantedScopes: string[];
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Workspace access token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    const grantedScopes = await verifyGrantedScopes(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken, grantedScopes };
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
