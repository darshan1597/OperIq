import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId,
);

const app = firebaseConfigured ? getApps()[0] || initializeApp(config) : null;
export async function signInWithGoogle() {
    if (!app)
        throw Error(
        "Firebase is not configured. Add the VITE_FIREBASE_* values to client/.env.",
        );
    const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
    return result.user.getIdToken();
}
