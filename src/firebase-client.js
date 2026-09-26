import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without firebaseConfig.firestoreDatabaseId as second argument
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Operation types for standard error handling
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

// Required handleFirestoreError function
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Get user profile document from Firestore
export async function getUserProfile(userId) {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

// Create user profile document in Firestore
export async function createUserDoc(userId, data) {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }
}

// Update user profile document in Firestore
export async function updateUserDoc(userId, data) {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// Ensure user document exists in Firestore
export async function ensureUserProfile(user, extraData = {}) {
  let profile = await getUserProfile(user.uid);
  if (!profile) {
    const newProfile = {
      id: user.uid,
      email: user.email || '',
      fullName: extraData.fullName || user.displayName || user.email?.split('@')[0] || 'Member',
      username: extraData.username || ((user.email?.split('@')[0] || 'user') + Math.floor(100 + Math.random() * 900)),
      phone: extraData.phone || user.phoneNumber || '',
      country: extraData.country || 'Nigeria',
      plan: 'EVERMORE PREMIUM',
      status: 'pending_activation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await createUserDoc(user.uid, newProfile);
    profile = newProfile;
  }
  return profile;
}

// Sign in with Google (recommended & preconfigured in AI Studio)
export async function signInWithGoogle(options = {}) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  let result;
  try {
    result = await signInWithPopup(auth, provider);
  } catch (err) {
    // If popup is blocked and we are running in top-level window (not inside iframe)
    if (err && (err.code === 'auth/popup-blocked' || (err.message && err.message.includes('popup-blocked')))) {
      if (typeof window !== 'undefined' && window.self === window.top) {
        try {
          await signInWithRedirect(auth, provider);
          return { redirecting: true };
        } catch (redirErr) {
          console.warn('signInWithRedirect fallback failed:', redirErr);
        }
      }
    }
    throw err;
  }

  const user = result.user;
  const profile = await ensureUserProfile(user);
  return { user, profile };
}

// Check if user just returned from Google redirect authentication
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const profile = await ensureUserProfile(user);
      return { user, profile };
    }
  } catch (err) {
    console.warn('checkRedirectResult note:', err);
  }
  return null;
}

// Register with Email and Password
export async function registerWithEmailPassword(email, password, extraData = {}) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  const newProfile = {
    id: user.uid,
    email: email.trim().toLowerCase(),
    fullName: extraData.fullName || email.split('@')[0],
    username: extraData.username || (email.split('@')[0] + Math.floor(100 + Math.random() * 900)),
    phone: extraData.phone || '',
    country: extraData.country || 'Nigeria',
    referral: extraData.referral || '',
    plan: 'EVERMORE PREMIUM',
    status: 'pending_activation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await createUserDoc(user.uid, newProfile);
  return { user, profile: newProfile };
}

// Sign in with Email and Password
export async function signInWithEmailPassword(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  const profile = await getUserProfile(user.uid);
  return { user, profile };
}

// Sign out
export async function signOutUser() {
  await signOut(auth);
  try {
    localStorage.removeItem('evermore_profile');
    localStorage.removeItem('evermore_is_authenticated');
    sessionStorage.removeItem('evermore_profile');
  } catch (e) {}
}

// Auth State Listener
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        callback(user, profile);
      } catch (err) {
        callback(user, null);
      }
    } else {
      callback(null, null);
    }
  });
}

// Check if a user is an authorized admin
export async function isUserAdmin(user) {
  if (!user) return false;
  if (user.email && user.email.toLowerCase() === 'tuniprime01@gmail.com') {
    return true;
  }
  try {
    const adminDocRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminDocRef);
    return snap.exists();
  } catch (e) {
    return false;
  }
}

// Fetch all registered users (Admin only)
export async function getAllUsers() {
  const usersPath = 'users';
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    const users = [];
    snapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...docSnap.data() });
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, usersPath);
  }
}

// Update user details or status by Admin
export async function adminUpdateUser(userId, data) {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(userDocRef, updateData);
    return updateData;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// Delete user profile by Admin
export async function adminDeleteUser(userId) {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }
}

// Fetch list of admins
export async function getAdminList() {
  const adminsPath = 'admins';
  try {
    const adminsCol = collection(db, 'admins');
    const snapshot = await getDocs(adminsCol);
    const admins = [];
    snapshot.forEach((docSnap) => {
      admins.push({ id: docSnap.id, ...docSnap.data() });
    });
    return admins;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, adminsPath);
  }
}

// Add an authorized admin record
export async function addAdminRecord(adminId, email, role = 'admin') {
  const adminPath = `admins/${adminId}`;
  try {
    const docRef = doc(db, 'admins', adminId);
    const data = {
      uid: adminId,
      email: email.trim().toLowerCase(),
      role: role
    };
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, adminPath);
  }
}

// Remove an admin record
export async function removeAdminRecord(adminId) {
  const adminPath = `admins/${adminId}`;
  try {
    const docRef = doc(db, 'admins', adminId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, adminPath);
  }
}

export function parseFeeAmount(price) {
  if (!price) return 14850;
  const num = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) || num <= 0 ? 14850 : num;
}

export function formatFeeDisplay(price) {
  const num = parseFeeAmount(price);
  return '₦' + num.toLocaleString();
}

// Get platform settings stored in Firestore
export async function getPlatformSettings() {
  try {
    const publicRef = doc(db, 'settings', 'platform_settings');
    const snap = await getDoc(publicRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {}

  try {
    const adminRef = doc(db, 'admins', 'platform_settings');
    const snap = await getDoc(adminRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (e) {}

  return null;
}

// Listen to platform settings changes in real time
export function onPlatformSettingsChange(callback) {
  const publicRef = doc(db, 'settings', 'platform_settings');
  return onSnapshot(publicRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  }, (err) => {
    console.warn('Settings snapshot listener note:', err);
  });
}

// Save platform settings
export async function savePlatformSettings(data) {
  const cleanPrice = formatFeeDisplay(data.price || data.activationFee || '14850');
  const amount = parseFeeAmount(cleanPrice);
  const payload = {
    ...data,
    price: cleanPrice,
    activationFee: cleanPrice,
    amount: amount,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem('evermore_platform_settings', JSON.stringify(payload));
  } catch (e) {}

  // Write to /settings/platform_settings
  try {
    const publicRef = doc(db, 'settings', 'platform_settings');
    await setDoc(publicRef, payload, { merge: true });
  } catch (err) {
    console.warn('Settings public doc save note:', err);
  }

  // Also write to /admins/platform_settings
  try {
    const adminRef = doc(db, 'admins', 'platform_settings');
    await setDoc(adminRef, payload, { merge: true });
  } catch (err) {
    console.warn('Settings admin doc save note:', err);
  }

  return payload;
}
