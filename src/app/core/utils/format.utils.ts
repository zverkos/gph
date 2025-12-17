/**
 * Форматирование часов и минут
 * @param hours - количество часов (может быть дробным числом)
 * @param hourLabel - название часа
 * @param minuteLabel - название минут
 * @returns отформатированная строка
 */
export function formatHoursAndMinutes(
  hours: number,
  hourLabel: string = 'ч',
  minuteLabel: string = 'мин'
): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h} ${hourLabel}`;
  return `${h} ${hourLabel} ${m} ${minuteLabel}`;
}

/**
 * Правильное окончание слова "день" в зависимости от числа
 * @param days - количество дней
 * @returns корректное окончание слова
 */
export function formatDayWord(days: number): string {
  if (days % 10 === 1 && days % 100 !== 11) return 'день';
  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return 'дня';
  return 'дней';
}

/**
 * Преобразование даты в ISO строку (YYYY-MM-DD)
 * @param date - объект Date
 * @returns ISO строка
 */
export function getIsoString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
