import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TaskEntry, getTotalHours } from '../../../tasks/models/task.model';

@Component({
  selector: 'app-possible-earnings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="stat-card possible-card">
      <p class="stat-card-label">Возможно</p>
      <p class="stat-card-value">
        {{ remainingPotential() | currency:currency():'symbol-narrow':'1.0-0':currencyLocale() }}
        <span class="stat-card-sub">за {{ remainingDaysInMonth() }} дней</span>
      </p>
    </article>
  `,
  styleUrls: ['./possible-earnings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PossibleEarningsComponent {
  readonly tasks = input.required<ReadonlyArray<TaskEntry>>();

  readonly hourlyRate = input.required<number>();
  readonly hoursPerDay = input.required<number>();
  readonly remainingDaysInMonth = input.required<number>();

  readonly currency = input.required<string>();
  readonly currencyLocale = input.required<string>();

  readonly earnedSoFar = computed(() => {
    const rate = this.hourlyRate();
    if (!Number.isFinite(rate) || rate <= 0) return 0;

    const hoursWorked = this.tasks().reduce((sum, task) => sum + getTotalHours(task), 0);
    return Math.round(hoursWorked * rate);
  });

  readonly dailyPotential = computed(() => {
    const rate = this.hourlyRate();
    const hoursPerDay = this.hoursPerDay();
    if (!Number.isFinite(rate) || rate <= 0) return 0;
    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) return 0;
    return Math.round(rate * hoursPerDay);
  });

  readonly remainingPotential = computed(() => {
    const remainingDays = this.remainingDaysInMonth();
    if (!Number.isFinite(remainingDays) || remainingDays <= 0) return 0;
    return Math.round(this.dailyPotential() * remainingDays);
  });

  readonly projectedTotal = computed(() => this.earnedSoFar() + this.remainingPotential());
}
