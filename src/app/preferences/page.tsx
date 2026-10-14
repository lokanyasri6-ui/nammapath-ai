import type { Metadata } from "next";
import PreferencesClient from "./PreferencesClient";

export const metadata: Metadata = { title: "My mobility needs" };
export default function PreferencesPage() {
  return <PreferencesClient />;
}
