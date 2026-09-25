
"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { onUserChange } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import {
  getMyHouseMembership,
  joinHouse,
  leaveHouse,
  syncMyMemberDisplayName,
  type HouseMember,
} from "@/lib/houseMembers";
import { getUserProfile } from "@/lib/profile";

type HouseMembershipProps = {
  houseId: string;
};

export default function HouseMembership({
  houseId,
}: HouseMembershipProps) {
  const [user, setUser] = useState(auth.currentUser);
  const [membership, setMembership] =
    useState<HouseMember | null>(null);
  const [checking, setChecking] = useState(
    Boolean(auth.currentUser)
  );
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] =
    useState(false);

  const leaveButtonRef =
    useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef =
    useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = onUserChange(async (nextUser) => {
      const requestId = ++requestIdRef.current;

      if (!active) {
        return;
      }

      setUser(nextUser);

      if (!nextUser) {
        setMembership(null);
        setChecking(false);
        setError(null);
        return;
      }

      setChecking(true);
      setError(null);

      try {
        const nextMembership =
          await getMyHouseMembership(
            houseId,
            nextUser.uid
          );

        if (!active || requestId !== requestIdRef.current) {
          return;
        }

        if (nextMembership) {
          const syncedMembership =
            await syncMyMemberDisplayName(
              nextMembership,
              nextUser.displayName
            );

          if (
            !active ||
            requestId !== requestIdRef.current
          ) {
            return;
          }

          setMembership(syncedMembership);
        } else {
          setMembership(null);
        }
      } catch (loadError) {
        if (!active || requestId !== requestIdRef.current) {
          return;
        }

        setMembership(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your membership right now."
        );
      } finally {
        if (
          active &&
          requestId === requestIdRef.current
        ) {
          setChecking(false);
        }
      }
    });

    return () => {
      active = false;
      requestIdRef.current += 1;
      unsubscribe();
    };
  }, [houseId]);

  async function refreshMembership(
    currentUser = user
  ) {
    const requestId = ++requestIdRef.current;

    if (!currentUser) {
      setMembership(null);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const nextMembership =
        await getMyHouseMembership(
          houseId,
          currentUser.uid
        );

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (nextMembership) {
        const syncedMembership =
          await syncMyMemberDisplayName(
            nextMembership,
            currentUser.displayName
          );

        if (requestId !== requestIdRef.current) {
          return;
        }

        setMembership(syncedMembership);
      } else {
        setMembership(null);
      }
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMembership(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your membership right now."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setChecking(false);
      }
    }
  }

  async function handleJoin() {
    if (!user || isJoining || isLeaving) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Get the display name from the Firestore user profile first.
      // This is the source of truth for the community member name.
      const profile = await getUserProfile(user.uid);

      const displayName =
        profile?.displayName?.trim() ||
        user.displayName?.trim() ||
        null;

      await joinHouse({
        houseId,
        uid: user.uid,
        displayName,
        email: user.email,
      });

      await refreshMembership(user);
      window.dispatchEvent(
  new CustomEvent("sancommunity:house-members-refresh")
);
    } catch (joinError) {
      setError(
        joinError instanceof Error &&
          joinError.message
          ? joinError.message
          : "Unable to join this house right now."
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleLeave() {
    if (
      !user ||
      isJoining ||
      isLeaving ||
      !membership
    ) {
      return;
    }

    if (
      membership.role === "owner" ||
      membership.role === "admin"
    ) {
      return;
    }

    setIsLeaving(true);
    setError(null);

    try {
      await leaveHouse(houseId, user.uid);
      await refreshMembership(user);
      window.dispatchEvent(
  new CustomEvent("sancommunity:house-members-refresh")
);

    } catch (leaveError) {
      setError(
        leaveError instanceof Error &&
          leaveError.message
          ? leaveError.message
          : "Unable to leave this house right now."
      );
    } finally {
      setIsLeaving(false);
    }
  }

  const canLeave = Boolean(
    membership &&
      membership.role !== "owner" &&
      membership.role !== "admin"
  );

  useEffect(() => {
    if (!user || !membership || !canLeave) {
      setConfirmingLeave(false);
      restoreFocusRef.current = false;
    }
  }, [user, membership, canLeave]);

  useEffect(() => {
    if (confirmingLeave) {
      confirmButtonRef.current?.focus();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      leaveButtonRef.current?.focus();
    }
  }, [confirmingLeave]);

  function cancelLeave() {
    if (isLeaving) {
      return;
    }

    restoreFocusRef.current = true;
    setConfirmingLeave(false);
  }

  function handleConfirmKeyDown(
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelLeave();
    }
  }

  return (
    <div className="house-membership">
      <div
        className="house-membership__status"
        aria-live="polite"
      >
        {!user && (
          <span className="house-membership__message">
            Sign in to join this House
          </span>
        )}

        {user && checking && (
          <span className="house-membership__message">
            Checking membership...
          </span>
        )}

        {user && !checking && membership && (
          <>
            <span className="house-membership__message">
              You are a member
            </span>

            <span className="house-membership__role">
              {membership.role}
            </span>
          </>
        )}

        {user && !checking && !membership && (
          <span className="house-membership__message">
            Not a member yet
          </span>
        )}
      </div>

      {error && (
        <div
          className="house-membership__error"
          role="alert"
        >
          {error}
        </div>
      )}

      {user && !checking && !membership && (
        <button
          type="button"
          className="house-membership__button"
          onClick={handleJoin}
          disabled={isJoining || isLeaving}
        >
          {isJoining ? "Joining..." : "Join House"}
        </button>
      )}

      {user &&
        !checking &&
        membership &&
        canLeave &&
        !confirmingLeave && (
          <button
            type="button"
            ref={leaveButtonRef}
            className="house-membership__button house-membership__button--danger"
            onClick={() => setConfirmingLeave(true)}
            disabled={isJoining || isLeaving}
          >
            Leave House
          </button>
        )}

      {user &&
        !checking &&
        membership &&
        canLeave &&
        confirmingLeave && (
          <div
            className="house-membership__confirm"
            role="group"
            aria-labelledby="house-membership-confirm-text"
            onKeyDown={handleConfirmKeyDown}
          >
            <p
              id="house-membership-confirm-text"
              className="house-membership__confirm-text"
            >
              Leave this House? You can join again later.
            </p>

            <div className="house-membership__confirm-actions">
              <button
                type="button"
                className="house-membership__button house-membership__button--quiet"
                onClick={cancelLeave}
                disabled={isLeaving}
              >
                Cancel
              </button>

              <button
                type="button"
                ref={confirmButtonRef}
                className="house-membership__button house-membership__button--danger"
                onClick={handleLeave}
                disabled={isJoining || isLeaving}
              >
                {isLeaving ? "Leaving..." : "Yes, leave"}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

