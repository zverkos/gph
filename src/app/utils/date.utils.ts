/**
 * Парсит ISO datetime строку и возвращает локальную дату (без времени)
 * Работает с полным ISO форматом (2024-12-12T00:00:00.000Z) и коротким (2024-12-12)
 */
export function parseLocalDate(iso: string): Date {
  const date = new Date(iso);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Создает ISO datetime строку для начала дня в локальном часовом поясе
 * Результат: 2024-12-12T00:00:00.000Z (UTC эквивалент локальной полуночи)
 */
export function toIsoDatetime(date: Date): string {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return localMidnight.toISOString();
}

/**
 * Форматирует дату в короткую ISO строку (YYYY-MM-DD) для отображения/группировки
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Извлекает ключ даты (YYYY-MM-DD) из ISO datetime строки
 */
export function getDateKey(iso: string): string {
  const date = parseLocalDate(iso);
  return toDateKey(date);
}

/**
 * Возвращает сегодняшнюю дату в локальном часовом поясе (без времени)
 */
export function getLocalToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Проверяет, находится ли ISO datetime в указанном месяце
 */
export function isDateInMonth(iso: string, month: Date): boolean {
  const date = parseLocalDate(iso);
  return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
}
