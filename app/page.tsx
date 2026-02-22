"use client";

import { TopBar } from "@/components/top-bar";
import { RightSidebar } from "@/components/right-sidebar";
import { SeatingCanvas } from "@/components/seating-canvas";

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
