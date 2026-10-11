import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createPrivateKey } from "node:crypto";

function normalizePrivateKey(value) {
    const privateKey = value.replace(/\\n/g, "\n").trim();
    try {
        createPrivateKey(privateKey);
        return privateKey;
    } catch {
        throw Object.assign(
            Error("Firebase Admin private key is invalid. Copy the complete private_key value from the downloaded service-account JSON into FIREBASE_PRIVATE_KEY."),
            { status: 503 },
        );
    }
}

function adminApp() {
    if (getApps().length) return getApps()[0];
    const {
        FIREBASE_PROJECT_ID: projectId,
        FIREBASE_CLIENT_EMAIL: clientEmail,
        FIREBASE_PRIVATE_KEY: key,
    } = process.env;
    if (!projectId || !clientEmail || !key)
        throw Object.assign(
            Error("Firebase Google authentication is not configured"),
            { status: 503 },
        );
    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey: normalizePrivateKey(key),
        }),
    });
}

export const verifyGoogleToken = (token) => getAuth(adminApp()).verifyIdToken(token, true);
