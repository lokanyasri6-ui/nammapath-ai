import type { Metadata } from "next";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = { title: "Community reports" };
export default function ReportsPage() {
  return <ReportsClient />;
}
