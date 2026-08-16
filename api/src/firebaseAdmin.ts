import admin from "firebase-admin";
import { getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccountEncoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEncoded) {
    try {
      const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountEncoded, "base64").toString("utf8")
      );
      admin.initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error(
        "[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT:",
        error
      );
    }
  } else {
    console.warn(
      "[Firebase Admin] FIREBASE_SERVICE_ACCOUNT not set. Admin SDK will not be initialized."
    );
  }
}

// Export the initialized services
export const adminAdmin = admin;
export { admin };
export default admin;
export const auth = getAuth();
export const db = getFirestore();