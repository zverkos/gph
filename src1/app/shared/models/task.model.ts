export interface TaskEntry {
  id: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  hours: number;
  link?: string;
}

export interface CalendarDay {
  iso: string;
  label: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  tasks: TaskEntry[];
  totalHours: number;
}
