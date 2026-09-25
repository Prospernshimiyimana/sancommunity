
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import HouseMembership from "@/components/HouseMembership";

export default function SanCommunityHouseMembershipBridge() {
  const [houseId, setHouseId] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function handleHouseSelected(event: Event) {
      const customEvent = event as CustomEvent<{ code?: string }>;
      const code = customEvent.detail?.code?.trim().toUpperCase();

      setHouseId(code || null);
      setHost(null);
    }

    window.addEventListener(
      "sancommunity:house-selected",
      handleHouseSelected
    );

    return () => {
      window.removeEventListener(
        "sancommunity:house-selected",
        handleHouseSelected
      );
    };
  }, []);

  useEffect(() => {
    if (!houseId) {
      setHost(null);
      return;
    }

    function findHost() {
      const element =
        document.querySelector<HTMLElement>(
          "#firebase-house-membership"
        );

      setHost((currentHost) =>
        currentHost === element ? currentHost : element
      );
    }

    findHost();

    const observer = new MutationObserver(() => {
      findHost();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [houseId]);

  if (!houseId || !host) {
    return null;
  }

  return createPortal(
    <HouseMembership houseId={houseId} />,
    host
  );
}

