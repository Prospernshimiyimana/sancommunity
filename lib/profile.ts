import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type UserProfile = {
  uid: string;
  email: string | null;
  username: string;
  displayName: string;
  country: string;
  language: string;
  createdAt?: unknown;
};

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: {
    username: string;
    displayName: string;
    country: string;
    language: string;
  }
) {
  await updateDoc(doc(db, "users", uid), {
    username: data.username.trim(),
    displayName: data.displayName.trim(),
    country: data.country.trim(),
    language: data.language.trim(),
    updatedAt: serverTimestamp(),
  });
}