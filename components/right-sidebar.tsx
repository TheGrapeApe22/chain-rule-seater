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
import s from "./right-sidebar.module.css";

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
      for (const seat of t.seats) {
        if (seat.studentId === studentId) {
          return seat.locked ? "locked" : "seated";
        }
      }
    }
    return "unseated";
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
    <div className={s.wrapper} style={{ width: sidebarWidth }}>
      {/* Resize handle */}
      <div
        className={s.resizeHandle}
        onMouseDown={handleResizeStart}
      />

      <div className={s.panel}>
        {/* Friend Groups */}
        <div>
          <button
            onClick={() => setFriendGroupsOpen(!friendGroupsOpen)}
            className={s.sectionToggle}
          >
            {friendGroupsOpen ? (
              <ChevronDown size={16} style={{ flexShrink: 0 }} />
            ) : (
              <ChevronRight size={16} style={{ flexShrink: 0 }} />
            )}
            <Users size={16} style={{ flexShrink: 0 }} />
            Friend Groups
            <span className={s.count}>
              {friendGroups.length}
            </span>
          </button>

          {friendGroupsOpen && (
            <div className={s.sectionContent}>
              <button
                onClick={addFriendGroup}
                className={s.addGroupBtn}
              >
                <Plus size={14} />
                Add Friend Group
              </button>

              <div className={s.groupList}>
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

        <div className={s.sectionDivider} />

        {/* Student List */}
        <div className={s.studentsSection}>
          <button
            onClick={() => setStudentsOpen(!studentsOpen)}
            className={s.sectionToggle}
          >
            {studentsOpen ? (
              <ChevronDown size={16} style={{ flexShrink: 0 }} />
            ) : (
              <ChevronRight size={16} style={{ flexShrink: 0 }} />
            )}
            <User size={16} style={{ flexShrink: 0 }} />
            Students
            <span className={s.count}>
              {students.length}
            </span>
          </button>

          {studentsOpen && (
            <div className={s.studentList}>
              <div className={s.studentListInner}>
                {students.map((student) => {
                  const status = getStudentStatus(student.id);
                  return (
                    <div
                      key={student.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, student.id)}
                      className={`${s.studentCard} ${s[status]}`}
                    >
                      <GripVertical size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
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
                          className={s.editInput}
                          autoFocus
                        />
                      ) : (
                        <span className={s.studentName}>{student.name}</span>
                      )}
                      <button
                        onClick={() => handleStartEdit(student.id, student.name)}
                        className={s.editBtn}
                        title="Rename student"
                      >
                        <Pencil size={12} />
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
    (st) => !getStudentGroup(st.id)
  );

  return (
    <div className={s.groupCard}>
      <div className={s.groupHeader}>
        <span className={s.groupTitle}>Group {index + 1}</span>
        <button
          onClick={() => onRemoveGroup(group.id)}
          className={s.iconBtn}
          title="Remove group"
        >
          <X size={14} />
        </button>
      </div>

      <div className={s.groupMembers}>
        {group.studentIds.map((sid) => {
          const student = students.find((st) => st.id === sid);
          return (
            <div key={sid} className={s.memberRow}>
              <span className={s.memberName}>{student?.name || "Unknown"}</span>
              <button
                onClick={() => onRemoveStudent(group.id, sid)}
                className={s.iconBtn}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {group.studentIds.length < 6 && (
        <>
          {addingStudent ? (
            <select
              className={s.addStudentSelect}
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
              {availableStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setAddingStudent(true)}
              className={s.addStudentBtn}
            >
              <Plus size={12} />
              Add Student
            </button>
          )}
        </>
      )}
    </div>
  );
}
