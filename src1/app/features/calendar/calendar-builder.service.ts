import { Injectable } from '@angular/core';
import { CalendarDay, CalendarWeek } from './calendar.model';
import { getIsoString } from '../../core/utils/format.utils';

@Injectable({ providedIn: 'root' })
export class CalendarBuilderService {
  /**
   * Построит матрицу недель на строку в несколько рядов
   */
  buildWeeks(
    month: Date,
    today: Date,
    hoursByDate: Map<string, number>
  ): CalendarWeek[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks: CalendarWeek[] = [];
    let current = new Date(startDate);
    const todayIso = getIsoString(today);

    while (current <= lastDay) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = getIsoString(current);
        const inCurrentMonth = current.getMonth() === month.getMonth();
        const totalHours = hoursByDate.get(iso) || 0;

        week.push({
          iso,
          label: current.getDate(),
          inCurrentMonth,
          isToday: iso === todayIso,
          totalHours
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    return weeks;
  }
}
