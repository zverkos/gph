export type EarningsMode = 'income' | 'hours';

export type EarningsSummary = {
  hoursWorked: number;
  amountEarned: number;
  desiredMonthlyIncome: number;
  totalHoursNeeded: number | null;
  progress: number;
};

export type EarningsSettings = {
  calculationMode: EarningsMode;
  hourlyRate: number;
  desiredMonthlyIncome: number;
  hoursPerDay: number;
  includeWeekends: boolean;
  currency: string;
};
