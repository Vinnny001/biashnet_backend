import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "../utils/logger.js";

function getCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are missing. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return cert({ projectId, clientEmail, privateKey });
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: getCredential(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

if (!getApps().length) logger.info("Firebase Admin initialized");

export const firebaseAdmin = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const bucket = process.env.FIREBASE_STORAGE_BUCKET
  ? getStorage(app).bucket()
  : null;
export { FieldValue, Timestamp };