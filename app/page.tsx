"use client";

import dynamic from "next/dynamic";
import { TopBar } from "@/components/top-bar";
import { RightSidebar } from "@/components/right-sidebar";

const SeatingCanvas = dynamic(
  () =>
    import("@/components/seating-canvas").then((mod) => ({
      default: mod.SeatingCanvas,
    })),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <SeatingCanvas />
        <RightSidebar />
      </div>
    </div>
  );
}
