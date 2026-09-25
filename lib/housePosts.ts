import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export type HousePost = {
  id: string;
  houseId: string;
  authorUid: string;
  authorName: string;
  title: string;
  content: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};
export type HousePostTranslation = {
  title: string;
  content: string;
  language: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};


function validateHouseId(houseId: string) {
  const trimmed = houseId?.trim();

  if (!trimmed) {
    throw new Error("houseId is required.");
  }

  return trimmed;
}

function validateHousePostTitle(title: string) {
  const trimmed = title?.trim();

  if (!trimmed) {
    throw new Error("Post title is required.");
  }

  if (trimmed.length > 150) {
    throw new Error("Post title must be 150 characters or fewer.");
  }

  return trimmed;
}

function validateHousePostContent(content: string) {
  const trimmed = content?.trim();

  if (!trimmed) {
    throw new Error("Post content is required.");
  }

  if (trimmed.length > 5000) {
    throw new Error("Post content must be 5000 characters or fewer.");
  }

  return trimmed;
}
function getHousePostTranslationDoc(
  postId: string,
  language: string
) {
  const normalizedPostId = postId?.trim();
  const normalizedLanguage = language?.trim().toLowerCase();

  if (!normalizedPostId) {
    throw new Error("postId is required.");
  }

  if (!normalizedLanguage) {
    throw new Error("Translation language is required.");
  }

  return doc(
    db,
    "housePosts",
    normalizedPostId,
    "translations",
    normalizedLanguage
  );
}

export async function getHousePostTranslation(
  postId: string,
  language: string
): Promise<HousePostTranslation | null> {
  const translationRef = getHousePostTranslationDoc(postId, language);
  const snapshot = await getDoc(translationRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Partial<HousePostTranslation>;

  return {
    title: data.title ?? "",
    content: data.content ?? "",
    language: data.language ?? language.trim(),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function saveHousePostTranslation(params: {
  postId: string;
  language: string;
  title: string;
  content: string;
}): Promise<void> {
  const translationRef = getHousePostTranslationDoc(
    params.postId,
    params.language
  );

  const title = params.title?.trim();
  const content = params.content?.trim();
  const language = params.language?.trim().toLowerCase();

  if (!title) {
    throw new Error("Translated post title is required.");
  }

  if (!content) {
    throw new Error("Translated post content is required.");
  }

  if (!language) {
    throw new Error("Translation language is required.");
  }

  const now = serverTimestamp();

  await setDoc(translationRef, {
    title,
    content,
    language,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getHousePosts(houseId: string): Promise<HousePost[]> {
  const validHouseId = validateHouseId(houseId);

  let snapshot;

  try {
    snapshot = await getDocs(collection(db, "housePosts"));
  } catch (error) {
    console.error("SanCommunity: failed to load house posts", error);
    throw error;
  }

  const posts = snapshot.docs
    .map((documentSnapshot) => {
      const data = documentSnapshot.data() as Partial<HousePost>;

      return {
        id: documentSnapshot.id,
        houseId: data.houseId ?? "",
        authorUid: data.authorUid ?? "",
        authorName: data.authorName ?? "Community Member",
        title: data.title ?? "",
        content: data.content ?? "",
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      } satisfies HousePost;
    })
    .filter((post) => post.houseId === validHouseId);

  return posts.sort((left, right) => {
    const leftTime = left.createdAt ? left.createdAt.toMillis() : 0;
    const rightTime = right.createdAt ? right.createdAt.toMillis() : 0;

    return rightTime - leftTime;
  });
}

export async function createHousePost(params: {
  houseId: string;
  title: string;
  content: string;
}): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Authentication required to create a house post.");
  }

  const houseId = validateHouseId(params.houseId);
  const title = validateHousePostTitle(params.title);
  const content = validateHousePostContent(params.content);

  const now = serverTimestamp();

  await addDoc(collection(db, "housePosts"), {
    houseId,
    authorUid: user.uid,
    authorName: user.displayName?.trim() || "Community Member",
    title,
    content,
    createdAt: now,
    updatedAt: now,
  });
}
