export type CalculationMode = 'income' | 'hours';
export type Language = 'ru' | 'en' | 'zh';
export type Currency = 'RUB' | 'USD' | 'EUR' | 'CNY';

export interface EarningsSettings {
  calculationMode: CalculationMode;
  language: Language;
  currency: Currency;
  hourlyRate: number;
  desiredMonthlyIncome: number;
  hoursPerDay: number;
  includeWeekends: boolean;
}

export interface MonthlySummary {
  hoursWorked: number;
  amountEarned: number;
  desiredMonthlyIncome: number;
  totalHoursNeeded: number | null;
  hoursRemaining: number | null;
  progress: number;
  hoursPerDayNeeded: number | null;
}
