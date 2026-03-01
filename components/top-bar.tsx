import { useRef, useState, useEffect, useCallback } from "react";
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
} from "@/components/icons";

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

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tableCount, setTableCount] = useState(1);
  const [seatSize, setSeatSize] = useState(5);

  const openAddDialog = () => {
    setTableCount(1);
    setSeatSize(5);
    setShowAddDialog(true);
  };

  const confirmAddTables = useCallback(() => {
    if (tableCount >= 1 && seatSize >= 2 && seatSize <= 6) {
      addTables(tableCount, seatSize);
      setShowAddDialog(false);
    }
  }, [tableCount, seatSize, addTables]);

  useEffect(() => {
    if (!showAddDialog) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAddDialog(false);
      if (e.key === "Enter") confirmAddTables();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showAddDialog, confirmAddTables]);

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
        onClick={openAddDialog}
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

      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAddDialog(false)}
        >
          <div
            className="bg-card text-card-foreground border border-border rounded-lg shadow-lg p-5 w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-4">Add Tables</h3>
            <div className="flex items-center gap-2 text-sm">
              <span>Add</span>
              <input
                type="number"
                min={1}
                max={50}
                value={tableCount}
                onChange={(e) =>
                  setTableCount(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <span>{"table(s) of size"}</span>
              <input
                type="number"
                min={2}
                max={6}
                value={seatSize}
                onChange={(e) =>
                  setSeatSize(
                    Math.min(6, Math.max(2, parseInt(e.target.value) || 2))
                  )
                }
                className="w-14 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowAddDialog(false)}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddTables}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
