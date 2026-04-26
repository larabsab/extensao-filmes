import { initializeApp } from "firebase/app";
import {
  confirmPasswordReset,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  verifyPasswordResetCode
} from "firebase/auth";

function getApiBaseUrl() {
  const rawBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
  return rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl}/api`;
}

const API_BASE_URL = getApiBaseUrl();
const CLOUDINARY_CLOUD_NAME = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_UPLOAD_PRESET = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
const CLOUDINARY_AVATAR_FOLDER = String(import.meta.env.VITE_CLOUDINARY_AVATAR_FOLDER || 'ttddflix/avatars').trim();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

async function syncFirebaseSession(payload = {}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Nenhum usuario autenticado no Firebase.');
  }

  const idToken = await currentUser.getIdToken(true);
  const response = await fetch(`${API_BASE_URL}/auth/firebase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: idToken,
      ...payload
    })
  });

  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('O backend nao retornou JSON. Confira se o servidor esta rodando em http://localhost:3000.');
  }

  if (!response.ok) {
    const message = [data.error, data.details].filter(Boolean).join(': ');
    throw new Error(message || 'Nao foi possivel sincronizar a sessao com o backend.');
  }

  localStorage.setItem('token', data.token);
  return data;
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, googleProvider);
  return syncFirebaseSession();
}

export async function registerWithEmailPassword({ email, password, displayName, icon }) {
  await createUserWithEmailAndPassword(auth, email, password);
  return syncFirebaseSession({ displayName, icon });
}

export async function loginWithEmailPassword(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  return syncFirebaseSession();
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: false
  });
  return {
    message: 'Se existir uma conta com esse email, enviamos um link de redefinicao.'
  };
}

export async function verifyResetCode(actionCode) {
  return verifyPasswordResetCode(auth, actionCode);
}

export async function confirmFirebasePasswordReset(actionCode, newPassword) {
  await confirmPasswordReset(auth, actionCode, newPassword);
  return {
    message: 'Sua senha foi redefinida. Agora voce ja pode entrar normalmente.'
  };
}

export async function updateFirebaseUserPassword({ email, currentPassword, newPassword, hasPasswordProvider }) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessao do Firebase nao esta ativa.');
  }

  if (hasPasswordProvider) {
    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    return syncFirebaseSession();
  }

  const credential = EmailAuthProvider.credential(email, newPassword);
  await linkWithCredential(currentUser, credential);
  return syncFirebaseSession();
}

export async function uploadCurrentUserAvatar(file) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Sua sessao do Firebase nao esta ativa.');
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary ainda nao foi configurado no web.');
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  body.append('folder', `${CLOUDINARY_AVATAR_FOLDER}/${currentUser.uid}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || 'Nao foi possivel enviar a imagem do avatar.';
    throw new Error(message);
  }

  return {
    avatarUrl: data.secure_url || data.url || '',
    avatarPublicId: data.public_id || ''
  };
}

export async function logoutFirebase() {
  await signOut(auth);
}
