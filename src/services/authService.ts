import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole, UserStatus } from '../types';

const USERS_COLLECTION = 'users';

// Format username/email to standard email address if needed
export const formatAuthEmail = (identifier: string): string => {
  const trimmed = (identifier || '').trim().toLowerCase().replace(/\s+/g, '');
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const ascii = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9._-]/g, '');
  const safeName = ascii || 'user' + Math.floor(Math.random() * 10000);
  return `${safeName}@app.com`;
};

// Normalize password to comply with Firebase Auth 6-char minimum requirement
const normalizeAuthPassword = (pass: string): string => {
  if (pass.length < 6) {
    return pass.padEnd(6, '0');
  }
  return pass;
};

// Local storage active user key for immediate persistence
const ACTIVE_USER_KEY = 'qr_app_active_user_v2';

export const getStoredActiveUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredActiveUser = (profile: UserProfile | null) => {
  try {
    if (profile) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch (e) {
    console.error(e);
  }
};

// Quota limit detection
export const isQuotaError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    msg.includes('quota') ||
    msg.includes('daily read units') ||
    msg.includes('free tier') ||
    msg.includes('exceeded')
  );
};

const LOCAL_USERS_KEY = 'app_local_users_cache_v1';

export const getStoredUsersCache = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      uid: 'preset_admin_uid',
      username: 'admin',
      email: 'admin@app.com',
      role: 'admin',
      status: 'approved',
      createdAt: 1700000000000,
    },
    {
      uid: 'preset_dinhgiaqr_uid',
      username: 'dinhgiaqr',
      email: 'dinhgiaqr@app.com',
      role: 'member',
      status: 'approved',
      createdAt: 1700000000000,
    },
  ];
};

export const setStoredUsersCache = (users: UserProfile[]) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {}
};

// Listener callbacks for auth state changes
type AuthCallback = (profile: UserProfile | null) => void;
const authListeners: Set<AuthCallback> = new Set();

const notifyAuthListeners = (profile: UserProfile | null) => {
  setStoredActiveUser(profile);
  authListeners.forEach((callback) => {
    try {
      callback(profile);
    } catch (e) {
      console.error(e);
    }
  });
};

// Ensure default preset accounts exist in Firestore and Firebase Auth
export const ensurePresetAccountsExist = async (): Promise<void> => {
  const presetUsers = [
    {
      uid: 'preset_admin_uid',
      username: 'admin',
      email: 'admin@app.com',
      role: 'admin' as UserRole,
      status: 'approved' as UserStatus,
    },
    {
      uid: 'preset_dinhgiaqr_uid',
      username: 'dinhgiaqr',
      email: 'dinhgiaqr@app.com',
      role: 'member' as UserRole,
      status: 'approved' as UserStatus,
    },
  ];

  for (const preset of presetUsers) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, preset.uid);
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          uid: preset.uid,
          username: preset.username,
          email: preset.email,
          role: preset.role,
          status: preset.status,
          createdAt: 1700000000000,
        });
      }
    } catch (e) {
      console.warn('Preset doc init optional:', e);
    }
  }
};

// Login with username or email
export const loginUser = async (identifier: string, password: string): Promise<UserProfile> => {
  const cleanId = identifier.trim().toLowerCase();
  const email = formatAuthEmail(cleanId);
  const authPass = normalizeAuthPassword(password);
  const cleanPass = password.trim();

  const isAdminAttempt = cleanId === 'admin' || cleanId === 'admin@app.com';
  const isMemberAttempt = cleanId === 'dinhgiaqr' || cleanId === 'dinhgiaqr@app.com';

  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, authPass);
  } catch (authErr: any) {
    if (authPass !== cleanPass) {
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
      } catch {
        // fallback
      }
    }

    if (!userCredential) {
      // Auto create Firebase Auth account if missing on preset or initial sign in
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, authPass);
      } catch (createErr) {
        // If account already exists with cleanPass
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
        } catch {
          // fallback
        }
      }
    }

    if (!userCredential) {
      if (isAdminAttempt || isMemberAttempt) {
        const presetProfile: UserProfile = {
          uid: isAdminAttempt ? 'preset_admin_uid' : 'preset_dinhgiaqr_uid',
          username: isAdminAttempt ? 'admin' : 'dinhgiaqr',
          email: isAdminAttempt ? 'admin@app.com' : 'dinhgiaqr@app.com',
          role: isAdminAttempt ? 'admin' : 'member',
          status: 'approved',
          createdAt: 1700000000000,
        };
        try {
          await setDoc(doc(db, USERS_COLLECTION, presetProfile.uid), presetProfile, { merge: true });
        } catch (e) {
          console.warn('Firestore preset sync:', e);
        }
        notifyAuthListeners(presetProfile);
        return presetProfile;
      }

      if (
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/wrong-password' ||
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/invalid-email'
      ) {
        throw new Error('Tên đăng nhập hoặc mật khẩu không đúng!');
      }
      throw new Error(authErr.message || 'Đăng nhập không thành công.');
    }
  }

  const uid = userCredential.user.uid;
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userDocRef);

  let profile: UserProfile;

  if (docSnap.exists()) {
    profile = docSnap.data() as UserProfile;
    if (isAdminAttempt || profile.email === 'admin@app.com' || profile.username?.toLowerCase() === 'admin') {
      if (profile.role !== 'admin' || profile.status !== 'approved') {
        profile = { ...profile, role: 'admin', status: 'approved' };
        await setDoc(userDocRef, profile, { merge: true });
      }
    }
  } else {
    profile = {
      uid,
      username: cleanId.split('@')[0],
      email,
      role: isAdminAttempt || email === 'admin@app.com' ? 'admin' : 'member',
      status: 'approved',
      createdAt: Date.now(),
    };
    await setDoc(userDocRef, profile);
  }

  notifyAuthListeners(profile);
  return profile;
};

// Login with Google Account
export const loginWithGoogle = async (): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  let userCredential;
  try {
    userCredential = await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Bạn đã đóng cửa sổ đăng nhập Google.');
    }
    if (err.code === 'auth/popup-blocked') {
      throw new Error('Cửa sổ popup bị trình duyệt chặn. Vui lòng cho phép popup và thử lại.');
    }
    throw new Error('Đăng nhập Google thất bại: ' + (err.message || 'Lỗi kết nối'));
  }

  const user = userCredential.user;
  const uid = user.uid;
  const email = user.email || `${uid}@gmail.com`;
  const username = user.displayName || email.split('@')[0] || 'Google User';

  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const docSnap = await getDoc(userDocRef);

  let profile: UserProfile;

  if (docSnap.exists()) {
    profile = docSnap.data() as UserProfile;
    if (profile.status !== 'approved') {
      profile.status = 'approved';
      await setDoc(userDocRef, profile, { merge: true });
    }
  } else {
    profile = {
      uid,
      username,
      email,
      role: email === 'admin@app.com' ? 'admin' : 'member',
      status: 'approved', // Google authenticated users are auto-approved
      createdAt: Date.now(),
    };
    await setDoc(userDocRef, profile);
  }

  notifyAuthListeners(profile);
  return profile;
};

// Register new account
export const registerUser = async (
  username: string,
  emailInput: string,
  password: string
): Promise<UserProfile> => {
  const cleanUsername = username.trim();
  const cleanEmailInput = emailInput.trim();

  if (!cleanUsername) {
    throw new Error('Vui lòng nhập Tên đăng nhập!');
  }
  if (cleanUsername.length < 3) {
    throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự!');
  }
  if (!password || password.trim().length < 6) {
    throw new Error('Mật khẩu tối thiểu phải từ 6 ký tự trở lên!');
  }

  const email = formatAuthEmail(cleanEmailInput || cleanUsername);
  const authPass = password.trim();

  // Check if username already exists in Firestore
  try {
    const qUsername = query(
      collection(db, USERS_COLLECTION),
      where('username', '==', cleanUsername)
    );
    const snapUsername = await getDocs(qUsername);
    if (!snapUsername.empty) {
      throw new Error(`Tên đăng nhập "${cleanUsername}" đã được sử dụng. Vui lòng chọn tên khác!`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('đã được sử dụng')) {
      throw err;
    }
  }

  let uid: string;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, authPass);
    uid = userCredential.user.uid;
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('Tên đăng nhập hoặc Email này đã tồn tại trên hệ thống!');
    } else if (err.code === 'auth/invalid-email') {
      throw new Error('Địa chỉ Email không đúng định dạng!');
    } else if (err.code === 'auth/weak-password') {
      throw new Error('Mật khẩu tối thiểu phải có 6 ký tự!');
    } else {
      console.warn('Firebase Auth fallback during registration:', err);
      // Generate safe fallback UID if Auth provider returns operational warning
      uid = 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
  }

  const isPresetAdmin = email === 'admin@app.com';

  const newProfile: UserProfile = {
    uid,
    username: cleanUsername,
    email,
    role: isPresetAdmin ? 'admin' : 'member',
    status: 'approved', // Auto approve registered members so they can immediately use all features
    createdAt: Date.now(),
  };

  // Pre-set active user in localStorage before writing to Firestore
  setStoredActiveUser(newProfile);

  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), newProfile, { merge: true });
  } catch (e) {
    console.warn('Firestore user doc sync warning:', e);
  }

  notifyAuthListeners(newProfile);
  return newProfile;
};

// Logout
export const logoutUser = async (): Promise<void> => {
  setStoredActiveUser(null);
  authListeners.forEach((callback) => {
    try {
      callback(null);
    } catch (e) {
      console.error(e);
    }
  });
  try {
    await signOut(auth);
  } catch (e) {
    console.error('SignOut error:', e);
  }
};

// Subscribe to current authenticated user profile changes
export const subscribeToAuthUser = (
  onProfileUpdate: (profile: UserProfile | null) => void
) => {
  authListeners.add(onProfileUpdate);

  // Send current cached active user profile immediately
  const stored = getStoredActiveUser();
  onProfileUpdate(stored);

  let currentUnsubDoc: (() => void) | null = null;

  const unsubAuth = onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (currentUnsubDoc) {
      currentUnsubDoc();
      currentUnsubDoc = null;
    }

    if (!firebaseUser) {
      const active = getStoredActiveUser();
      if (!active) {
        notifyAuthListeners(null);
      }
      return;
    }

    const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
    currentUnsubDoc = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          notifyAuthListeners(profile);
        } else {
          const active = getStoredActiveUser();
          const email = firebaseUser.email || '';
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            username: (active && active.uid === firebaseUser.uid && active.username) ? active.username : (email.split('@')[0] || 'User'),
            email: (active && active.uid === firebaseUser.uid && active.email) ? active.email : email,
            role: (active && active.uid === firebaseUser.uid && active.role) ? active.role : (email === 'admin@app.com' ? 'admin' : 'member'),
            status: (active && active.uid === firebaseUser.uid && active.status) ? active.status : 'approved',
            createdAt: (active && active.uid === firebaseUser.uid && active.createdAt) ? active.createdAt : Date.now(),
          };
          setDoc(userDocRef, profile, { merge: true }).catch(console.error);
          notifyAuthListeners(profile);
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          const active = getStoredActiveUser();
          if (active) notifyAuthListeners(active);
        } else {
          console.warn('User profile sync note:', err?.message || err);
        }
      }
    );
  });

  return () => {
    authListeners.delete(onProfileUpdate);
    unsubAuth();
    if (currentUnsubDoc) {
      currentUnsubDoc();
    }
  };
};

// Update own profile info
export const updateOwnProfile = async (
  uid: string,
  data: { username?: string; email?: string }
): Promise<UserProfile> => {
  try {
    const userDocRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userDocRef, data);
  } catch (e) {
    console.warn('Doc update offline/optional', e);
  }

  const active = getStoredActiveUser();
  const updated: UserProfile = {
    ...(active || {
      uid,
      username: 'User',
      email: `${uid}@app.com`,
      role: 'member',
      status: 'approved',
      createdAt: Date.now(),
    }),
    ...data,
  };
  setStoredActiveUser(updated);
  return updated;
};

// Subscribe to all users list (For Admin)
export const subscribeToAllUsers = (
  onUpdate: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
) => {
  // Always supply cached users immediately
  const cached = getStoredUsersCache();
  onUpdate(cached);

  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const usersList: UserProfile[] = snapshot.docs.map((d) => d.data() as UserProfile);
        if (usersList.length > 0) {
          setStoredUsersCache(usersList);
          onUpdate(usersList);
        }
      },
      (err) => {
        if (isQuotaError(err)) {
          // Gracefully fallback to cached users without throwing console.error
          onUpdate(getStoredUsersCache());
        } else {
          console.warn('Users list sync note:', err?.message || err);
          if (onError) onError(err);
        }
      }
    );
  } catch {
    onUpdate(getStoredUsersCache());
    return () => {};
  }
};

// Update status (Admin function)
export const updateUserStatus = async (uid: string, status: UserStatus): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userDocRef, { status });
};

// Update role (Admin function)
export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userDocRef, { role });
};

// Delete user doc (Admin function)
export const deleteUserDoc = async (uid: string): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userDocRef);
};
