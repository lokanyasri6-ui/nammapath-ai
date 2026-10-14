import type { Metadata } from "next";
import ModerateClient from "./ModerateClient";

export const metadata: Metadata = { title: "Moderator console", robots: { index: false } };
export default function ModeratePage() {
  return <ModerateClient />;
}
