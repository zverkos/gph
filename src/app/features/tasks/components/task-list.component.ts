import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { TaskEntry } from '../models/task.model';
import { TranslationService } from '../../i18n/translation.service';
import { parseLocalDate } from '../../../utils/date.utils';

@Component({
  selector: 'app-task-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tasks().length) {
      <ul class="task-list">
        @for (task of tasks(); track task.id; let i = $index) {
          @if (groupByDate() && shouldShowDateHeader(i)) {
            <li class="date-header">{{ formatDate(task.date) }}</li>
          }
          <li>
            <div class="task-checkbox">
              <input
                type="checkbox"
                [checked]="task.inTracker"
                (change)="toggleInTracker(task)"
                [attr.aria-label]="t('inTracker')" />
            </div>
            <div class="task-content">
              <p class="task-title">{{ task.title }}</p>
              <p class="task-meta">{{ formatTime(task) }}</p>
              @if (task.link) {
                <a class="task-link" [href]="task.link" target="_blank" rel="noopener noreferrer">
                  {{ t('openLink') }}
                </a>
              }
            </div>
            <div class="task-actions">
              <button type="button" class="task-action-btn" (click)="taskSelected.emit(task)" aria-label="Редактировать">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" class="task-action-btn delete" (click)="taskDeleted.emit(task.id)" aria-label="Удалить">
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
        <button type="button" class="empty-state-action" (click)="addTaskClicked.emit()">{{ t('noTasksAction') }}</button>
      </div>
    }
  `
})
export class TaskListComponent {
  private translationService = inject(TranslationService);

  tasks = input.required<TaskEntry[]>();
  groupByDate = input(false);
  taskSelected = output<TaskEntry>();
  taskDeleted = output<string>();
  taskUpdated = output<{ id: string; patch: Partial<TaskEntry> }>();
  addTaskClicked = output<void>();

  t(key: string): string {
    return this.translationService.t(key as any);
  }

  formatTime(task: TaskEntry): string {
    if (task.minutes === 0) return `${task.hours} ${this.t('hours')}`;
    return `${task.hours} ${this.t('hours')} ${task.minutes} ${this.t('minutes')}`;
  }

  formatDate(iso: string): string {
    const date = parseLocalDate(iso);
    const lang = this.translationService.currentLang();
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    });
  }

  shouldShowDateHeader(index: number): boolean {
    if (index === 0) return true;
    const tasks = this.tasks();
    return tasks[index].date !== tasks[index - 1].date;
  }

  toggleInTracker(task: TaskEntry) {
    this.taskUpdated.emit({ id: task.id, patch: { inTracker: !task.inTracker } });
  }
}
