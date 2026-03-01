import { useState, useRef, useCallback } from "react";
import { useSeatingStore } from "@/lib/store";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Users,
  User,
  GripVertical,
} from "@/components/icons";

export function RightSidebar() {
  const {
    students,
    friendGroups,
    tables,
    addFriendGroup,
    removeFriendGroup,
    addStudentToGroup,
    removeStudentFromGroup,
    renameStudent,
    getStudentGroup,
  } = useSeatingStore();

  const [friendGroupsOpen, setFriendGroupsOpen] = useState(true);
  const [studentsOpen, setStudentsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Resize logic
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
      const handleMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = resizeRef.current.startX - ev.clientX;
        const newWidth = Math.max(200, Math.min(500, resizeRef.current.startWidth + diff));
        setSidebarWidth(newWidth);
      };
      const handleUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [sidebarWidth]
  );

  // Student status helper
  const getStudentStatus = (studentId: string): "locked" | "seated" | "unseated" => {
    for (const t of tables) {
      for (const s of t.seats) {
        if (s.studentId === studentId) {
          return s.locked ? "locked" : "seated";
        }
      }
    }
    return "unseated";
  };

  const statusColors = {
    locked: "bg-amber-100 text-amber-800 border-amber-300",
    seated: "bg-emerald-100 text-emerald-800 border-emerald-300",
    unseated: "bg-background text-foreground border-border",
  };

  const handleStartEdit = (studentId: string, currentName: string) => {
    setEditingStudent(studentId);
    setEditName(currentName);
  };

  const handleFinishEdit = (studentId: string) => {
    if (editName.trim()) {
      renameStudent(studentId, editName.trim());
    }
    setEditingStudent(null);
  };

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    e.dataTransfer.setData("studentId", studentId);
    e.dataTransfer.setData("source", "roster");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex shrink-0" style={{ width: sidebarWidth }}>
      {/* Resize handle */}
      <div
        className="w-1.5 cursor-col-resize bg-border hover:bg-ring transition-colors shrink-0"
        onMouseDown={handleResizeStart}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-card border-l border-border">
        {/* Friend Groups */}
        <div className="flex flex-col">
          <button
            onClick={() => setFriendGroupsOpen(!friendGroupsOpen)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-accent transition-colors text-left"
          >
            {friendGroupsOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <Users className="h-4 w-4 shrink-0" />
            Friend Groups
            <span className="ml-auto text-xs text-muted-foreground">
              {friendGroups.length}
            </span>
          </button>

          {friendGroupsOpen && (
            <div className="px-2 pb-2">
              <button
                onClick={addFriendGroup}
                className="flex items-center gap-1.5 w-full rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mb-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Friend Group
              </button>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {friendGroups.map((group, gIndex) => (
                  <FriendGroupCard
                    key={group.id}
                    group={group}
                    index={gIndex}
                    students={students}
                    onRemoveGroup={removeFriendGroup}
                    onAddStudent={addStudentToGroup}
                    onRemoveStudent={removeStudentFromGroup}
                    getStudentGroup={getStudentGroup}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Student List */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <button
            onClick={() => setStudentsOpen(!studentsOpen)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-accent transition-colors text-left"
          >
            {studentsOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            <User className="h-4 w-4 shrink-0" />
            Students
            <span className="ml-auto text-xs text-muted-foreground">
              {students.length}
            </span>
          </button>

          {studentsOpen && (
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <div className="flex flex-col gap-0.5">
                {students.map((student) => {
                  const status = getStudentStatus(student.id);
                  return (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, student.id)}
                      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing ${statusColors[status]}`}
                    >
                      <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                      {editingStudent === student.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleFinishEdit(student.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleFinishEdit(student.id);
                            if (e.key === "Escape") setEditingStudent(null);
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-xs min-w-0"
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 truncate">{student.name}</span>
                      )}
                      <button
                        onClick={() => handleStartEdit(student.id, student.name)}
                        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        title="Rename student"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Friend Group Card subcomponent
function FriendGroupCard({
  group,
  index,
  students,
  onRemoveGroup,
  onAddStudent,
  onRemoveStudent,
  getStudentGroup,
}: {
  group: { id: string; studentIds: string[] };
  index: number;
  students: { id: string; name: string }[];
  onRemoveGroup: (id: string) => void;
  onAddStudent: (groupId: string, studentId: string) => void;
  onRemoveStudent: (groupId: string, studentId: string) => void;
  getStudentGroup: (studentId: string) => { id: string } | undefined;
}) {
  const [addingStudent, setAddingStudent] = useState(false);

  const availableStudents = students.filter(
    (s) => !getStudentGroup(s.id)
  );

  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold">Group {index + 1}</span>
        <button
          onClick={() => onRemoveGroup(group.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remove group"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 mb-1.5">
        {group.studentIds.map((sid) => {
          const student = students.find((s) => s.id === sid);
          return (
            <div
              key={sid}
              className="flex items-center justify-between rounded px-1.5 py-1 text-xs bg-accent"
            >
              <span className="truncate">{student?.name || "Unknown"}</span>
              <button
                onClick={() => onRemoveStudent(group.id, sid)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {group.studentIds.length < 6 && (
        <>
          {addingStudent ? (
            <select
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              onChange={(e) => {
                if (e.target.value) {
                  onAddStudent(group.id, e.target.value);
                  setAddingStudent(false);
                }
              }}
              onBlur={() => setAddingStudent(false)}
              autoFocus
            >
              <option value="">Select a student...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setAddingStudent(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Student
            </button>
          )}
        </>
      )}
    </div>
  );
}
