
import { DayOfWeek, Medium, Stream, DayConfig, TimeSlot, AppState } from './types';

export const COLORS = [
  '#f472b6', // pink-400
  '#a78bfa', // violet-400
  '#38bdf8', // sky-400
  '#4ade80', // green-400
  '#fbbf24', // amber-400
  '#fb7185', // rose-400
  '#94a3b8', // slate-400
];

export const INITIAL_SLOTS: TimeSlot[] = [
  { id: '1', index: 0, startTime: '08:00', endTime: '08:50', isRecess: false },
  { id: '2', index: 1, startTime: '08:50', endTime: '09:40', isRecess: false },
  { id: '3', index: 2, startTime: '09:40', endTime: '10:00', isRecess: true, name: 'Recess' },
  { id: '4', index: 3, startTime: '10:00', endTime: '10:50', isRecess: false },
  { id: '5', index: 4, startTime: '10:50', endTime: '11:40', isRecess: false },
  { id: '6', index: 5, startTime: '11:40', endTime: '12:30', isRecess: false },
];

export const INITIAL_DAYS: DayConfig[] = Object.values(DayOfWeek).map(day => ({
  day,
  isActive: day !== DayOfWeek.SATURDAY, // Default Mon-Fri
  lectureCount: 6,
  slots: [],
}));

export const INITIAL_STATE: AppState = {
  medium: Medium.ENGLISH,
  standards: [],
  globalSlots: INITIAL_SLOTS,
  dayConfigs: INITIAL_DAYS,
  subjects: [],
  faculties: [],
  generatedSchedule: null,
  savedSchedules: []
};
