"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { onUserChange } from "@/lib/auth";
import { getMyHouseMembership, type HouseMember } from "@/lib/houseMembers";
import { auth } from "@/lib/firebase";
import {
  createHousePost,
  getHousePosts,
  getHousePostTranslation,
  saveHousePostTranslation,
  type HousePost,
} from "@/lib/housePosts";
import {
  getTranslationErrorMessage,
  translatePost,
} from "@/lib/ai-translation";

type HousePostsProps = {
  houseId: string;
  houseLanguage: string;
  onPostsChange?: (posts: HousePost[]) => void;
};
type TranslationState = {
  title: string;
  content: string;
};

const SKELETON_COUNT = 3;

function formatDisplayDate(value?: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatTimestamp(
  value?: { toDate?: () => Date } | null
): string | null {
  if (!value || typeof value.toDate !== "function") {
    return null;
  }

  return formatDisplayDate(value.toDate()) ?? null;
}

function hasMeaningfulUpdate(post: HousePost) {
  if (!post.createdAt || !post.updatedAt) {
    return false;
  }

  return post.updatedAt.toMillis() - post.createdAt.toMillis() > 1000;
}

export default function HousePosts({
  houseId,
  houseLanguage,
  onPostsChange,
}: HousePostsProps) {
  const [posts, setPosts] = useState<HousePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const [membership, setMembership] = useState<HouseMember | null>(null);
  const [membershipChecking, setMembershipChecking] = useState(true);

  const [translations, setTranslations] = useState<
    Record<string, TranslationState>
  >({});

  const [translatingPostId, setTranslatingPostId] = useState<string | null>(
    null
  );

  const [translationErrors, setTranslationErrors] = useState<
    Record<string, string>
  >({});

  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [createPostError, setCreatePostError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onUserChange((nextUser) => {
      if (!active) {
        return;
      }

      setUser(nextUser);
      setAuthReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const requestIdRef = useRef(0);

  const loadPosts = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (!auth.currentUser) {
      setPosts([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getHousePosts(houseId);

if (requestId !== requestIdRef.current) {
  return;
}

const savedTranslations = await Promise.all(
  data.map(async (post) => {
    const translation = await getHousePostTranslation(
      post.id,
      houseLanguage
    );

    return translation
      ? {
          postId: post.id,
          translation: {
            title: translation.title,
            content: translation.content,
          },
        }
      : null;
  })
);

if (requestId !== requestIdRef.current) {
  return;
}

const nextTranslations: Record<string, TranslationState> = {};

for (const savedTranslation of savedTranslations) {
  if (savedTranslation) {
    nextTranslations[savedTranslation.postId] =
      savedTranslation.translation;
  }
}

setPosts(data);
onPostsChange?.(data);
setTranslations(nextTranslations);
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setPosts([]);
      setError("Unable to load house posts right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
   }, [houseId, houseLanguage]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!user) {
      requestIdRef.current += 1;
      setPosts([]);
      setError(null);
      setLoading(false);
      return;
    }

    void loadPosts();

    return () => {
      requestIdRef.current += 1;
    };
  }, [authReady, user, loadPosts]);

  useEffect(() => {
    let active = true;

    async function loadMembership() {
      if (!user) {
        setMembership(null);
        setMembershipChecking(false);
        return;
      }

      setMembershipChecking(true);

      try {
        const nextMembership = await getMyHouseMembership(
          houseId,
          user.uid
        );

        if (!active) {
          return;
        }

        setMembership(nextMembership);
      } catch (membershipError) {
        if (!active) {
          return;
        }

        console.error(
          "SanCommunity: failed to check house membership",
          membershipError
        );
        setMembership(null);
      } finally {
        if (active) {
          setMembershipChecking(false);
        }
      }
    }

    void loadMembership();

    return () => {
      active = false;
    };
  }, [houseId, user]);

  async function handleCreatePost() {
    if (creatingPost) {
      return;
    }

    if (!user) {
      setCreatePostError("Sign in to create a post.");
      return;
    }

    if (membershipChecking) {
      setCreatePostError("Checking your House membership...");
      return;
    }

    if (!membership) {
      setCreatePostError(
        "Join this House first to create a post."
      );
      return;
    }

    setCreatePostError(null);

    try {
      setCreatingPost(true);

      await createHousePost({
        houseId,
        title: postTitle,
        content: postContent,
      });

      setPostTitle("");
      setPostContent("");

      await loadPosts();
    } catch (createError) {
      setCreatePostError(
        createError instanceof Error
          ? createError.message
          : "Unable to create this post right now."
      );
    } finally {
      setCreatingPost(false);
    }
  }

  async function handleTranslate(post: HousePost) {
  if (translations[post.id]) {
    return;
  }

  if (translatingPostId) {
    return;
  }

  setTranslatingPostId(post.id);

  setTranslationErrors((current) => {
    const next = { ...current };
    delete next[post.id];
    return next;
  });

  try {
    const savedTranslation = await getHousePostTranslation(
      post.id,
      houseLanguage
    );

    if (savedTranslation) {
      setTranslations((current) => ({
        ...current,
        [post.id]: {
          title: savedTranslation.title,
          content: savedTranslation.content,
        },
      }));
      return;
    }

    const translation = await translatePost(
      post.title,
      post.content,
      houseLanguage
    );

    await saveHousePostTranslation({
      postId: post.id,
      language: houseLanguage,
      title: translation.title,
      content: translation.content,
    });

    setTranslations((current) => ({
      ...current,
      [post.id]: translation,
    }));
  } catch (translationError) {
    console.error(
      "SanCommunity: house-post translation failed:",
      translationError
    );

    setTranslationErrors((current) => ({
      ...current,
      [post.id]: getTranslationErrorMessage(translationError),
    }));
  } finally {
    setTranslatingPostId(null);
  }
}

  if (authReady && !user) {
    return (
      <div className="house-posts__signed-out" aria-live="polite">
        Sign in to see posts in this House
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <p className="house-posts__status" role="status">
          Loading posts
        </p>

        <div className="house-posts__skeletons" aria-hidden="true">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div className="house-post-skeleton" key={index}>
              <span className="house-post-skeleton__line house-post-skeleton__line--title" />
              <span className="house-post-skeleton__line" />
              <span className="house-post-skeleton__line" />
              <span className="house-post-skeleton__line house-post-skeleton__line--short" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="house-posts__error" role="alert">
        <p className="house-posts__error-text">{error}</p>

        <button
          type="button"
          className="house-posts__retry"
          onClick={() => void loadPosts()}
        >
          Try again
        </button>
      </div>
    );
  }

  const countLabel = `${posts.length} ${
    posts.length === 1 ? "post" : "posts"
  }`;

  return (
    <>
      <form
        className="house-posts__create"
        onSubmit={(event) => {
          event.preventDefault();
          void handleCreatePost();
        }}
      >
        <div className="house-posts__create-header">
          <h3 className="house-posts__create-title">
            Create a Post
          </h3>
          <p className="house-posts__create-note">
            Share something useful with this House.
          </p>
        </div>

        <label className="house-posts__field">
          <span className="house-posts__field-label">Title</span>
          <input
            type="text"
            value={postTitle}
            onChange={(event) => {
              setPostTitle(event.target.value);
              setCreatePostError(null);
            }}
            maxLength={150}
            placeholder="Post title"
            disabled={creatingPost}
            required
          />
        </label>

        <label className="house-posts__field">
          <span className="house-posts__field-label">Content</span>
          <textarea
            value={postContent}
            onChange={(event) => {
              setPostContent(event.target.value);
              setCreatePostError(null);
            }}
            maxLength={5000}
            rows={5}
            placeholder="Write your post..."
            disabled={creatingPost}
            required
          />
        </label>

        {createPostError && (
          <div className="house-posts__create-error" role="alert">
            {createPostError}
          </div>
        )}

        <div className="house-posts__create-actions">
          <span className="house-posts__character-count">
            {postContent.length}/5000
          </span>

          <button
            type="submit"
            className="house-posts__create-button"
            disabled={
              creatingPost ||
              !postTitle.trim() ||
              !postContent.trim()
            }
          >
            {creatingPost ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </form>

      <div className="house-posts__header">
        <p className="house-posts__count" aria-live="polite">
          {countLabel}
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="house-posts__empty" aria-live="polite">
          No posts yet.
        </div>
      ) : (
        <ul className="house-posts__list" aria-label="House posts list">
        {posts.map((post) => {
          const authorName =
            post.authorName?.trim() || "Community Member";

          const createdDate = formatTimestamp(post.createdAt);
          const updatedDate = formatTimestamp(post.updatedAt);
          const showUpdatedDate =
            hasMeaningfulUpdate(post) && updatedDate;

          const translation = translations[post.id];
          const translationError = translationErrors[post.id];
          const isTranslating = translatingPostId === post.id;

          return (
            <li key={post.id} className="house-posts__item">
              <h4 className="house-posts__title">
                {post.title}
              </h4>

              <div className="house-posts__content">
                {post.content}
              </div>

              <div className="house-posts__meta">
                <span className="house-posts__author">
                  {authorName}
                </span>

                {createdDate && (
                  <span className="house-posts__date">
                    {createdDate}
                  </span>
                )}

                {showUpdatedDate && updatedDate && (
                  <span className="house-posts__date">
                    Updated: {updatedDate}
                  </span>
                )}
              </div>

              <div className="house-posts__translation">
                <button
                  type="button"
                  className="house-posts__translate-button"
                  onClick={() => void handleTranslate(post)}
                  disabled={isTranslating || translatingPostId !== null}
                >
                  {isTranslating
                    ? "Translating..."
                    : translation
                      ? `Translated to ${houseLanguage} ✓`
                      : `Translate to ${houseLanguage}`}
                </button>

                {translationError && (
                  <div
                    className="house-posts__translation-error"
                    role="alert"
                  >
                    {translationError}
                  </div>
                )}

                {translation && (
                  <div
                    className="house-posts__translated"
                    aria-live="polite"
                  >
                    <div className="house-posts__translated-label">
                      Translation · {houseLanguage}
                    </div>

                    <div className="house-posts__translated-title">
                      {translation.title}
                    </div>

                    <div className="house-posts__translated-content">
                      {translation.content}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </>
  );
}