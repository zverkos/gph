export type LaborCostEntry = {
  id: string;
  date: string;      // Дата трудозатрат YYYY-MM-DD (на какой день)
  createdAt: string; // Время создания ISO datetime (когда созданы)
  title: string;
  hours: number;     // целое число часов
  minutes: number;   // целое число минут (0-59)
  link?: string;
  inTracker: boolean;
};

/**
 * Возвращает общее количество часов (дробное) для расчётов
 */
export function getTotalHours(laborCost: LaborCostEntry): number {
  return laborCost.hours + laborCost.minutes / 60;
}

// Для обратной совместимости пока оставим старый тип
export type TaskEntry = LaborCostEntry;
export { getTotalHours as getTotalHoursFromTask };
