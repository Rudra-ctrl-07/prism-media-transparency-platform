/**
 * Compatibility shim that re-exports the New_Prizm Firebase setup
 * with helper functions expected by code merged from Prizm_Large/prism.
 */

export { auth, db, useAuth, AuthProvider, FirebaseAppProvider } from './firebase';
export type { AuthContextType } from './firebase';
import { auth } from './firebase';

/**
 * Returns a header object with the current user's ID token if signed in.
 * Used by components merged from Prizm_Large / prism to call backend
 * endpoints that require authentication.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = auth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}