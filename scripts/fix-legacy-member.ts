import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
  throw new Error(
    "GOOGLE_APPLICATION_CREDENTIALS is not set."
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert(require(serviceAccountPath)),
  });
}

const db = getFirestore();

async function main() {
  const houseId = "JP";
  const uid = "NP3VHDZvcjdUNnOBhEeGQDjomnM2";

  const memberRef = db
    .collection("houseMembers")
    .doc(houseId)
    .collection("members")
    .doc(uid);

  const snapshot = await memberRef.get();

  if (!snapshot.exists) {
    throw new Error("Legacy member document was not found.");
  }

  const data = snapshot.data() ?? {};

  console.log("Before:", data);

  await memberRef.update({
    role: "member",
    status: "active",
  });

  await memberRef.update({
    "role ": null,
    "status ": null,
  });

  console.log("Legacy member fields fixed.");
  
  const updated = await memberRef.get();

  console.log("After:", updated.data());
}

main().catch((error) => {
  console.error("Fix failed:", error);
  process.exit(1);
});