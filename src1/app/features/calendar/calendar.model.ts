export type CalendarDay = {
  iso: string;
  label: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  totalHours: number;
};

export type CalendarWeek = CalendarDay[];
