

export enum Medium {
  ENGLISH = 'English',
  GUJARATI = 'Gujarati',
  HINDI = 'Hindi'
}

export enum Stream {
  NONE = 'None',
  SCIENCE = 'Science',
  COMMERCE = 'Commerce',
  ARTS = 'Arts'
}

export enum DayOfWeek {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday'
}

export interface Standard {
  id: string;
  name: string; // "10-A", "12-Science-B"
  grade: number; // 1-12
  stream: Stream;
  medium: Medium;
  division?: string; // "A", "B", "C"
}

export interface TimeSlot {
  id: string;
  index: number;
  startTime: string; // "08:30"
  endTime: string;   // "09:15"
  isRecess: boolean;
  name?: string; // Optional name "Lunch Break"
}

export interface DayConfig {
  day: DayOfWeek;
  isActive: boolean;
  lectureCount: number;
  slots: TimeSlot[]; // Overrides if needed
}

export interface Subject {
  id: string;
  name: string;
  standardId: string; // Links to a specific Standard+Medium combo
  lecturesPerWeek: number;
  color?: string;
}

export interface Faculty {
  id: string;
  name: string;
  email?: string;
  subjectIds: string[]; // Can teach these subjects (names or IDs)
  standardIds: string[]; // Can teach in these standards
  unavailableSlots: { day: DayOfWeek; slotIndex: number }[]; // Time constraints
}

export interface ScheduleCell {
  subjectId: string;
  facultyId: string;
}

export interface DailySchedule {
  [slotIndex: number]: ScheduleCell | null; // null means free or recess
}

export interface StandardSchedule {
  standardId: string;
  days: {
    [key in DayOfWeek]?: DailySchedule;
  };
}

export interface FullSchedule {
  id: string;
  name: string; // User-friendly name for versioning
  createdAt: number;
  schedules: StandardSchedule[];
}

export interface AppState {
  medium: Medium;
  standards: Standard[];
  globalSlots: TimeSlot[];
  dayConfigs: DayConfig[];
  subjects: Subject[];
  faculties: Faculty[];
  generatedSchedule: FullSchedule | null;
  savedSchedules: FullSchedule[]; // History of generated schedules
}

// --- Auth & Group Types ---

export enum UserRole {
  PRINCIPAL = 'Principal',   // Admin, Creator
  SUPERVISOR = 'Supervisor', // Can Edit
  TEACHER = 'Teacher'        // Read Only
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // stored in localstorage for mock auth
  photoURL?: string; // URL to profile image
  provider?: 'google' | 'email' | 'guest'; // Login provider
}

export interface GroupMember {
  userId: string;
  role: UserRole;
  joinedAt: number;
}

export interface SchoolGroup {
  id: string; // Unique 6-char ID
  name: string;
  adminId: string;
  members: GroupMember[];
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}
