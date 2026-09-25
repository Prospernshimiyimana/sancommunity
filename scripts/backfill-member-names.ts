import "dotenv/config";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { readFileSync } from "node:fs";

type UserRecord = {
  uid: string;
  displayName?: string | null;
  username?: string | null;
};

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
  });
}

const db = getFirestore();

async function main() {
  console.log("Starting member name backfill...");

  const usersSnapshot = await db.collection("users").get();

  const users = new Map<string, UserRecord>();

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();

    users.set(doc.id, {
      uid: doc.id,
      displayName:
        typeof data.displayName === "string"
          ? data.displayName.trim()
          : null,
      username:
        typeof data.username === "string"
          ? data.username.trim()
          : null,
    });
  }

  console.log(`Users found: ${users.size}`);

  const membersSnapshot = await db
    .collectionGroup("members")
    .get();

  console.log(`Members found: ${membersSnapshot.size}`);

  let updated = 0;
  let skipped = 0;

  for (const memberDoc of membersSnapshot.docs) {
    const member = memberDoc.data();
    const user = users.get(member.uid);

    if (!user) {
      console.log(`Skipping ${memberDoc.ref.path}: user not found`);
      skipped++;
      continue;
    }

    const displayName =
      user.displayName ||
      user.username ||
      null;

    if (!displayName) {
      console.log(
        `Skipping ${memberDoc.ref.path}: no displayName or username`
      );
      skipped++;
      continue;
    }

    const currentDisplayName =
      typeof member.displayName === "string"
        ? member.displayName.trim()
        : "";

    if (currentDisplayName === displayName) {
      console.log(
        `Already correct: ${memberDoc.ref.path} -> ${displayName}`
      );
      skipped++;
      continue;
    }

    await memberDoc.ref.update({
      displayName,
      updatedAt: new Date(),
    });

    console.log(
      `Updated: ${memberDoc.ref.path} -> ${displayName}`
    );

    updated++;
  }

  console.log("");
  console.log("Backfill complete.");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});