import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import localeRu from '@angular/common/locales/ru';

import { TaskEntry } from './features/tasks/models/task.model';
import { TaskStore } from './features/tasks/task-store.service';
import { TaskFormComponent } from './features/tasks/components/task-form.component';
import { TaskListComponent } from './features/tasks/components/task-list.component';
import { TranslationService } from './features/i18n/translation.service';
import { SupportedLang, TRANSLATIONS } from './features/i18n/translations';

registerLocaleData(localeRu);

type CalendarDay = {
  iso: string;
  label: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  totalHours: number;
};

const WEEKDAY_LABELS_RU: ReadonlyArray<string> = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_LABELS_EN: ReadonlyArray<string> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_LABELS_ZH: ReadonlyArray<string> = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const DECIMAL_INPUT_PATTERN = /^$|^\d+(?:,\d+)?$/;
type EarningsControlName = 'hourlyRate' | 'hoursWorked' | 'desiredMonthlyIncome' | 'hoursPerDay';

const STORAGE_KEYS = {
  EARNINGS_FORM: 'gph_earnings_form'
} as const;

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, TaskFormComponent, TaskListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="app-shell">
      <section class="panel result-panel">
        <div class="result-grid">
          <div class="result-primary">
            <header class="result-header">
              <div class="result-heading">
                <p class="eyebrow">{{ t('monthResult') }}</p>
                <div class="month-actions">
                  <button
                    type="button"
                    class="nav-button"
                    (click)="goToPreviousMonth()"
                    aria-label="Предыдущий месяц"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                  <span class="month-label">{{ selectedMonthLabel() }}</span>
                  <button
                    type="button"
                    class="nav-button"
                    (click)="goToNextMonth()"
                    aria-label="Следующий месяц"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </header>
          </div>

          <div class="result-actions">
            <button type="button" class="icon-btn" (click)="toggleTheme()" [attr.aria-label]="isDarkTheme() ? 'Светлая тема' : 'Темная тема'">
              @if (isDarkTheme()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              }
            </button>
            <button type="button" class="icon-btn" (click)="toggleSettings()" aria-label="Настройки">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
      </section>

      <div class="bottom-row">
        <section class="panel calendar-panel">
          <header class="panel-header row">
            <p class="eyebrow">{{ t('calendarMonth') }}</p>
            <button type="button" class="icon-btn" (click)="shareMonthResults()" title="Поделиться результатами месяца">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
          </header>

          <div class="result-stats stat-grid" aria-label="Краткая статистика">
            <article class="stat-card accent">
              <div class="stat-item">
                <p class="caption">Заработано</p>
                <p class="value">
                  {{ summary().amountEarned | currency:'RUB':'symbol-narrow':'1.2-2':'ru-RU' }} из
                  {{ summary().desiredMonthlyIncome | currency:'RUB':'symbol-narrow':'1.2-2':'ru-RU' }}
                </p>
                <div class="result-progress compact">
                  <div
                    class="progress"
                    role="progressbar"
                    [attr.aria-valuenow]="summary().progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div class="progress-fill" [style.width.%]="summary().progress"></div>
                  </div>
                </div>
              </div>
            </article>
            <article class="stat-card">
              <div class="stat-item">
                <p class="caption">Отработано</p>
                <p class="value">
                  @if (summary().totalHoursNeeded !== null) {
                    {{ formatHoursAndMinutes(summary().hoursWorked) }} из
                    {{ formatHoursAndMinutes(summary().totalHoursNeeded ?? 0) }}
                  } @else {
                    {{ formatHoursAndMinutes(summary().hoursWorked) }}
                  }
                </p>
              </div>
            </article>
          </div>

          <div class="calendar-grid" aria-label="Календарь задач">
            <div class="calendar-weekday-row">
              @for (weekday of weekdayLabels(); track weekday) {
                <span class="weekday-label">{{ weekday }}</span>
              }
            </div>

            <div class="calendar-weeks">
              @for (week of calendarWeeks(); track $index) {
                <div class="calendar-week">
                  @for (day of week; track day.iso) {
                    <button
                      type="button"
                      class="day-cell"
                      [class.outside]="!day.inCurrentMonth"
                      [class.today]="day.isToday"
                      [class.selected]="day.iso === selectedDate()"
                      [class.has-tasks]="day.totalHours > 0"
                      [title]="getDayTooltip(day.iso)"
                      (click)="selectDate(day.iso)"
                    >
                      <span class="day-number">{{ day.label }}</span>
                      @if (shouldShowDayIndicator(day.iso) && day.inCurrentMonth) {
                        <span class="day-indicator" [class.goal-met]="isDayGoalMet(day.iso)"></span>
                      }
                    </button>
                  }
                </div>
              }
            </div>
            <div class="calendar-actions">
              <button type="button" class="ghost-button" (click)="selectToday()">{{ t('today') }}</button>
            </div>
          </div>

          @if (remainingDaysInMonth() > 0) {
            <p class="days-hint">
              {{ t('daysRemaining') }} <strong>{{ remainingDaysInMonth() }}</strong> {{ t('of') }} <strong>{{ workingDaysInMonth() }}</strong>
            </p>
          }
        </section>

        <section class="panel form-panel">
          <header class="panel-header row">
            <p class="eyebrow">{{ t('newTask') }}</p>
          </header>
          <app-task-form
            [selectedDate]="selectedDate()"
            (taskCreated)="onTaskCreated($event)">
          </app-task-form>
        </section>

        <section class="panel list-panel">
          <header class="panel-header row">
            <p class="eyebrow">{{ t('dayDetails') }}: {{ selectedDayLabel() }}</p>
            <button type="button" class="icon-btn" (click)="shareDayResults()" title="Скопировать задачи дня">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
          </header>
          <app-task-list
            [tasks]="selectedDayTasks()"
            (taskSelected)="openEditDialog($event)"
            (taskDeleted)="confirmDeleteTask($event)"
            (taskUpdated)="updateTask($event)">
          </app-task-list>
        </section>
      </div>
    </main>

    @if (settingsOpened()) {
      <div class="settings-backdrop" role="dialog" aria-modal="true" aria-label="Настройки расчёта" (click)="toggleSettings()">
        <section class="settings-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">{{ t('settings') }}</p>
            <button type="button" class="icon-btn" (click)="toggleSettings()" aria-label="Закрыть">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <form class="settings-form" [formGroup]="earningsForm">
            <div class="field field-full">
              <span class="field-label">{{ t('calculationMode') }}</span>
              <div class="mode-toggle">
                <button
                  type="button"
                  class="mode-button"
                  [class.active]="calculationMode() === 'income'"
                  (click)="controls.calculationMode.setValue('income')">
                  {{ t('byIncome') }}
                </button>
                <button
                  type="button"
                  class="mode-button"
                  [class.active]="calculationMode() === 'hours'"
                  (click)="controls.calculationMode.setValue('hours')">
                  {{ t('byHours') }}
                </button>
              </div>
            </div>

            <div class="field">
              <span class="field-label">{{ t('language') }}</span>
              <div class="mode-toggle">
                <button
                  type="button"
                  class="mode-button compact"
                  [class.active]="controls.language.value === 'ru'"
                  (click)="setLanguage('ru')">
                  Русский
                </button>
                <button
                  type="button"
                  class="mode-button compact"
                  [class.active]="controls.language.value === 'en'"
                  (click)="setLanguage('en')">
                  English
                </button>
                <button
                  type="button"
                  class="mode-button compact"
                  [class.active]="controls.language.value === 'zh'"
                  (click)="setLanguage('zh')">
                  中文
                </button>
              </div>
            </div>

            <div class="field">
              <span class="field-label">{{ t('currency') }}</span>
              <div class="mode-toggle">
                <button type="button" class="mode-button compact" [class.active]="controls.currency.value === 'RUB'" (click)="controls.currency.setValue('RUB')">RUB ₽</button>
                <button type="button" class="mode-button compact" [class.active]="controls.currency.value === 'USD'" (click)="controls.currency.setValue('USD')">USD $</button>
                <button type="button" class="mode-button compact" [class.active]="controls.currency.value === 'EUR'" (click)="controls.currency.setValue('EUR')">EUR €</button>
              </div>
            </div>

            <div class="field">
              <label>
                <span class="field-label">{{ t('hourlyRate') }}</span>
                <input type="text" inputmode="decimal" formControlName="hourlyRate" placeholder="1000" />
              </label>
            </div>

            @if (calculationMode() === 'income') {
              <div class="field">
                <label>
                  <span class="field-label">{{ t('desiredIncome') }}</span>
                  <input type="text" inputmode="decimal" formControlName="desiredMonthlyIncome" placeholder="30000" />
                </label>
              </div>
            }

            @if (calculationMode() === 'hours') {
              <div class="field">
                <label>
                  <span class="field-label">{{ t('hoursPerDay') }}</span>
                  <input type="text" inputmode="decimal" formControlName="hoursPerDay" placeholder="8" />
                </label>
              </div>
            }

            <div class="checkbox-field">
              <input type="checkbox" id="include-weekends" formControlName="includeWeekends" />
              <label for="include-weekends">{{ t('includeWeekends') }}</label>
            </div>
          </form>
        </section>
      </div>
    }

    @if (deleteTaskId()) {
      <div class="settings-backdrop" (click)="cancelDelete()">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <p class="confirm-message">{{ t('deleteConfirmTitle') }}</p>
          <div class="confirm-actions">
            <button type="button" class="ghost-button" (click)="cancelDelete()">{{ t('cancel') }}</button>
            <button type="button" class="danger-button" (click)="doDeleteTask()">{{ t('delete') }}</button>
          </div>
        </div>
      </div>
    }

    @if (editingTask(); as task) {
      <div class="settings-backdrop" (click)="closeEditDialog()">
        <section class="settings-modal edit-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">Редактирование</p>
            <button type="button" class="icon-btn" (click)="closeEditDialog()" aria-label="Закрыть">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <form class="settings-form" [formGroup]="editForm" (ngSubmit)="saveEditedTask()">
            <label class="field">
              <span class="field-label">{{ t('taskDescription') }}</span>
              <textarea formControlName="title" rows="2"></textarea>
            </label>
            <div class="time-inputs">
              <label class="time-field">
                <span class="field-label">{{ t('hoursLabel') }}</span>
                <input type="text" inputmode="numeric" formControlName="hoursPart" maxlength="3" />
              </label>
              <label class="time-field">
                <span class="field-label">{{ t('minutesLabel') }}</span>
                <input type="text" inputmode="numeric" formControlName="minutesPart" maxlength="3" />
              </label>
            </div>
            <label class="field">
              <span class="field-label">{{ t('link') }}</span>
              <input type="text" formControlName="link" />
            </label>
            <div class="checkbox-field">
              <input type="checkbox" id="edit-in-tracker" formControlName="inTracker" />
              <label for="edit-in-tracker">{{ t('inTracker') }}</label>
            </div>
            <div class="form-actions">
              <button type="submit" class="primary-button">Сохранить</button>
            </div>
          </form>
        </section>
      </div>
    }
  `,
  styleUrl: './app.css',
})
export class App {
  private readonly fb = inject(FormBuilder);
  private readonly taskStore = inject(TaskStore);
  private readonly translationService = inject(TranslationService);

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.editingTask()) this.closeEditDialog();
    else if (this.deleteTaskId()) this.cancelDelete();
    else if (this.settingsOpened()) this.toggleSettings();
  }

  // Date state
  private readonly now = signal(new Date());
  private readonly today = computed(() => {
    const d = this.now();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  readonly selectedDate = signal(this.getIsoString(this.today()));
  readonly selectedMonth = signal(this.today());
  readonly isDarkTheme = signal(this.loadTheme() === 'dark');
  readonly settingsOpened = signal(false);
  readonly deleteTaskId = signal<string | null>(null);
  readonly editingTask = signal<TaskEntry | null>(null);

  // Edit form
  editForm = this.fb.nonNullable.group({
    title: [''],
    hoursPart: [''],
    minutesPart: [''],
    link: [''],
    inTracker: [false]
  });

  // Earnings form
  earningsForm = this.fb.nonNullable.group({
    calculationMode: ['income' as 'income' | 'hours'],
    language: ['ru' as SupportedLang],
    currency: ['RUB'],
    hourlyRate: [0, [Validators.required, Validators.pattern(DECIMAL_INPUT_PATTERN)]],
    desiredMonthlyIncome: [0, [Validators.required, Validators.pattern(DECIMAL_INPUT_PATTERN)]],
    hoursPerDay: [8, [Validators.required, Validators.pattern(/^\d+(\.\d+)?$/)]],
    includeWeekends: [false]
  });

  get controls() {
    return this.earningsForm.controls;
  }

  // Form values as signals
  private readonly formValue = toSignal(this.earningsForm.valueChanges, {
    initialValue: this.earningsForm.getRawValue()
  });

  // Computed signals
  readonly calculationMode = computed(() => {
    this.formValue();
    return this.controls.calculationMode.value as 'income' | 'hours';
  });

  readonly selectedDayTasks = computed(() =>
    this.taskStore.tasksByDate(this.selectedDate())()
  );

  readonly calendarWeeks = computed(() => this.buildCalendarWeeks(this.selectedMonth()));

  readonly weekdayLabels = computed(() => {
    const lang = this.translationService.currentLang();
    if (lang === 'en') return WEEKDAY_LABELS_EN;
    if (lang === 'zh') return WEEKDAY_LABELS_ZH;
    return WEEKDAY_LABELS_RU;
  });

  readonly selectedMonthLabel = computed(() => {
    const month = this.selectedMonth();
    const lang = this.translationService.currentLang();
    const monthName = month.toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  });

  readonly selectedDayLabel = computed(() => {
    const date = new Date(this.selectedDate());
    const lang = this.translationService.currentLang();
    return date.toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU', { weekday: 'long', month: 'short', day: 'numeric' });
  });

  readonly remainingDaysInMonth = computed(() => {
    this.formValue();
    const month = this.selectedMonth();
    const today = this.today();
    const isCurrentMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
    if (!isCurrentMonth) return 0;
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let count = 0;
    for (let d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (this.controls.includeWeekends.value || (d.getDay() !== 0 && d.getDay() !== 6)) {
        count++;
      }
    }
    return count;
  });

  readonly workingDaysInMonth = computed(() => {
    this.formValue();
    const month = this.selectedMonth();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let count = 0;
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (this.controls.includeWeekends.value || (d.getDay() !== 0 && d.getDay() !== 6)) {
        count++;
      }
    }
    return count;
  });

  readonly summary = computed(() => {
    this.formValue();
    const tasks = this.taskStore.tasks();
    const month = this.selectedMonth();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthTasks = tasks.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const hoursWorked = monthTasks.reduce((sum, t) => sum + t.hours, 0);
    const hourlyRate = parseFloat(String(this.controls.hourlyRate.value).replace(',', '.')) || 0;
    const desiredIncome = parseFloat(String(this.controls.desiredMonthlyIncome.value).replace(',', '.')) || 0;
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;

    let amountEarned = 0;
    let totalHoursNeeded: number | null = null;

    if (this.calculationMode() === 'income') {
      amountEarned = Math.round(hoursWorked * hourlyRate);
      totalHoursNeeded = desiredIncome > 0 ? desiredIncome / hourlyRate : null;
    } else {
      totalHoursNeeded = this.workingDaysInMonth() * hoursPerDay;
    }

    const progress = totalHoursNeeded ? Math.min(Math.round((hoursWorked / totalHoursNeeded) * 100), 100) : 0;

    return {
      hoursWorked,
      amountEarned,
      desiredMonthlyIncome: desiredIncome,
      totalHoursNeeded,
      progress
    };
  });

  constructor() {
    effect(() => {
      this.formValue();
      const lang = this.controls.language.value;
      this.translationService.setLanguage(lang as SupportedLang);
    });

    effect(() => {
      const isDark = this.isDarkTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-color-scheme', isDark ? 'dark' : 'light');
      }
      this.saveTheme(isDark ? 'dark' : 'light');
    });

    effect(() => {
      this.formValue();
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(STORAGE_KEYS.EARNINGS_FORM, JSON.stringify(this.earningsForm.getRawValue()));
      } catch {
        // ignore
      }
    });

    this.loadEarningsForm();
  }

  // Public methods
  t(key: keyof typeof TRANSLATIONS['ru']): string {
    return this.translationService.t(key);
  }

  setLanguage(lang: SupportedLang) {
    this.controls.language.setValue(lang);
  }

  selectDate(iso: string) {
    this.selectedDate.set(iso);
  }

  selectToday() {
    this.selectedDate.set(this.getIsoString(this.today()));
    this.selectedMonth.set(this.today());
  }

  goToPreviousMonth() {
    const current = this.selectedMonth();
    this.selectedMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  goToNextMonth() {
    const current = this.selectedMonth();
    this.selectedMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  toggleTheme() {
    this.isDarkTheme.update((v) => !v);
  }

  toggleSettings() {
    this.settingsOpened.update((v) => !v);
  }

  shareMonthResults() {
    const tasks = this.taskStore.tasks();
    const month = this.selectedMonth();
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthTasks = tasks.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const summary = this.summary();
    const monthLabel = this.selectedMonthLabel();

    let text = `${monthLabel}\n`;
    text += `Заработано: ${summary.amountEarned}₽, отработано: ${this.formatHoursAndMinutes(summary.hoursWorked)}\n\n`;

    const groupedByDate = monthTasks.reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {} as Record<string, TaskEntry[]>);

    const sortedDates = Object.keys(groupedByDate).sort();
    for (const date of sortedDates) {
      const d = new Date(date);
      const dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      text += `${dayLabel}\n`;
      for (const task of groupedByDate[date]) {
        const prefix = task.inTracker ? '+' : '-';
        const h = Math.floor(task.hours);
        const m = Math.round((task.hours - h) * 60);
        const timeStr = m > 0 ? `${h} h ${m} m` : `${h} h`;
        text += `${prefix} ${timeStr} ${task.title}\n`;
      }
      text += '\n';
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert('Скопировано в буфер обмена!');
    }).catch(() => {
      alert(text);
    });
  }

  shareDayResults() {
    const tasks = this.selectedDayTasks();
    if (!tasks.length) return;

    const dayLabel = this.selectedDayLabel();
    let text = `${dayLabel}\n`;

    for (const task of tasks) {
      const prefix = task.inTracker ? '+' : '-';
      const h = Math.floor(task.hours);
      const m = Math.round((task.hours - h) * 60);
      const timeStr = m > 0 ? `${h} h ${m} m` : `${h} h`;
      text += `${prefix} ${timeStr} ${task.title}\n`;
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert('Скопировано в буфер обмена!');
    }).catch(() => {
      alert(text);
    });
  }

  onTaskCreated(task: TaskEntry) {
    this.taskStore.add(task);
  }

  confirmDeleteTask(id: string) {
    this.deleteTaskId.set(id);
  }

  cancelDelete() {
    this.deleteTaskId.set(null);
  }

  doDeleteTask() {
    const id = this.deleteTaskId();
    if (id) {
      this.taskStore.remove(id);
      this.deleteTaskId.set(null);
    }
  }

  updateTask(event: { id: string; patch: Partial<TaskEntry> }) {
    this.taskStore.update(event.id, event.patch);
  }

  openEditDialog(task: TaskEntry) {
    const h = Math.floor(task.hours);
    const m = Math.round((task.hours - h) * 60);
    this.editForm.patchValue({
      title: task.title,
      hoursPart: h.toString(),
      minutesPart: m.toString(),
      link: task.link || '',
      inTracker: task.inTracker
    });
    this.editingTask.set(task);
  }

  closeEditDialog() {
    this.editingTask.set(null);
  }

  saveEditedTask() {
    const task = this.editingTask();
    if (!task) return;
    const value = this.editForm.getRawValue();
    const hours = parseInt(value.hoursPart || '0', 10);
    const minutes = parseInt(value.minutesPart || '0', 10);
    const totalHours = hours + minutes / 60;
    this.taskStore.update(task.id, {
      title: value.title,
      hours: totalHours,
      link: value.link || undefined,
      inTracker: value.inTracker
    });
    this.editingTask.set(null);
  }

  formatHoursAndMinutes(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} ${this.t('hours')}`;
    return `${h} ${this.t('hours')} ${m} ${this.t('minutes')}`;
  }

  formatDayWord(days: number): string {
    if (days % 10 === 1 && days % 100 !== 11) return `день`;
    if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return `дня`;
    return `дней`;
  }

  shouldShowDayIndicator(iso: string): boolean {
    this.formValue();
    const totalHours = this.taskStore.totalHoursByDate(iso);
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;
    return totalHours >= hoursPerDay;
  }

  isDayGoalMet(iso: string): boolean {
    this.formValue();
    const totalHours = this.taskStore.totalHoursByDate(iso);
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;
    return totalHours >= hoursPerDay;
  }

  getDayTooltip(iso: string): string {
    const totalHours = this.taskStore.totalHoursByDate(iso);
    return `${this.formatHoursAndMinutes(totalHours)}`;
  }

  // Private helper methods
  private buildCalendarWeeks(month: Date): CalendarDay[][] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks: CalendarDay[][] = [];
    let current = new Date(startDate);

    while (current <= lastDay) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = this.getIsoString(current);
        const inCurrentMonth = current.getMonth() === month.getMonth();
        const totalHours = inCurrentMonth ? this.taskStore.totalHoursByDate(iso) : 0;

        week.push({
          iso,
          label: current.getDate(),
          inCurrentMonth,
          isToday: this.getIsoString(current) === this.getIsoString(this.today()),
          totalHours
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    return weeks;
  }

  private getIsoString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadTheme(): 'light' | 'dark' {
    if (typeof localStorage === 'undefined') return 'light';
    try {
      return (localStorage.getItem('gph_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  }

  private saveTheme(theme: 'light' | 'dark') {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('gph_theme', theme);
    } catch {
      // ignore
    }
  }

  private loadEarningsForm() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EARNINGS_FORM);
      if (saved) {
        const data = JSON.parse(saved);
        this.earningsForm.patchValue(data);
      }
    } catch {
      // ignore
    }
  }


}
