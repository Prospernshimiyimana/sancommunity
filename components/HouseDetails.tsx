"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import HouseMembers from "@/components/HouseMembers";
import HouseMembership from "@/components/HouseMembership";
import HousePosts from "@/components/HousePosts";
import { flagEmoji } from "@/lib/flags";
import type { House } from "@/lib/houses";

type HouseDetailsProps = {
  house: House;
  onBack?: () => void;
};

type TabId = "posts" | "members" | "about";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "posts", label: "Posts" },
  { id: "members", label: "Members" },
  { id: "about", label: "About" },
];

/**
 * Mirrors the guard in HouseCard: memberCount is not a House field yet, so the
 * slot stays empty until the membership counter exists. Both copies collapse
 * into one helper once the field is real.
 */
function readMemberCount(house: House): number | null {
  const value = (house as House & { memberCount?: unknown }).memberCount;

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

export default function HouseDetails({ house, onBack }: HouseDetailsProps) {
  const flag = flagEmoji(house.id);
  const memberCount = readMemberCount(house);

  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving focus: ArrowLeft/ArrowRight wrap around, Home/End jump to the ends.
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <article
      className="house-details"
      aria-label={`${house.name} house details`}
    >
      {onBack && (
        <button
          type="button"
          className="house-details__back"
          onClick={onBack}
          aria-label={`Back to houses from ${house.name}`}
        >
          Back to Houses
        </button>
      )}

      <header className="house-details__hero">
        {flag && (
          <span className="house-details__flag" aria-hidden="true">
            {flag}
          </span>
        )}

        <div className="house-details__identity">
          <p className="house-details__country">
            {house.country}
            <span className="house-details__code">{house.id}</span>
          </p>

          <h2 className="house-details__title">{house.name}</h2>

          <div className="house-details__facts">
            <span className="house-details__chip">
              <span className="house-details__chip-label">Speaks</span>
              <span className="house-details__language">{house.language}</span>
            </span>

            {memberCount !== null && (
              <span className="house-details__members">
                {memberCount.toLocaleString()}{" "}
                {memberCount === 1 ? "member" : "members"}
              </span>
            )}
          </div>
        </div>

        <div className="house-details__action">
          <HouseMembership houseId={house.id} />
        </div>
      </header>

      <div
        className="house-details__tabs"
        role="tablist"
        aria-label={`${house.name} sections`}
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`house-tab-${tab.id}`}
            className="house-details__tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`house-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Only the active panel is mounted, so an inactive HouseMembers or
          HousePosts never runs its Firestore query. */}
      <div
      className="house-details__panel"
      role="tabpanel"
      id={`house-panel-${activeTab}`}
      aria-labelledby={`house-tab-${activeTab}`}
      tabIndex={activeTab === "about" ? 0 : undefined}
      >
        {activeTab === "posts" && (
          <HousePosts houseId={house.id} houseLanguage={house.language} />
        )}

        {activeTab === "members" && <HouseMembers houseId={house.id} />}

        {activeTab === "about" && (
          <>
            <p className="house-details__description">{house.description}</p>

            <p className="house-details__coming">
              Shared materials and skills &amp; opportunities are coming soon.
            </p>
          </>
        )}
      </div>
    </article>
  );
}