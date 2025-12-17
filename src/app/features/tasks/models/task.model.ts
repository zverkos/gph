export type TaskEntry = {
  id: string;
  date: string;      // Дата задачи YYYY-MM-DD (на какой день)
  createdAt: string; // Время создания ISO datetime (когда создана)
  title: string;
  hours: number;     // целое число часов
  minutes: number;   // целое число минут (0-59)
  link?: string;
  inTracker: boolean;
};

/**
 * Возвращает общее количество часов (дробное) для расчётов
 */
export function getTotalHours(task: TaskEntry): number {
  return task.hours + task.minutes / 60;
}
