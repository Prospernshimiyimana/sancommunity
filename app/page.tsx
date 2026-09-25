import { redirect } from "next/navigation";

// The app lives at /sancommunity. This keeps a single canonical route
// so new features are never added to a second, half-wired copy.
export default function RootPage() {
  redirect("/sancommunity");
}