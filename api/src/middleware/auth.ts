import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { DecodedIdToken } from 'firebase-admin/auth';

// Augment Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

function isFirebaseConfigured(): boolean {
  // A default Firebase app is always initialized even without credentials, so
  // key off the service account env var rather than getAuth() throwing.
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // Zero-config mode: when no Firebase Admin service account is configured,
  // auth is a pass-through so the API (and its in-memory article store) works
  // out of the box. Real deployments with Firebase enforce token verification.
  if (!isFirebaseConfigured()) {
    next();
    return;
  }

  const idToken = req.headers.authorization?.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).send('Unauthorized: No token provided');
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).send('Unauthorized: Invalid token');
  }
};

export const authorizePro = async (req: Request, res: Response, next: NextFunction) => {
  // Zero-config mode: mirror `authenticate` and pass through so the app runs
  // without Firebase configured. Real deployments (service account set) enforce
  // the Pro gate against Firestore's users/<uid>.isPro flag.
  if (!isFirebaseConfigured()) {
    next();
    return;
  }

  // This middleware assumes that the user has been authenticated by the authenticate middleware
  // and that req.user is set.
  const uid = req.user?.uid;
  if (!uid) {
    return res.status(401).send('Unauthorized: No user ID');
  }

  try {
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const isPro = userData?.isPro ?? false;

    if (!isPro) {
      return res.status(403).send('Forbidden: Pro subscription required');
    }
    next();
  } catch (error) {
    console.error('Error checking user subscription status:', error);
    return res.status(500).send('Internal Server Error');
  }
};