"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import HousePosts from "@/components/HousePosts";

type HouseSelectedDetail = {
  code?: string;
};

export default function SanCommunityHousePostsBridge() {
  const [houseId, setHouseId] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [houseLanguage, setHouseLanguage] = useState("");

  useEffect(() => {
    function handleHouseSelected(event: Event) {
      const customEvent = event as CustomEvent<HouseSelectedDetail>;
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
          "#firebase-house-posts"
        );

      setHost((currentHost) =>
        currentHost === element ? currentHost : element
      );
    }

    findHost();

    const observer = new MutationObserver(findHost);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [houseId]);

  useEffect(() => {
    if (!houseId) {
      setHouseLanguage("");
      return;
    }

    function findLanguage() {
      const languageElement =
        document.querySelector<HTMLElement>(
          "#firebase-house-posts"
        )?.dataset.language;

      if (languageElement) {
        setHouseLanguage(languageElement);
      }
    }

    findLanguage();

    const observer = new MutationObserver(findLanguage);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [houseId]);

  if (!houseId || !host || !houseLanguage) {
    return null;
  }

  return createPortal(
    <HousePosts
      houseId={houseId}
      houseLanguage={houseLanguage}
    />,
    host
  );
}
