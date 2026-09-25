"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { getHouses, type House } from "@/lib/houses";
import { getHouseMembers, type HouseMember } from "@/lib/houseMembers";
import {
  getVerifiedLocals,
  type VerifiedLocal,
  unverifyUserInHouse,
  verifyUserInHouse,
} from "@/lib/verified";
import { onUserChange } from "@/lib/auth";

export default function SanCommunityScripts() {
  const [d3Ready, setD3Ready] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [userReady, setUserReady] = useState(false);
  const [userSignedIn, setUserSignedIn] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHouses() {
      try {
        const loadedHouses = await getHouses();

        if (!active) return;

        console.log(
          "SanCommunity Firebase houses:",
          loadedHouses
        );

        setHouses(loadedHouses);
      } catch (error) {
        console.error(
          "SanCommunity: failed to load houses from Firebase",
          error
        );
      }
    }

    void loadHouses();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onUserChange((user) => {
      if (!active) return;

      setUserSignedIn(Boolean(user));
      setUserUid(user?.uid ?? null);
      setUserReady(true);
      window.dispatchEvent(
  new CustomEvent("sancommunity:user-loaded", {
    detail: {
      uid: user?.uid ?? null,
    },
  })
);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!appReady || !userReady || !userSignedIn || houses.length === 0) {
      return;
    }

    async function loadHouseMembers() {
      try {
        const results = await Promise.all(
          houses.map(async (house) => {
            try {
              const members = await getHouseMembers(house.id);

              return {
                houseId: house.id,
                members,
              };
            } catch (error) {
              console.error(
                `SanCommunity: failed to load members for ${house.id}`,
                error
              );

              return {
                houseId: house.id,
                members: [] as HouseMember[],
              };
            }
          })
        );

        if (!active) return;

        console.log(
          "SanCommunity: Firebase house members loaded:",
          results
        );

        window.dispatchEvent(
          new CustomEvent("sancommunity:house-members-loaded", {
            detail: results,
          })
        );
      } catch (error) {
        console.error(
          "SanCommunity: failed to load Firebase house members",
          error
        );
      }
    }

    let active = true;

    void loadHouseMembers();
    const handleHouseMembersRefresh = () => {
  void loadHouseMembers();
};

window.addEventListener(
  "sancommunity:house-members-refresh",
  handleHouseMembersRefresh
);

    return () => {
  active = false;
  window.removeEventListener(
    "sancommunity:house-members-refresh",
    handleHouseMembersRefresh
  );
};
  }, [appReady, userReady, userSignedIn, houses]);

  useEffect(() => {
    if (!appReady || !userReady || !userSignedIn || houses.length === 0) {
      return;
    }

    async function loadVerifiedLocals() {
      try {
        const results = await Promise.all(
          houses.map(async (house) => {
            try {
              const locals = await getVerifiedLocals(house.id);

              return {
                houseId: house.id,
                locals: locals.map(
                  (local: VerifiedLocal) => local.uid
                ),
              };
            } catch (error) {
              console.error(
                `SanCommunity: failed to load verified locals for ${house.id}`,
                error
              );

              return {
                houseId: house.id,
                locals: [] as string[],
              };
            }
          })
        );

        window.dispatchEvent(
          new CustomEvent("sancommunity:verified-locals-loaded", {
            detail: results,
          })
        );

        console.log(
          "SanCommunity: Firebase verified locals loaded:",
          results
        );
      } catch (error) {
        console.error(
          "SanCommunity: failed to load Firebase verified locals",
          error
        );
      }
    }

    void loadVerifiedLocals();
  }, [appReady, userReady, userSignedIn, houses]);

  useEffect(() => {
    if (!appReady || !userReady || !userSignedIn || !userUid) {
      return;
    }

    async function handleVerifiedLocalToggle(event: Event) {
      const customEvent = event as CustomEvent<{
        uid?: string;
        houseId?: string;
        verified?: boolean;
      }>;

      const uid = customEvent.detail?.uid?.trim();
      const houseId = customEvent.detail?.houseId?.trim().toUpperCase();
      const verified = Boolean(customEvent.detail?.verified);
      const currentUserUid = userUid;

      if (!uid || !houseId || !currentUserUid) {
        console.warn(
          "SanCommunity: invalid verified local toggle request"
        );
        return;
      }

      try {
        if (verified) {
          await unverifyUserInHouse(uid, houseId);
        } else {
          await verifyUserInHouse(uid, houseId, currentUserUid);
        }

        const results = await Promise.all(
          houses.map(async (house) => {
            try {
              const locals = await getVerifiedLocals(house.id);

              return {
                houseId: house.id,
                locals: locals.map(
                  (local: VerifiedLocal) => local.uid
                ),
              };
            } catch (error) {
              console.error(
                `SanCommunity: failed to refresh verified locals for ${house.id}`,
                error
              );

              return {
                houseId: house.id,
                locals: [] as string[],
              };
            }
          })
        );

        window.dispatchEvent(
          new CustomEvent("sancommunity:verified-locals-loaded", {
            detail: results,
          })
        );

        console.log(
          "SanCommunity: verified local updated:",
          { uid, houseId, verified: !verified }
        );
      } catch (error) {
        console.error(
          "SanCommunity: failed to update verified local",
          error
        );

        window.dispatchEvent(
          new CustomEvent("sancommunity:verified-local-error", {
            detail: {
              message:
                "You do not have permission to manage verified locals.",
            },
          })
        );
      }
    }

    window.addEventListener(
      "sancommunity:toggle-verified-local",
      handleVerifiedLocalToggle
    );

    return () => {
      window.removeEventListener(
        "sancommunity:toggle-verified-local",
        handleVerifiedLocalToggle
      );
    };
  }, [
    appReady,
    userReady,
    userSignedIn,
    userUid,
    houses,
  ]);

  useEffect(() => {
    if (!appReady || houses.length === 0) {
      return;
    }

    console.log(
      "SanCommunity: sending Firebase houses to Artifact",
      houses
    );

    window.dispatchEvent(
      new CustomEvent<House[]>("sancommunity:houses-loaded", {
        detail: houses,
      })
    );
  }, [appReady, houses]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"
        strategy="afterInteractive"
        onReady={() => {
          setD3Ready(true);
        }}
      />

      {d3Ready && (
        <Script
          src="/san-community/app.js"
          strategy="afterInteractive"
          onReady={() => {
            console.log("SanCommunity: Artifact app.js ready");
            setAppReady(true);
          }}
        />
      )}
    </>
  );
}