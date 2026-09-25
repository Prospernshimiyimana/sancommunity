
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export type HouseMemberRole = "owner" | "admin" | "member";
export type HouseMemberStatus = "active" | "pending";

export type HouseMember = {
  uid: string;
  houseId: string;
  displayName?: string | null;
  email?: string | null;
  role: HouseMemberRole;
  status: HouseMemberStatus;
  joinedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

function requireAuthenticatedUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Authentication required to manage house membership.");
  }

  return user;
}

function getHouseMembersCollection(houseId: string) {
  return collection(db, "houseMembers", houseId, "members");
}

function getHouseMemberDoc(houseId: string, uid: string) {
  return doc(db, "houseMembers", houseId, "members", uid);
}

export async function joinHouse(params: {
  houseId: string;
  uid?: string;
  displayName?: string | null;
  email?: string | null;
}): Promise<void> {
  const user = requireAuthenticatedUser();
  const targetUid = params.uid || user.uid;

  if (!params.houseId || !targetUid) {
    throw new Error("houseId and uid are required to join a house.");
  }

  if (user.uid !== targetUid) {
    throw new Error("You can only join a house for the authenticated user.");
  }

  const memberRef = getHouseMemberDoc(params.houseId, targetUid);
  const existing = await getDoc(memberRef);

  if (existing.exists()) {
    const current = existing.data() as Partial<HouseMember>;

    if (current.role === "owner" || current.role === "admin") {
      throw new Error("You cannot overwrite an existing owner or admin membership.");
    }

    throw new Error("You are already a member of this house.");
  }

  const now = serverTimestamp();

  const providedDisplayName =
  typeof params.displayName === "string"
    ? params.displayName.trim()
    : "";

const authDisplayName =
  typeof user.displayName === "string"
    ? user.displayName.trim()
    : "";

const memberDisplayName =
  providedDisplayName ||
  authDisplayName ||
  null;

const memberData: HouseMember = {
  uid: targetUid,
  houseId: params.houseId,
  displayName: memberDisplayName,
  email: params.email ?? user.email ?? null,
  role: "member",
  status: "active",
  joinedAt: now as unknown as Timestamp,
  createdAt: now as unknown as Timestamp,
  updatedAt: now as unknown as Timestamp,
};

  await setDoc(memberRef, memberData);
}

export async function leaveHouse(
  houseId: string,
  uid?: string
): Promise<void> {
  const user = requireAuthenticatedUser();
  const targetUid = uid || user.uid;

  if (!houseId || !targetUid) {
    throw new Error("houseId and uid are required to leave a house.");
  }

  if (user.uid !== targetUid) {
    throw new Error("You can only leave a house for the authenticated user.");
  }

  await deleteDoc(getHouseMemberDoc(houseId, targetUid));
}

export async function getHouseMembers(
  houseId: string
): Promise<HouseMember[]> {
  if (!houseId) {
    throw new Error("houseId is required to fetch members.");
  }

  const snapshot = await getDocs(getHouseMembersCollection(houseId));

  const members = snapshot.docs.map((documentSnapshot) => ({
    ...(documentSnapshot.data() as HouseMember),
    uid: documentSnapshot.id,
    houseId,
  }));

  return members.sort((a, b) => {
    const left = (a.displayName ?? "Community Member").toLowerCase();
    const right = (b.displayName ?? "Community Member").toLowerCase();

    return left.localeCompare(right);
  });
}

export async function getMyHouseMembership(
  houseId: string,
  uid?: string
): Promise<HouseMember | null> {
  const user = requireAuthenticatedUser();
  const targetUid = uid || user.uid;

  if (!houseId || !targetUid) {
    throw new Error("houseId and uid are required to fetch membership.");
  }

  if (user.uid !== targetUid) {
    throw new Error("You can only fetch your own house membership.");
  }

  const ref = getHouseMemberDoc(houseId, targetUid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as HouseMember;

  return {
    ...data,
    uid: snapshot.id,
    houseId,
  };
}

export async function syncMyMemberDisplayName(
  membership: HouseMember,
  displayName?: string | null
): Promise<HouseMember> {
  const user = requireAuthenticatedUser();

  if (membership.uid !== user.uid) {
    throw new Error("You can only sync your own membership.");
  }

  if (
    membership.role !== "member" ||
    membership.status !== "active"
  ) {
    return membership;
  }

  const providedDisplayName =
    typeof displayName === "string"
      ? displayName.trim()
      : "";

  const authDisplayName =
    typeof user.displayName === "string"
      ? user.displayName.trim()
      : "";

  // Never overwrite an existing member name with null or an empty value.
  const nextDisplayName =
    providedDisplayName || authDisplayName;

  if (!nextDisplayName) {
    return membership;
  }

  const currentDisplayName =
    typeof membership.displayName === "string"
      ? membership.displayName.trim()
      : "";

  if (currentDisplayName === nextDisplayName) {
    return membership;
  }

  await updateDoc(
    getHouseMemberDoc(membership.houseId, user.uid),
    {
      displayName: nextDisplayName,
      updatedAt: serverTimestamp(),
    }
  );

  return {
    ...membership,
    displayName: nextDisplayName,
  };
}

