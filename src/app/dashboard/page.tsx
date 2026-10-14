import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Community dashboard" };
export default function DashboardPage() {
  return <DashboardClient />;
}
