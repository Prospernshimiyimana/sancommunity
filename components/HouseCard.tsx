"use client";

import HouseMembership from "@/components/HouseMembership";
import { flagEmoji } from "@/lib/flags";
import type { House } from "@/lib/houses";

type HouseCardProps = {
  house: House;
  onOpen?: (house: House) => void;
};

/**
 * memberCount is not part of the House type yet: house documents are seeded
 * without it and the counter arrives with the membership work. Read it
 * defensively so the slot fills in automatically once the field exists.
 */
function readMemberCount(house: House): number | null {
  const value = (house as House & { memberCount?: unknown }).memberCount;

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

export default function HouseCard({ house, onOpen }: HouseCardProps) {
  const handleOpen = () => {
    if (onOpen) {
      onOpen(house);
    }
  };

  const flag = flagEmoji(house.id);
  const memberCount = readMemberCount(house);

  return (
    <article className="house-card" aria-label={`${house.name} house card`}>
      <header className="house-card__top">
        {flag && (
          <span className="house-card__flag" aria-hidden="true">
            {flag}
          </span>
        )}

        <div className="house-card__identity">
          <p className="house-card__country">
            {house.country}
            <span className="house-card__code">{house.id}</span>
          </p>
          <h3 className="house-card__title">{house.name}</h3>
        </div>
      </header>

      <div className="house-card__body">
        <p className="house-card__description">{house.description}</p>

        <div className="house-card__facts">
          <span className="house-card__chip">
            <span className="house-card__chip-label">Speaks</span>
            <span className="house-card__language">{house.language}</span>
          </span>

          {memberCount !== null && (
            <span className="house-card__members">
              {memberCount.toLocaleString()}{" "}
              {memberCount === 1 ? "member" : "members"}
            </span>
          )}
        </div>
      </div>

      <HouseMembership houseId={house.id} />

      <div className="house-card__footer">
        <button
          type="button"
          className="house-card__button"
          onClick={handleOpen}
          aria-label={`View ${house.name}`}
        >
          View House
        </button>
      </div>
    </article>
  );
}