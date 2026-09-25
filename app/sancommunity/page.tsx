import { markup } from "../markup";
import SanCommunityAuth from "@/components/SanCommunityAuth";
import SanCommunityHouseMembershipBridge from "@/components/SanCommunityHouseMembershipBridge";
import SanCommunityHousePostsBridge from "@/components/SanCommunityHousePostsBridge";
import SanCommunityScripts from "@/components/SanCommunityScripts";
import ThemeToggle from "@/components/ThemeToggle";
import UserProfile from "@/components/UserProfile";

export default function SanCommunityPage() {
  return (
    <>
      <div
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
      <ThemeToggle />
      <SanCommunityAuth />
      <SanCommunityHouseMembershipBridge />
      <SanCommunityHousePostsBridge />
      <UserProfile />
      <SanCommunityScripts />
    </>
  );
}
