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
import s from "./top-bar.module.css";

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
  const [tableCount, setTableCount] = useState("1");
  const [seatSize, setSeatSize] = useState("5");

  const openAddDialog = () => {
    setTableCount("1");
    setSeatSize("5");
    setShowAddDialog(true);
  };

  const confirmAddTables = useCallback(() => {
    const count = parseInt(tableCount);
    const size = parseInt(seatSize);
    if (count >= 1 && count <= 50 && size >= 2 && size <= 6) {
      addTables(count, size);
      setShowAddDialog(false);
    }
    else {
      alert("Please enter valid numbers: at least 1 table (max 50), and seat size between 2 and 6.");
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
    <div className={s.bar}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={s.nameInput}
        aria-label="Chart name"
      />

      <div className={s.divider} />

      <button onClick={handleResetRoster} className={s.secondaryBtn} title="Set roster">
        <RotateCcw size={14} />
        Set Roster
      </button>

      <button onClick={openAddDialog} className={s.primaryBtn} title="Add tables">
        <Plus size={14} />
        Add Tables
      </button>

      <button onClick={lockAllSeats} className={s.secondaryBtn} title="Lock all seats">
        <Lock size={14} />
        Lock All
      </button>

      <button onClick={unlockAllSeats} className={s.secondaryBtn} title="Unlock all seats">
        <Unlock size={14} />
        Unlock All
      </button>

      <button onClick={randomFill} className={s.secondaryBtn} title="Randomize unlocked seats">
        <Shuffle size={14} />
        Randomize
      </button>

      <button onClick={clearUnlockedSeats} className={s.secondaryBtn} title="Clear all unlocked seats">
        <Eraser size={14} />
        Clear
      </button>

      <div className={s.spacer} />

      <button onClick={handleSave} className={s.secondaryBtn} title="Save to JSON">
        <Save size={14} />
        Save
      </button>

      <button onClick={handleLoad} className={s.secondaryBtn} title="Load from JSON">
        <Upload size={14} />
        Load
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className={s.hidden}
        onChange={handleFileChange}
      />

      <input
        ref={rosterInputRef}
        type="file"
        accept=".txt,.csv,.text"
        className={s.hidden}
        onChange={handleRosterFileChange}
      />

      {showAddDialog && (
        <div
          className={s.overlay}
          onClick={() => setShowAddDialog(false)}
        >
          <div
            className={s.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={s.dialogTitle}>Add Tables</h3>
            <div className={s.dialogForm}>
              <span>Add</span>
              <input
                type="number"
                min={1}
                max={50}
                value={tableCount}
                onChange={(e) => setTableCount(e.target.value)}
                className={s.dialogInput}
                autoFocus
              />
              <span>{"table(s) of size"}</span>
              <input
                type="number"
                min={2}
                max={6}
                value={seatSize}
                onChange={(e) => setSeatSize(e.target.value)}
                className={s.dialogInput}
              />
            </div>
            <div className={s.dialogActions}>
              <button
                onClick={() => setShowAddDialog(false)}
                className={s.secondaryBtn}
              >
                Cancel
              </button>
              <button
                onClick={confirmAddTables}
                className={s.primaryBtn}
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
