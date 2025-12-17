export type TaskEntry = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  title: string;
  hours: number;
  link?: string;
  inTracker: boolean;
};
