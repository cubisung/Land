import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

let adminApp: ReturnType<typeof initializeApp> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

export function initFirebaseAdmin() {
  if (adminApp) {
    return storage!;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(serviceAccountJson);
    } catch (e) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON. Received: ${String(serviceAccountJson).slice(0, 200)}`
      );
    }

    adminApp = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      storageBucket: process.env.STORAGE_BUCKET || 'qr-pricing-team-2026.firebasestorage.app',
    });
  } else {
    // Best-effort: try Application Default Credentials when available (Cloud Run, etc.)
    try {
      adminApp = initializeApp({
        credential: applicationDefault(),
        storageBucket: process.env.STORAGE_BUCKET || 'qr-pricing-team-2026.firebasestorage.app',
      });
    } catch (e) {
      throw new Error(
        'Firebase Admin init failed and no FIREBASE_SERVICE_ACCOUNT_JSON was set. ' +
          'Set that env var to a service-account JSON so the server can upload files to Firebase Storage.'
      );
    }
  }

  storage = getStorage(adminApp);
  return storage;
}

export function getStorageInstance() {
  if (!storage) {
    throw new Error('Call initFirebaseAdmin() once at startup before using Firebase Storage.');
  }
  return storage;
}
