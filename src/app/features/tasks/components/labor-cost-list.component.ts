import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { LaborCostEntry } from '../models/labor-cost.model';
import { TranslationService } from '../../i18n/translation.service';
import { parseLocalDate } from '../../../utils/date.utils';

@Component({
  selector: 'app-labor-cost-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (laborCosts().length) {
      <ul class="labor-cost-list">
        @for (laborCost of laborCosts(); track laborCost.id; let i = $index) {
          @if (groupByDate() && shouldShowDateHeader(i)) {
            <li class="date-header">{{ formatDate(laborCost.date) }} <span class="date-hours">({{ getDayTotalHours(laborCost.date) }})</span></li>
          }
          <li>
            <div class="labor-cost-checkbox">
              <input
                type="checkbox"
                [checked]="laborCost.inTracker"
                (change)="toggleInTracker(laborCost)"
                [attr.aria-label]="t('inTracker')" />
            </div>
            <div class="labor-cost-content">
              <p class="labor-cost-title">{{ laborCost.title }}</p>
              <p class="labor-cost-meta">{{ formatTime(laborCost) }}</p>
              @if (laborCost.link) {
                <a class="labor-cost-link" [href]="laborCost.link" target="_blank" rel="noopener noreferrer">
                  {{ t('openLink') }}
                </a>
              }
            </div>
            <div class="labor-cost-actions">
              <button type="button" class="labor-cost-action-btn" (click)="laborCostSelected.emit(laborCost)" aria-label="Редактировать">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="labor-cost-action-btn delete" (click)="laborCostDeleted.emit(laborCost.id)" aria-label="Удалить">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <div class="empty-state">
        <svg class="empty-state-icon" width="80" height="80" viewBox="0 0 80 80" fill="none">
          <rect x="16" y="12" width="48" height="56" rx="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M28 28h24M28 40h24M28 52h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="58" cy="58" r="14" fill="var(--primary)" stroke="var(--primary)" stroke-width="2"/>
          <path d="M58 52v12M52 58h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <p class="empty-state-title">{{ t('noTasksMessage') }}</p>
        <button type="button" class="empty-state-action" (click)="addLaborCostClicked.emit()">{{ t('noTasksAction') }}</button>
      </div>
    }
  `
})
export class LaborCostListComponent {
  private translationService = inject(TranslationService);

  laborCosts = input.required<LaborCostEntry[]>();
  groupByDate = input<boolean>(false);
  
  laborCostSelected = output<LaborCostEntry>();
  laborCostDeleted = output<string>();
  addLaborCostClicked = output<void>();

  private groupedByDate = computed(() => {
    const costs = this.laborCosts();
    return costs.reduce((acc, laborCost) => {
      if (!acc[laborCost.date]) acc[laborCost.date] = [];
      acc[laborCost.date].push(laborCost);
      return acc;
    }, {} as Record<string, LaborCostEntry[]>);
  });

  t(key: any): string {
    return this.translationService.t(key);
  }

  shouldShowDateHeader(index: number): boolean {
    if (!this.groupByDate()) return false;
    if (index === 0) return true;
    
    const costs = this.laborCosts();
    return costs[index].date !== costs[index - 1].date;
  }

  formatDate(date: string): string {
    const parsed = parseLocalDate(date);
    const lang = this.translationService.currentLang();
    return parsed.toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  getDayTotalHours(date: string): string {
    const dayCosts = this.groupedByDate()[date] || [];
    const totalHours = dayCosts.reduce((sum, laborCost) => sum + getTotalHours(laborCost), 0);
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    if (m === 0) return `${h} ${this.t('hours')}`;
    return `${h} ${this.t('hours')} ${m} ${this.t('minutes')}`;
  }

  formatTime(laborCost: LaborCostEntry): string {
    if (laborCost.minutes === 0) {
      return `${laborCost.hours} ${this.t('hours')}`;
    }
    return `${laborCost.hours} ${this.t('hours')} ${laborCost.minutes} ${this.t('minutes')}`;
  }

  toggleInTracker(laborCost: LaborCostEntry) {
    // Эмитим событие обновления через основной компонент
    this.laborCostSelected.emit({ ...laborCost, inTracker: !laborCost.inTracker });
  }
}

// Импортируем функцию из модели
import { getTotalHours } from '../models/labor-cost.model';
