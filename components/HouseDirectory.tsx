"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import HouseCard from "@/components/HouseCard";
import HouseDetails from "@/components/HouseDetails";
import { getHouses, type House } from "@/lib/houses";

const SKELETON_COUNT = 8;

function matchesSearch(house: House, term: string): boolean {
  return [house.name, house.country, house.language, house.id].some(
    (field) => typeof field === "string" && field.toLowerCase().includes(term)
  );
}

export default function HouseDirectory() {
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Identifies the most recent request so a stale response (or one that
  // resolves after unmount) can never overwrite current state.
  const requestIdRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const loadHouses = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const data = await getHouses();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setHouses(data);
      setSelectedHouse(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to load houses for directory:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load houses from Firebase."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHouses();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadHouses]);

  const normalizedTerm = searchTerm.trim().toLowerCase();

  // Filters the houses already in memory: searching never refetches.
  const visibleHouses = useMemo(() => {
    if (!normalizedTerm) {
      return houses;
    }

    return houses.filter((house) => matchesSearch(house, normalizedTerm));
  }, [houses, normalizedTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const countLabel = normalizedTerm
    ? `${visibleHouses.length} ${visibleHouses.length === 1 ? "House" : "Houses"} found`
    : `${houses.length} ${houses.length === 1 ? "House" : "Houses"}`;

  const showBrowser = !loading && !error && !selectedHouse;

  return (
    <section className="house-directory" aria-label="House directory">
      <header className="house-directory__header">
        <h2 className="house-directory__title">House Directory</h2>

        {showBrowser && houses.length > 0 && (
          <p className="house-directory__count" aria-live="polite">
            {countLabel}
          </p>
        )}
      </header>

      {loading && (
        <>
          <p className="house-directory__status" role="status">
            Loading houses
          </p>

          <div className="house-directory__cards" aria-hidden="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div className="house-skeleton" key={index}>
                <div className="house-skeleton__head">
                  <span className="house-skeleton__flag" />
                  <span className="house-skeleton__lines">
                    <span className="house-skeleton__line house-skeleton__line--short" />
                    <span className="house-skeleton__line house-skeleton__line--title" />
                  </span>
                </div>
                <span className="house-skeleton__line" />
                <span className="house-skeleton__line" />
                <span className="house-skeleton__line house-skeleton__line--short" />
                <span className="house-skeleton__button" />
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && error && (
        <div className="house-directory__error" role="alert">
          <p className="house-directory__error-text">{error}</p>
          <button
            type="button"
            className="house-directory__retry"
            onClick={() => void loadHouses()}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && selectedHouse && (
        <div className="house-directory__grid">
          <HouseDetails
            house={selectedHouse}
            onBack={() => setSelectedHouse(null)}
          />
        </div>
      )}

      {showBrowser && houses.length === 0 && (
        <div className="house-directory__empty">
          No houses have been added yet.
        </div>
      )}

      {showBrowser && houses.length > 0 && (
        <>
          <div className="house-directory__toolbar">
            <label
              className="house-directory__search-label"
              htmlFor="house-directory-search"
            >
              Search Houses by name, country, language or code
            </label>

            <div className="house-directory__search">
  <svg
    className="house-directory__search-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>

  <input
    id="house-directory-search"
  
                ref={searchInputRef}
                className="house-directory__search-input"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Houses, countries or languages"
                autoComplete="off"
              />

              {searchTerm && (
                <button
                  type="button"
                  className="house-directory__clear"
                  onClick={clearSearch}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {visibleHouses.length === 0 ? (
            <div className="house-directory__no-match">
              <p className="house-directory__no-match-text">
                No Houses found for &ldquo;{searchTerm.trim()}&rdquo;.
              </p>
              <button
                type="button"
                className="house-directory__clear house-directory__clear--block"
                onClick={clearSearch}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="house-directory__grid">
              <div className="house-directory__cards">
                {visibleHouses.map((house) => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    onOpen={setSelectedHouse}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
