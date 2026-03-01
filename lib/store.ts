import { create } from "zustand";
import type { Student, Seat, Table, FriendGroup, ChartState } from "./types";

let nextStudentId = 1;
function generateStudentId(): string {
  return `student-${nextStudentId++}`;
}

let nextTableId = 1;
function generateTableId(): string {
  return `table-${nextTableId++}`;
}

let nextSeatId = 1;
function generateSeatId(): string {
  return `seat-${nextSeatId++}`;
}

let nextGroupId = 1;
function generateGroupId(): string {
  return `group-${nextGroupId++}`;
}

function createSeats(capacity: number): Seat[] {
  return Array.from({ length: capacity }, () => ({
    id: generateSeatId(),
    studentId: null,
    locked: false,
  }));
}

interface SeatingChartStore extends ChartState {
  // Chart metadata
  setName: (name: string) => void;

  // Students
  addStudentsFromRoster: (names: string[]) => void;
  renameStudent: (studentId: string, newName: string) => void;
  resetRoster: () => void;

  // Tables
  addTables: (count: number, capacity: number) => void;
  removeTable: (tableId: string) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  setTableCapacity: (tableId: string, newCapacity: number) => void;
  renameTable: (tableId: string, newName: string) => void;

  // Seats
  toggleSeatLock: (seatId: string) => void;
  lockAllSeats: () => void;
  unlockAllSeats: () => void;
  lockTableSeats: (tableId: string) => void;
  unlockTableSeats: (tableId: string) => void;
  assignStudentToSeat: (studentId: string, seatId: string) => void;
  removeStudentFromSeat: (seatId: string) => void;
  swapSeats: (seatId1: string, seatId2: string) => void;
  clearUnlockedSeats: () => void;

  // Friend groups
  addFriendGroup: () => void;
  removeFriendGroup: (groupId: string) => void;
  addStudentToGroup: (groupId: string, studentId: string) => void;
  removeStudentFromGroup: (groupId: string, studentId: string) => void;

  // Random fill
  randomFill: () => void;

  // Save/Load
  exportToJson: () => string;
  importFromJson: (json: string) => void;

  // Helpers
  getStudentById: (id: string) => Student | undefined;
  getStudentGroup: (studentId: string) => FriendGroup | undefined;
}

export const useSeatingStore = create<SeatingChartStore>((set, get) => ({
  name: "Untitled Chart",
  teacher: "",
  students: [],
  tables: [],
  friendGroups: [],

  setName: (name) => set({ name }),

  addStudentsFromRoster: (names) => {
    const newStudents: Student[] = names
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .map((name) => ({ id: generateStudentId(), name }));
    set((state) => ({ students: [...state.students, ...newStudents] }));
  },

  renameStudent: (studentId, newName) => {
    set((state) => ({
      students: state.students.map((s) =>
        s.id === studentId ? { ...s, name: newName } : s
      ),
    }));
  },

  resetRoster: () => {
    set((state) => ({
      students: [],
      friendGroups: [],
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) => ({ ...s, studentId: null })),
      })),
    }));
  },

  addTables: (count, capacity) => {
    const newTables: Table[] = Array.from({ length: count }, (_, i) => {
      const id = generateTableId();
      return {
        id,
        name: id.replace("table-", "T"),
        capacity,
        seats: createSeats(capacity),
        x: 100 + (i % 5) * 220,
        y: 100 + Math.floor(i / 5) * 180,
      };
    });
    set((state) => ({ tables: [...state.tables, ...newTables] }));
  },

  removeTable: (tableId) => {
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
    }));
  },

  moveTable: (tableId, x, y) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, x, y } : t
      ),
    }));
  },

  setTableCapacity: (tableId, newCapacity) => {
    set((state) => ({
      tables: state.tables.map((t) => {
        if (t.id !== tableId) return t;
        const clamped = Math.max(2, Math.min(6, newCapacity));
        if (clamped >= t.capacity) {
          // Add seats
          const additionalSeats = createSeats(clamped - t.capacity);
          return { ...t, capacity: clamped, seats: [...t.seats, ...additionalSeats] };
        } else {
          // Remove seats from the end
          return { ...t, capacity: clamped, seats: t.seats.slice(0, clamped) };
        }
      }),
    }));
  },

  renameTable: (tableId, newName) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, name: newName } : t
      ),
    }));
  },

  toggleSeatLock: (seatId) => {
    set((state) => ({
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) =>
          s.id === seatId ? { ...s, locked: !s.locked } : s
        ),
      })),
    }));
  },

  lockAllSeats: () => {
    set((state) => ({
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) => ({ ...s, locked: true })),
      })),
    }));
  },

  unlockAllSeats: () => {
    set((state) => ({
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) => ({ ...s, locked: false })),
      })),
    }));
  },

  lockTableSeats: (tableId) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? { ...t, seats: t.seats.map((s) => ({ ...s, locked: true })) }
          : t
      ),
    }));
  },

  unlockTableSeats: (tableId) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? { ...t, seats: t.seats.map((s) => ({ ...s, locked: false })) }
          : t
      ),
    }));
  },

  assignStudentToSeat: (studentId, seatId) => {
    set((state) => {
      // First, remove student from any current seat
      const tables = state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) =>
          s.studentId === studentId ? { ...s, studentId: null } : s
        ),
      }));
      // Then assign to new seat
      return {
        tables: tables.map((t) => ({
          ...t,
          seats: t.seats.map((s) =>
            s.id === seatId ? { ...s, studentId } : s
          ),
        })),
      };
    });
  },

  removeStudentFromSeat: (seatId) => {
    set((state) => ({
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) =>
          s.id === seatId ? { ...s, studentId: null } : s
        ),
      })),
    }));
  },

  swapSeats: (seatId1, seatId2) => {
    set((state) => {
      let student1: string | null = null;
      let student2: string | null = null;
      state.tables.forEach((t) =>
        t.seats.forEach((s) => {
          if (s.id === seatId1) student1 = s.studentId;
          if (s.id === seatId2) student2 = s.studentId;
        })
      );
      return {
        tables: state.tables.map((t) => ({
          ...t,
          seats: t.seats.map((s) => {
            if (s.id === seatId1) return { ...s, studentId: student2 };
            if (s.id === seatId2) return { ...s, studentId: student1 };
            return s;
          }),
        })),
      };
    });
  },

  clearUnlockedSeats: () => {
    set((state) => ({
      tables: state.tables.map((t) => ({
        ...t,
        seats: t.seats.map((s) =>
          s.locked ? s : { ...s, studentId: null }
        ),
      })),
    }));
  },

  addFriendGroup: () => {
    const newGroup: FriendGroup = {
      id: generateGroupId(),
      studentIds: [],
    };
    set((state) => ({ friendGroups: [...state.friendGroups, newGroup] }));
  },

  removeFriendGroup: (groupId) => {
    set((state) => ({
      friendGroups: state.friendGroups.filter((g) => g.id !== groupId),
    }));
  },

  addStudentToGroup: (groupId, studentId) => {
    const state = get();
    // Check student is not already in a group
    if (state.friendGroups.some((g) => g.studentIds.includes(studentId))) return;
    // Check group not at max capacity
    const group = state.friendGroups.find((g) => g.id === groupId);
    if (!group || group.studentIds.length >= 6) return;

    set((state) => ({
      friendGroups: state.friendGroups.map((g) =>
        g.id === groupId
          ? { ...g, studentIds: [...g.studentIds, studentId] }
          : g
      ),
    }));
  },

  removeStudentFromGroup: (groupId, studentId) => {
    set((state) => ({
      friendGroups: state.friendGroups.map((g) =>
        g.id === groupId
          ? { ...g, studentIds: g.studentIds.filter((id) => id !== studentId) }
          : g
      ),
    }));
  },

  randomFill: () => {
    const state = get();

    // Gather locked student IDs
    const lockedStudentIds = new Set<string>();
    state.tables.forEach((t) =>
      t.seats.forEach((s) => {
        if (s.locked && s.studentId) lockedStudentIds.add(s.studentId);
      })
    );

    // Check precondition
    const unlockedSeatCount = state.tables.reduce(
      (acc, t) => acc + t.seats.filter((s) => !s.locked).length,
      0
    );
    const unseatedOrUnlockedStudents = state.students.filter(
      (s) => !lockedStudentIds.has(s.id)
    );
    if (unlockedSeatCount < unseatedOrUnlockedStudents.length) {
      alert(
        `Not enough open seats: You have ${unseatedOrUnlockedStudents.length} unlocked/unseated students and ${unlockedSeatCount} unlocked seats.`
      );
      return;
    }

    // Step 1: Remove all students from unlocked seats
    const tables: Table[] = state.tables.map((t) => ({
      ...t,
      seats: t.seats.map((s) =>
        s.locked ? s : { ...s, studentId: null }
      ),
    }));

    const seatedStudentIds = new Set<string>();

    // Helper: get available (unlocked, empty) seats at a table
    const getAvailableSeats = (table: Table) =>
      table.seats.filter((s) => !s.locked && s.studentId === null);

    // Step 2: friend groups with at least one member already seated (locked)
    const groupsWithSeated: FriendGroup[] = [];
    const groupsWithout: FriendGroup[] = [];

    state.friendGroups.forEach((g) => {
      const hasSeatedMember = g.studentIds.some((sid) => lockedStudentIds.has(sid));
      if (hasSeatedMember) {
        groupsWithSeated.push(g);
      } else {
        groupsWithout.push(g);
      }
    });

    // Sort by descending group size
    groupsWithSeated.sort((a, b) => b.studentIds.length - a.studentIds.length);

    for (const group of groupsWithSeated) {
      // Find the table where the locked member is
      const lockedMember = group.studentIds.find((sid) => lockedStudentIds.has(sid));
      if (!lockedMember) continue;

      let targetTable: Table | undefined;
      for (const t of tables) {
        if (t.seats.some((s) => s.studentId === lockedMember)) {
          targetTable = t;
          break;
        }
      }
      if (!targetTable) continue;

      const unseatedMembers = group.studentIds.filter(
        (sid) => !lockedStudentIds.has(sid) && !seatedStudentIds.has(sid)
      );
      const availableSeats = getAvailableSeats(targetTable);

      // Shuffle the available seats
      for (let i = availableSeats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableSeats[i], availableSeats[j]] = [availableSeats[j], availableSeats[i]];
      }

      const toSeat = unseatedMembers.slice(0, availableSeats.length);
      toSeat.forEach((sid, i) => {
        availableSeats[i].studentId = sid;
        seatedStudentIds.add(sid);
      });
    }

    // Step 3: remaining friend groups
    groupsWithout.sort((a, b) => b.studentIds.length - a.studentIds.length);

    for (const group of groupsWithout) {
      const unseatedMembers = group.studentIds.filter(
        (sid) => !seatedStudentIds.has(sid) && !lockedStudentIds.has(sid)
      );
      if (unseatedMembers.length === 0) continue;

      // Find a table with enough seats
      let bestTable: Table | undefined;
      let bestAvailable: Seat[] = [];

      // First try to find all tables that fit all members, then pick a random one
      const tablesWithEnoughSeats: { table: Table; available: Seat[] }[] = [];
      for (const t of tables) {
        const avail = getAvailableSeats(t);
        if (avail.length >= unseatedMembers.length) {
          tablesWithEnoughSeats.push({ table: t, available: avail });
        }
      }

      if (tablesWithEnoughSeats.length > 0) {
        // Pick a random table
        const randomIndex = Math.floor(Math.random() * tablesWithEnoughSeats.length);
        const chosen = tablesWithEnoughSeats[randomIndex];
        bestTable = chosen.table;
        bestAvailable = chosen.available;
      } else {
        // Otherwise pick a random table with the most available seats
        let maxAvail = 0;
        const tablesWithMostSeats: { table: Table; available: Seat[] }[] = [];

        for (const t of tables) {
          const avail = getAvailableSeats(t);
          if (avail.length > maxAvail) {
            maxAvail = avail.length;
            tablesWithMostSeats.length = 0;
            tablesWithMostSeats.push({ table: t, available: avail });
          } else if (avail.length === maxAvail && maxAvail > 0) {
            tablesWithMostSeats.push({ table: t, available: avail });
          }
        }

        if (tablesWithMostSeats.length > 0) {
          const randomIndex = Math.floor(Math.random() * tablesWithMostSeats.length);
          const chosen = tablesWithMostSeats[randomIndex];
          bestTable = chosen.table;
          bestAvailable = chosen.available;
        }
      }

      if (!bestTable) continue;

      // Shuffle the available seats within the chosen table
      for (let i = bestAvailable.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bestAvailable[i], bestAvailable[j]] = [bestAvailable[j], bestAvailable[i]];
      }

      const toSeat = unseatedMembers.slice(0, bestAvailable.length);
      toSeat.forEach((sid, i) => {
        bestAvailable[i].studentId = sid;
        seatedStudentIds.add(sid);
      });
    }

    // Step 4: Place remaining students randomly
    const remainingStudents = unseatedOrUnlockedStudents
      .filter((s) => !seatedStudentIds.has(s.id) && !lockedStudentIds.has(s.id))
      .map((s) => s.id);

    // Shuffle
    for (let i = remainingStudents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingStudents[i], remainingStudents[j]] = [remainingStudents[j], remainingStudents[i]];
    }

    const allEmptySeats: Seat[] = [];
    tables.forEach((t) => {
      t.seats.forEach((s) => {
        if (!s.locked && s.studentId === null) allEmptySeats.push(s);
      });
    });

    // Shuffle empty seats too
    for (let i = allEmptySeats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allEmptySeats[i], allEmptySeats[j]] = [allEmptySeats[j], allEmptySeats[i]];
    }

    remainingStudents.forEach((sid, i) => {
      if (i < allEmptySeats.length) {
        allEmptySeats[i].studentId = sid;
      }
    });

    set({ tables });
  },

  exportToJson: () => {
    const state = get();
    const data: ChartState = {
      name: state.name,
      teacher: state.teacher,
      students: state.students,
      tables: state.tables,
      friendGroups: state.friendGroups,
    };
    return JSON.stringify(data, null, 2);
  },

  importFromJson: (json) => {
    try {
      const data: ChartState = JSON.parse(json);
      // Re-sync internal ID counters
      let maxStudent = 0;
      let maxTable = 0;
      let maxSeat = 0;
      let maxGroup = 0;
      data.students.forEach((s) => {
        const num = parseInt(s.id.replace("student-", ""));
        if (num > maxStudent) maxStudent = num;
      });
      data.tables.forEach((t) => {
        const tNum = parseInt(t.id.replace("table-", ""));
        if (tNum > maxTable) maxTable = tNum;
        t.seats.forEach((s) => {
          const sNum = parseInt(s.id.replace("seat-", ""));
          if (sNum > maxSeat) maxSeat = sNum;
        });
      });
      data.friendGroups.forEach((g) => {
        const num = parseInt(g.id.replace("group-", ""));
        if (num > maxGroup) maxGroup = num;
      });
      nextStudentId = maxStudent + 1;
      nextTableId = maxTable + 1;
      nextSeatId = maxSeat + 1;
      nextGroupId = maxGroup + 1;

      set({
        name: data.name,
        teacher: data.teacher,
        students: data.students,
        tables: data.tables,
        friendGroups: data.friendGroups,
      });
    } catch {
      alert("Failed to load file. Invalid JSON format.");
    }
  },

  getStudentById: (id) => {
    return get().students.find((s) => s.id === id);
  },

  getStudentGroup: (studentId) => {
    return get().friendGroups.find((g) => g.studentIds.includes(studentId));
  },
}));
