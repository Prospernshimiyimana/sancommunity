import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  const appCheckGlobal = globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  };

  // Enable Firebase App Check debug mode for local development.
  appCheckGlobal.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider("test-site-key"),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(firebaseApp);

export const db = getFirestore(firebaseApp);