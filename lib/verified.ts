import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type VerifiedLocal = {
  uid: string;
  houseId: string;
  by?: string | null;
  at?: unknown;
};

function validateUid(uid: string) {
  const trimmed = uid?.trim();

  if (!trimmed) {
    throw new Error("User ID is required.");
  }

  return trimmed;
}

function validateHouseId(houseId: string) {
  const trimmed = houseId?.trim().toUpperCase();

  if (!trimmed) {
    throw new Error("House ID is required.");
  }

  return trimmed;
}

export async function getVerifiedLocals(
  houseId: string
): Promise<VerifiedLocal[]> {
  const validHouseId = validateHouseId(houseId);

  const snapshot = await getDocs(
    collection(db, "verified", validHouseId, "locals")
  );

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      uid: documentSnapshot.id,
      houseId: validHouseId,
      by: typeof data.by === "string" ? data.by : null,
      at: data.at ?? null,
    };
  });
}

export async function isUserVerifiedInHouse(
  uid: string,
  houseId: string
): Promise<boolean> {
  const validUid = validateUid(uid);
  const validHouseId = validateHouseId(houseId);

  const snapshot = await getDocs(
    collection(db, "verified", validHouseId, "locals")
  );

  return snapshot.docs.some(
    (documentSnapshot) => documentSnapshot.id === validUid
  );
}

export async function verifyUserInHouse(
  uid: string,
  houseId: string,
  verifierUid: string
): Promise<void> {
  const validUid = validateUid(uid);
  const validHouseId = validateHouseId(houseId);
  const validVerifierUid = validateUid(verifierUid);

  await setDoc(
    doc(db, "verified", validHouseId, "locals", validUid),
    {
      uid: validUid,
      by: validVerifierUid,
      at: serverTimestamp(),
    }
  );
}

export async function unverifyUserInHouse(
  uid: string,
  houseId: string
): Promise<void> {
  const validUid = validateUid(uid);
  const validHouseId = validateHouseId(houseId);

  await deleteDoc(
    doc(db, "verified", validHouseId, "locals", validUid)
  );
}
