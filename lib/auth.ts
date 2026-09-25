
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function signUp(
  email: string,
  password: string,
  username: string,
  displayName: string,
  country: string,
  language: string
) {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = result.user;

  await updateProfile(user, {
    displayName: displayName.trim(),
  });

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: username.trim(),
    displayName: displayName.trim(),
    country: country.trim(),
    language: language.trim(),
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function login(
  email: string,
  password: string
) {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
}

export async function updateAuthDisplayName(
  user: User,
  displayName: string
) {
  await updateProfile(user, {
    displayName: displayName.trim(),
  });
}

export async function logout() {
  await signOut(auth);
}

export function onUserChange(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}

