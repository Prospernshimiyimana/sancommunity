import { readFileSync } from "node:fs";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { sanCommunityHouses } from "../data/sancommunity-houses";

function getServiceAccountCredential(): { projectId: string; credential: ReturnType<typeof cert> } | null {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    null;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!projectId && parsed.project_id) {
        return {
          projectId: parsed.project_id,
          credential: cert(parsed),
        };
      }
      if (!projectId) {
        throw new Error("Missing FIREBASE_PROJECT_ID or service account project_id.");
      }
      return {
        projectId,
        credential: cert(parsed),
      };
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON. Provide a Firebase service account object."
      );
    }
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialPath) {
    try {
      const raw = readFileSync(credentialPath, "utf8");
      const parsed = JSON.parse(raw);
      const finalProjectId = projectId ?? parsed.project_id;
      if (!finalProjectId) {
        throw new Error("Missing FIREBASE_PROJECT_ID and a service account JSON project_id.");
      }
      return {
        projectId: finalProjectId,
        credential: cert(parsed),
      };
    } catch (error) {
      throw new Error(
        `GOOGLE_APPLICATION_CREDENTIALS is set but the file could not be read or parsed: ${credentialPath}`
      );
    }
  }

  return null;
}

async function seedSanCommunityHouses() {
  const adminConfig = getServiceAccountCredential();

  if (!adminConfig) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file or set FIREBASE_SERVICE_ACCOUNT_JSON with the service account object, and provide FIREBASE_PROJECT_ID."
    );
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          projectId: adminConfig.projectId,
          credential: adminConfig.credential,
        });

  const db = getFirestore(app);

  const createdOrUpdated: string[] = [];

  for (const house of sanCommunityHouses) {
    const ref = db.collection("houses").doc(house.code);

    await ref.set(
      {
        code: house.code,
        name: house.name,
        country: house.country,
        language: house.language,
        description: house.description,
      },
      { merge: true }
    );

    createdOrUpdated.push(house.code);
  }

  console.log("SanCommunity house seed finished successfully.");
  console.log(`Updated/created documents (${createdOrUpdated.length}): ${createdOrUpdated.join(", ")}`);
  console.log(
    "Note: the legacy manually-created Rwanda House remains separate and will be removed manually later after verification."
  );
}

seedSanCommunityHouses().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown Firebase seed error";
  console.error("SanCommunity house seed aborted.");
  console.error(message);
  process.exitCode = 1;
});
