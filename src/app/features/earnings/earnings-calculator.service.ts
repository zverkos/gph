import { Injectable } from '@angular/core';
import { EarningsSummary, EarningsSettings } from './earnings.model';
import { TaskEntry, getTotalHours } from '../tasks/models/task.model';

@Injectable({ providedIn: 'root' })
export class EarningsCalculatorService {
  /**
   * Калькулирует статистику на основе задач и настроек
   */
  calculateSummary(
    tasks: TaskEntry[],
    yearMonth: string, // формат YYYY-MM
    settings: EarningsSettings,
    workingDaysInMonth: number
  ): EarningsSummary {
    const monthTasks = tasks.filter((t) => t.date.startsWith(yearMonth));

    const hoursWorked = monthTasks.reduce((sum, t) => sum + getTotalHours(t), 0);
    const hourlyRate = settings.hourlyRate || 0;
    const desiredIncome = settings.desiredMonthlyIncome || 0;
    const hoursPerDay = settings.hoursPerDay || 8;

    let amountEarned = 0;
    let totalHoursNeeded: number | null = null;

    if (settings.calculationMode === 'income') {
      amountEarned = Math.round(hoursWorked * hourlyRate);
      totalHoursNeeded = desiredIncome > 0 ? desiredIncome / hourlyRate : null;
    } else {
      totalHoursNeeded = workingDaysInMonth * hoursPerDay;
    }

    const progress = totalHoursNeeded ? Math.min(Math.round((hoursWorked / totalHoursNeeded) * 100), 100) : 0;

    return {
      hoursWorked,
      amountEarned,
      desiredMonthlyIncome: desiredIncome,
      totalHoursNeeded,
      progress
    };
  }

  /**
   * Расчитывает количество рабочих дней в месяце
   */
  calculateWorkingDays(month: Date, includeWeekends: boolean): number {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let count = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (includeWeekends || (d.getDay() !== 0 && d.getDay() !== 6)) {
        count++;
      }
    }

    return count;
  }
}
