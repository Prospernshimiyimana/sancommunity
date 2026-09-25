
"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

import {
  onUserChange,
  updateAuthDisplayName,
} from "@/lib/auth";

import {
  getUserProfile,
  updateUserProfile,
  type UserProfile as UserProfileData,
} from "@/lib/profile";

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] =
    useState<UserProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");

  const [mounted, setMounted] = useState(false);
  const [host, setHost] =
    useState<HTMLElement | null>(null);

  const profileButtonRef =
    useRef<HTMLButtonElement | null>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);

    const header =
      document.querySelector<HTMLElement>(".app header");

    setHost(header);

    const unsubscribe = onUserChange(async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setOpen(false);
        setEditing(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setMessage("");

        const data = await getUserProfile(nextUser.uid);

        setProfile(data);

        if (data) {
          setUsername(data.username);
          setDisplayName(data.displayName);
          setCountry(data.country);
          setLanguage(data.language);
        } else {
          setMessage("Profile not found.");
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load profile."
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(false);
        profileButtonRef.current?.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  function startEditing() {
    if (!profile) {
      return;
    }

    setUsername(profile.username);
    setDisplayName(profile.displayName);
    setCountry(profile.country);
    setLanguage(profile.language);
    setMessage("");
    setEditing(true);
  }

  function cancelEditing() {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.displayName);
      setCountry(profile.country);
      setLanguage(profile.language);
    }

    setMessage("");
    setEditing(false);
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!user || !profile || saving) {
      return;
    }

    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();
    const cleanCountry = country.trim();
    const cleanLanguage = language.trim();

    if (
      !cleanUsername ||
      !cleanDisplayName ||
      !cleanCountry ||
      !cleanLanguage
    ) {
      setMessage("Please complete all profile fields.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await updateUserProfile(user.uid, {
        username: cleanUsername,
        displayName: cleanDisplayName,
        country: cleanCountry,
        language: cleanLanguage,
      });

      await updateAuthDisplayName(
        user,
        cleanDisplayName
      );

      const updatedProfile: UserProfileData = {
        ...profile,
        username: cleanUsername,
        displayName: cleanDisplayName,
        country: cleanCountry,
        language: cleanLanguage,
      };

      setProfile(updatedProfile);
      setUsername(cleanUsername);
      setDisplayName(cleanDisplayName);
      setCountry(cleanCountry);
      setLanguage(cleanLanguage);

      setEditing(false);
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    !mounted ||
    !host ||
    !user ||
    loading ||
    !profile
  ) {
    return null;
  }

  return createPortal(
    <div className="user-profile">
      <button
        ref={profileButtonRef}
        type="button"
        className="user-profile__trigger"
        aria-expanded={open}
        aria-controls="user-profile-panel"
        onClick={() => {
          setOpen((current) => !current);
          setEditing(false);
          setMessage("");
        }}
      >
        Profile
      </button>

      {open ? (
        <section
          id="user-profile-panel"
          className="user-profile__panel"
          aria-label="Your profile"
        >
          <div className="user-profile__header">
            <div>
              <p className="user-profile__eyebrow">
                Your profile
              </p>

              <h2 className="user-profile__name">
                {profile.displayName}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              className="user-profile__close"
              onClick={() => {
                setOpen(false);
                setEditing(false);
                setMessage("");
                profileButtonRef.current?.focus();
              }}
              aria-label="Close profile"
            >
              ×
            </button>
          </div>

          {editing ? (
            <form
              className="user-profile__form"
              onSubmit={handleSave}
            >
              <label className="user-profile__field">
                <span>Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  required
                  autoComplete="username"
                />
              </label>

              <label className="user-profile__field">
                <span>Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  required
                  autoComplete="name"
                />
              </label>

              <label className="user-profile__field">
                <span>Country</span>
                <input
                  type="text"
                  value={country}
                  onChange={(event) =>
                    setCountry(event.target.value)
                  }
                  required
                  autoComplete="country-name"
                />
              </label>

              <label className="user-profile__field">
                <span>Language</span>
                <input
                  type="text"
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value)
                  }
                  required
                />
              </label>

              <div className="user-profile__actions">
                <button
                  type="submit"
                  className="user-profile__action user-profile__action--primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  className="user-profile__action user-profile__action--secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <dl className="user-profile__details">
                <div className="user-profile__detail">
                  <dt>Username</dt>
                  <dd>{profile.username}</dd>
                </div>

                <div className="user-profile__detail">
                  <dt>Email</dt>
                  <dd>
                    {profile.email ||
                      user.email ||
                      "—"}
                  </dd>
                </div>

                <div className="user-profile__detail">
                  <dt>Country</dt>
                  <dd>{profile.country}</dd>
                </div>

                <div className="user-profile__detail">
                  <dt>Language</dt>
                  <dd>{profile.language}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="user-profile__edit"
                onClick={startEditing}
              >
                Edit profile
              </button>
            </>
          )}

          {message ? (
            <p
              className="user-profile__message"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>,
    host
  );
}


