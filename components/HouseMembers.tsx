"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { onUserChange } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import {
  getHouseMembers,
  type HouseMember,
} from "@/lib/houseMembers";

type HouseMembersProps = {
  houseId: string;
};

const ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  member: 2,
};

const SKELETON_COUNT = 4;

function memberName(member: HouseMember): string {
  return member.displayName?.trim() || "Community Member";
}

export default function HouseMembers({ houseId }: HouseMembersProps) {
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Identifies the most recent request so a stale response (or one that
  // resolves after unmount) can never overwrite current state.
  const requestIdRef = useRef(0);

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

  const loadMembers = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    // Reading houseMembers requires an authenticated user, so a signed-out
    // visitor is shown a prompt instead of a request that cannot succeed.
    if (!auth.currentUser) {
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getHouseMembers(houseId);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMembers(data);
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMembers([]);
      setError("Unable to load community members right now.");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [houseId]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!user) {
      requestIdRef.current += 1;
      setMembers([]);
      setError(null);
      setLoading(false);
      return;
    }

    void loadMembers();

    return () => {
      requestIdRef.current += 1;
    };
  }, [authReady, user, loadMembers]);

  // Owners first, then admins, then members; alphabetical within each group.
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const rankA = ROLE_ORDER[a.role] ?? ROLE_ORDER.member;
      const rankB = ROLE_ORDER[b.role] ?? ROLE_ORDER.member;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return memberName(a).localeCompare(memberName(b));
    });
  }, [members]);

  const normalizedTerm = searchTerm.trim().toLowerCase();

  // Filters the members already in memory: searching never refetches.
  const visibleMembers = useMemo(() => {
    if (!normalizedTerm) {
      return sortedMembers;
    }

    return sortedMembers.filter((member) => {
      const role = member.role || "member";

      return (
        memberName(member).toLowerCase().includes(normalizedTerm) ||
        role.toLowerCase().includes(normalizedTerm)
      );
    });
  }, [sortedMembers, normalizedTerm]);

  function clearSearch() {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }

  const countLabel = normalizedTerm
    ? `${visibleMembers.length} ${visibleMembers.length === 1 ? "member" : "members"} found`
    : `${members.length} ${members.length === 1 ? "member" : "members"}`;

  if (authReady && !user) {
    return (
      <div className="house-members__signed-out" aria-live="polite">
        Sign in to see members of this House
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <p className="house-members__status" role="status">
          Loading members
        </p>

        <div className="house-members__skeletons" aria-hidden="true">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div className="house-member-skeleton" key={index}>
              <span className="house-member-skeleton__line" />
              <span className="house-member-skeleton__line house-member-skeleton__line--role" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="house-members__error" role="alert">
        <p className="house-members__error-text">{error}</p>

        <button
          type="button"
          className="house-members__retry"
          onClick={() => void loadMembers()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="house-members__empty" aria-live="polite">
        No members yet.
      </div>
    );
  }

  return (
    <>
      <div className="house-members__header">
        <p className="house-members__count" aria-live="polite">
          {countLabel}
        </p>

        <label
          className="house-members__search-label"
          htmlFor="house-members-search"
        >
          Search members by name or role
        </label>

        <div className="house-members__search">
          <input
            id="house-members-search"
            ref={searchInputRef}
            className="house-members__search-input"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search members"
            autoComplete="off"
          />

          {searchTerm && (
            <button
              type="button"
              className="house-members__clear"
              onClick={clearSearch}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {visibleMembers.length === 0 ? (
        <div className="house-members__no-match">
          <p className="house-members__no-match-text">
            No members found for &ldquo;{searchTerm.trim()}&rdquo;.
          </p>

          <button
            type="button"
            className="house-members__clear house-members__clear--block"
            onClick={clearSearch}
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="house-members__list" aria-label="House members list">
          {visibleMembers.map((member) => {
            const name = memberName(member);
            const role = member.role || "member";

            return (
              <li key={member.uid} className="house-members__item">
                <div className="house-members__name">{name}</div>
                <div className="house-members__role">{role}</div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}