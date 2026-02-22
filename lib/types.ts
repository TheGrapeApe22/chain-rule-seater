export interface Student {
  id: string;
  name: string;
}

export interface Seat {
  id: string;
  studentId: string | null;
  locked: boolean;
}

export interface Table {
  id: string;
  name: string;
  capacity: number;
  seats: Seat[];
  x: number;
  y: number;
}

export interface FriendGroup {
  id: string;
  studentIds: string[];
}

export interface ChartState {
  name: string;
  teacher: string;
  students: Student[];
  tables: Table[];
  friendGroups: FriendGroup[];
}
