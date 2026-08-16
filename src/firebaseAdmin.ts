/**
 * Frontend placeholder for firebaseAdmin.
 * The real firebase-admin SDK is only available in the api/ workspace
 * (Node.js context). On the frontend we use the firebase web SDK
 * (see firebase.tsx). This stub keeps imports that reference
 * `firebase-admin` resolvable in browser builds without bundling
 * the admin SDK.
 */

export const firebaseAdmin = {
  initialized: false,
  firestore: null as any,
  auth: null as any,
};

export function initFirebaseAdmin(): void {
  // No-op on the frontend.
}

export default firebaseAdmin;