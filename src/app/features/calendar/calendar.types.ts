export type CalendarDay = {
  iso: string;
  label: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  tasks: any[];
  totalHours: number;
};
