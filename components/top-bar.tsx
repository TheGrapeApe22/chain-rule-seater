"use client";

import { useRef } from "react";
import { useSeatingStore } from "@/lib/store";
import {
  Plus,
  Lock,
  Unlock,
  Shuffle,
  Eraser,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";

export function TopBar() {
  const {
    name,
    setName,
    addTables,
    lockAllSeats,
    unlockAllSeats,
    randomFill,
    clearUnlockedSeats,
    resetRoster,
    addStudentsFromRoster,
    exportToJson,
    importFromJson,
  } = useSeatingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rosterInputRef = useRef<HTMLInputElement>(null);

  const handleAddTables = () => {
    const countStr = prompt("How many tables?");
    if (!countStr) return;
    const count = parseInt(countStr);
    if (isNaN(count) || count < 1) return;
    const sizeStr = prompt("How many seats per table? (2-6)");
    if (!sizeStr) return;
    const size = parseInt(sizeStr);
    if (isNaN(size) || size < 2 || size > 6) return;
    addTables(count, size);
  };

  const handleResetRoster = () => {
    rosterInputRef.current?.click();
  };

  const handleRosterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        resetRoster();
        const names = text.split("\n").filter((n) => n.trim().length > 0);
        if (names.length > 0) {
          addStudentsFromRoster(names);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        importFromJson(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2 text-card-foreground shrink-0 overflow-x-auto">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="bg-transparent text-sm font-semibold border-none outline-none min-w-[120px] max-w-[200px] focus:ring-1 focus:ring-ring rounded px-1 py-0.5"
        aria-label="Chart name"
      />

      <div className="h-5 w-px bg-border mx-1" />

      <button
        onClick={handleAddTables}
        className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        title="Add tables"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Tables
      </button>

      <button
        onClick={lockAllSeats}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Lock all seats"
      >
        <Lock className="h-3.5 w-3.5" />
        Lock All
      </button>

      <button
        onClick={unlockAllSeats}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Unlock all seats"
      >
        <Unlock className="h-3.5 w-3.5" />
        Unlock All
      </button>

      <button
        onClick={randomFill}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Randomize unlocked seats"
      >
        <Shuffle className="h-3.5 w-3.5" />
        Randomize
      </button>

      <button
        onClick={clearUnlockedSeats}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Clear all unlocked seats"
      >
        <Eraser className="h-3.5 w-3.5" />
        Clear
      </button>

      <div className="flex-1" />

      <button
        onClick={handleResetRoster}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Reset roster"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset Roster
      </button>

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Save to JSON"
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </button>

      <button
        onClick={handleLoad}
        className="flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
        title="Load from JSON"
      >
        <Upload className="h-3.5 w-3.5" />
        Load
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={rosterInputRef}
        type="file"
        accept=".txt,.csv,.text"
        className="hidden"
        onChange={handleRosterFileChange}
      />
    </div>
  );
}
