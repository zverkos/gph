import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { TaskEntry } from '../models/task.model';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-task-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="task-list">
      @if (tasks().length) {
        @for (task of tasks(); track task.id) {
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
              <p class="task-meta">{{ formatHours(task.hours) }}</p>
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
      } @else {
        <li class="placeholder">{{ t('noTasksMessage') }}</li>
      }
    </ul>
  `
})
export class TaskListComponent {
  private translationService = inject(TranslationService);

  tasks = input.required<TaskEntry[]>();
  taskSelected = output<TaskEntry>();
  taskDeleted = output<string>();
  taskUpdated = output<{ id: string; patch: Partial<TaskEntry> }>();

  t(key: string): string {
    return this.translationService.t(key as any);
  }

  formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} ${this.t('hours')}`;
    return `${h} ${this.t('hours')} ${m} ${this.t('minutes')}`;
  }

  toggleInTracker(task: TaskEntry) {
    this.taskUpdated.emit({ id: task.id, patch: { inTracker: !task.inTracker } });
  }
}
