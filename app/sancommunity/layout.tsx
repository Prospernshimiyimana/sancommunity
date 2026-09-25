import "../san-community.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "San Community: Houses and First Steps",
};

// Nested layout: <html>, <head> and <body> belong to app/layout.tsx.
// The font <link> tags and the stylesheet import live there too.
export default function SanCommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}