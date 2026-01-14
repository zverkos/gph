import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import localeRu from '@angular/common/locales/ru';

import { TaskEntry, getTotalHours } from './features/tasks/models/task.model';
import { TaskStore } from './features/tasks/task-store.service';
import { TaskFormComponent } from './features/tasks/components/task-form.component';
import { TaskListComponent } from './features/tasks/components/task-list.component';
import { TranslationService } from './features/i18n/translation.service';
import { SupportedLang, TRANSLATIONS } from './features/i18n/translations';
import { parseLocalDate, toDateKey } from './utils/date.utils';

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
const WEEKDAY_LABELS_RU_SUN: ReadonlyArray<string> = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAY_LABELS_EN_SUN: ReadonlyArray<string> = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_ZH_SUN: ReadonlyArray<string> = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const DECIMAL_INPUT_PATTERN = /^$|^\d+(?:,\d+)?$/;
type EarningsControlName = 'hourlyRate' | 'hoursWorked' | 'hoursPerDay';

const STORAGE_KEYS = {
  EARNINGS_FORM: 'gph_earnings_form'
} as const;

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, TaskFormComponent, TaskListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <aside class="sidebar">
        <header class="sidebar-header">
          <div class="month-nav">
            <button type="button" class="nav-button" (click)="goToPreviousMonth()" aria-label="Предыдущий месяц">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <span class="month-label">{{ selectedMonthLabel() }}</span>
            <button type="button" class="nav-button" (click)="goToNextMonth()" aria-label="Следующий месяц">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          <div class="sidebar-actions">
            <button type="button" class="icon-btn" (click)="shareMonthResults()" title="Скопировать результаты">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="1.5"/></svg>
            </button>
          </div>
        </header>

        <div class="sidebar-content">
          <div class="calendar-grid">
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


          <div class="stat-grid">
            @if (isSettingsIncomplete()) {
              <div class="settings-warning" (click)="openSettings()">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <div class="settings-warning-content">
                  <span>{{ t('settingsWarning') }}</span>
                  <button type="button" class="warning-btn">{{ t('openSettings') }}</button>
                </div>
              </div>
            }
          <article class="stat-card accent">
            <p class="stat-card-label">{{ t('earned') }}</p>
            <p class="stat-card-value">
              {{ summary().amountEarned | currency:selectedCurrency():currencyDisplay():currencyDigits():currencyLocale() }}
              <span class="stat-card-sub">{{ t('of') }} {{ summary().maxPossibleIncome | currency:selectedCurrency():currencyDisplay():currencyDigits():currencyLocale() }}</span>
            </p>
            <div class="progress">
              <div class="progress-fill" [style.width.%]="summary().progress"></div>
            </div>
          </article>
          <article class="stat-card">
            <p class="stat-card-label">{{ t('worked') }}</p>
            <p class="stat-card-value">
              {{ formatHoursAndMinutes(summary().hoursWorked) }}
              <span class="stat-card-sub">{{ t('of') }} {{ formatHoursAndMinutes(summary().totalHoursNeeded) }}</span>
            </p>
          </article>
          @if (remainingDaysInMonth() > 0) {
            <article class="stat-card">
              <p class="stat-card-label">{{ t('remaining') }}</p>
              <p class="stat-card-value">{{ remainingDaysInMonth() }} <span class="stat-card-sub">{{ t('of') }} {{ workingDaysInMonth() }} {{ t('days') }}</span></p>
            </article>
          }

          @if (remainingDaysInMonth() > 0) {
            <article class="stat-card">
              <p class="stat-card-label">{{ t('possible') }}</p>
              <p class="stat-card-value">
                {{ possibleRemainingPotential() | currency:selectedCurrency():currencyDisplay():currencyDigits():currencyLocale() }}
                <span class="stat-card-sub">
                  {{ t('for') }} {{ remainingDaysInMonth() }}
                  {{ currentLang() === 'ru' ? formatDayWord(remainingDaysInMonth()) : t('days') }}
                </span>
              </p>
            </article>
          }
          </div>
        </div>
      </aside>

      <main class="content">
        <section class="list-panel">
          <header class="list-header">
            <p class="eyebrow">{{ showMonthTasks() ? 'Задачи' : t('dayDetails') }}: {{ tasksListLabel() }}</p>
            <div class="header-actions">
              <button type="button" class="icon-btn" [class.active]="showMonthTasks()" (click)="showMonthTasks.set(!showMonthTasks())" title="Все задачи за месяц">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
                            <button type="button" class="icon-btn" (click)="toggleTheme()" [attr.aria-label]="isDarkTheme() ? 'Светлая тема' : 'Темная тема'">
                @if (isDarkTheme()) {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                }
              </button>
              <button type="button" class="icon-btn" (click)="openSettings()" aria-label="Настройки">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" stroke-width="1.5"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <span class="header-divider"></span>
              <button type="button" class="add-task-btn" (click)="addTaskDialogOpen.set(true)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                {{ t('addTask') }}
              </button>
            </div>
          </header>
          <div class="task-list-scroll">
            <app-task-list
              [tasks]="displayedTasks()"
              [groupByDate]="showMonthTasks()"
              (taskSelected)="openEditDialog($event)"
              (taskDeleted)="confirmDeleteTask($event)"
              (taskUpdated)="updateTask($event)"
              (addTaskClicked)="addTaskDialogOpen.set(true)">
            </app-task-list>
          </div>
        </section>
      </main>
    </div>

    @if (settingsOpened()) {
      <div class="settings-backdrop" role="dialog" aria-modal="true" aria-label="Настройки расчёта" (click)="closeSettings()">
        <section class="settings-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">{{ t('settings') }}</p>
            <button type="button" class="icon-btn" (click)="closeSettings()" aria-label="Закрыть">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <form class="settings-form" [formGroup]="settingsForm">
            <div class="settings-row">
              <div class="field">
                <span class="field-label">{{ t('language') }}</span>
                <div class="mode-toggle">
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.language.value === 'ru'" (click)="settingsControls.language.setValue('ru')">RU</button>
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.language.value === 'en'" (click)="settingsControls.language.setValue('en')">EN</button>
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.language.value === 'zh'" (click)="settingsControls.language.setValue('zh')">中文</button>
                </div>
              </div>
              <div class="field">
                <span class="field-label">{{ t('currency') }}</span>
                <div class="mode-toggle">
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.currency.value === 'RUB'" (click)="settingsControls.currency.setValue('RUB')">₽</button>
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.currency.value === 'USD'" (click)="settingsControls.currency.setValue('USD')">$</button>
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.currency.value === 'EUR'" (click)="settingsControls.currency.setValue('EUR')">€</button>
                  <button type="button" class="mode-button compact" [class.active]="settingsControls.currency.value === 'CNY'" (click)="settingsControls.currency.setValue('CNY')">¥</button>
                </div>
              </div>
            </div>

            <div class="field">
              <span class="field-label">{{ t('hourlyRate') }}</span>
              <input type="text" inputmode="decimal" formControlName="hourlyRate" placeholder="0" />
            </div>

            <div class="field">
              <span class="field-label">{{ t('hoursPerDay') }}</span>
              <input type="text" inputmode="decimal" formControlName="hoursPerDay" placeholder="0" />
            </div>

            <div class="checkbox-field">
              <input type="checkbox" id="include-weekends" formControlName="includeWeekends" />
              <label for="include-weekends">{{ t('includeWeekends') }}</label>
            </div>

            <div class="checkbox-field">
              <input type="checkbox" id="start-from-sunday" formControlName="startFromSunday" />
              <label for="start-from-sunday">{{ t('startFromSunday') }}</label>
            </div>

            <button type="button" class="primary-button" (click)="saveSettings()">{{ t('save') }}</button>
          </form>
        </section>
      </div>
    }

    @if (addTaskDialogOpen()) {
      <div class="settings-backdrop" (click)="addTaskDialogOpen.set(false)">
        <section class="settings-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">{{ t('newTask') }}</p>
            <button type="button" class="icon-btn" (click)="addTaskDialogOpen.set(false)" aria-label="Закрыть">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <app-task-form
            [selectedDate]="selectedDate()"
            (taskCreated)="onTaskCreatedFromDialog($event)">
          </app-task-form>
        </section>
      </div>
    }

    @if (deleteTaskId()) {
      <div class="settings-backdrop" (click)="cancelDelete()">
        <section class="settings-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">{{ t('deleteConfirmTitle') }}</p>
            <button type="button" class="icon-btn" (click)="cancelDelete()" aria-label="Закрыть">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <div class="dialog-actions">
            <button type="button" class="ghost-button" (click)="cancelDelete()">{{ t('cancel') }}</button>
            <button type="button" class="danger-button" (click)="doDeleteTask()">{{ t('delete') }}</button>
          </div>
        </section>
      </div>
    }

    @if (editingTask(); as task) {
      <div class="settings-backdrop" (click)="closeEditDialog()">
        <section class="settings-modal" (click)="$event.stopPropagation()">
          <header class="settings-panel__header">
            <p class="caption">{{ t('editTask') }}</p>
            <button type="button" class="icon-btn" (click)="closeEditDialog()" [attr.aria-label]="t('cancel')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </header>
          <form class="task-form" [formGroup]="editForm" (ngSubmit)="saveEditedTask()">
            <label>
              <span class="field-label">{{ t('date') }}</span>
              <input type="date" formControlName="date" />
            </label>
            <label>
              <span class="field-label">{{ t('taskDescription') }}</span>
              <textarea formControlName="title" rows="3"></textarea>
            </label>

            <div class="time-inputs">
              <label class="time-field">
                <span class="field-label">{{ t('hoursLabel') }}</span>
                <input type="text" inputmode="numeric" placeholder="0" formControlName="hoursPart" maxlength="3" />
              </label>
              <label class="time-field">
                <span class="field-label">{{ t('minutesLabel') }}</span>
                <input type="text" inputmode="numeric" placeholder="0" formControlName="minutesPart" maxlength="2" />
              </label>
            </div>

            <label>
              <span class="field-label">{{ t('link') }}</span>
              <input type="text" formControlName="link" placeholder="https://..." />
            </label>

            <div class="checkbox-field">
              <input type="checkbox" id="edit-in-tracker" formControlName="inTracker" />
              <label for="edit-in-tracker">{{ t('inTracker') }}</label>
            </div>

            <button type="submit" class="primary-button">{{ t('save') }}</button>
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

  readonly currentLang = computed(() => this.translationService.currentLang());

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.addTaskDialogOpen()) this.addTaskDialogOpen.set(false);
    else if (this.editingTask()) this.closeEditDialog();
    else if (this.deleteTaskId()) this.cancelDelete();
    else if (this.settingsOpened()) this.closeSettings();
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
  readonly addTaskDialogOpen = signal(false);
  readonly showMonthTasks = signal(false);

  // Edit form
  editForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    title: [''],
    hoursPart: ['', [Validators.pattern(/^\d*$/)]],
    minutesPart: ['', [Validators.pattern(/^\d*$/), Validators.max(59)]],
    link: [''],
    inTracker: [false]
  });

  // Earnings form (основная форма с сохранёнными значениями)
  earningsForm = this.fb.nonNullable.group({
    language: ['ru' as SupportedLang],
    currency: ['RUB'],
    hourlyRate: ['', [Validators.pattern(DECIMAL_INPUT_PATTERN)]],
    hoursPerDay: ['', [Validators.pattern(/^\d+(\.\d+)?$/)]],
    includeWeekends: [false],
    startFromSunday: [false]
  });

  // Settings form (временная форма для диалога)
  settingsForm = this.fb.nonNullable.group({
    language: ['ru' as SupportedLang],
    currency: ['RUB'],
    hourlyRate: ['', [Validators.pattern(DECIMAL_INPUT_PATTERN)]],
    hoursPerDay: ['', [Validators.pattern(/^\d+(\.\d+)?$/)]],
    includeWeekends: [false],
    startFromSunday: [false]
  });

  get settingsControls() {
    return this.settingsForm.controls;
  }


  get controls() {
    return this.earningsForm.controls;
  }

  // Form values as signals
  private readonly formValue = toSignal(this.earningsForm.valueChanges, {
    initialValue: this.earningsForm.getRawValue()
  });

  // Computed signals

  readonly selectedDayTasks = computed(() =>
    this.taskStore.tasksByDate(this.selectedDate())()
  );

  readonly monthTasks = computed(() => {
    const month = this.selectedMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const tasks: TaskEntry[] = [];
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const iso = this.getIsoString(d);
      tasks.push(...this.taskStore.tasksByDate(iso)());
    }
    return tasks;
  });

  readonly displayedTasks = computed(() =>
    this.showMonthTasks() ? this.monthTasks() : this.selectedDayTasks()
  );

  readonly tasksListLabel = computed(() => {
    if (this.showMonthTasks()) {
      return this.selectedMonthLabel();
    }
    return this.selectedDayLabel();
  });

  readonly calendarWeeks = computed(() => {
    this.formValue(); // Для реактивности на изменение startFromSunday
    return this.buildCalendarWeeks(this.selectedMonth());
  });

  readonly weekdayLabels = computed(() => {
    this.formValue();
    const lang = this.translationService.currentLang();
    const startFromSunday = this.controls.startFromSunday.value;
    if (startFromSunday) {
      if (lang === 'en') return WEEKDAY_LABELS_EN_SUN;
      if (lang === 'zh') return WEEKDAY_LABELS_ZH_SUN;
      return WEEKDAY_LABELS_RU_SUN;
    }
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
    const date = parseLocalDate(this.selectedDate());
    const lang = this.translationService.currentLang();
    return date.toLocaleString(lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU', { weekday: 'long', month: 'short', day: 'numeric' });
  });

  readonly selectedCurrency = computed(() => {
    this.formValue();
    return this.controls.currency.value;
  });

  readonly possibleHourlyRate = computed(() => {
    this.formValue();
    return parseFloat(String(this.controls.hourlyRate.value).replace(',', '.')) || 0;
  });

  readonly possibleHoursPerDay = computed(() => {
    this.formValue();
    return parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;
  });

  readonly currencyDisplay = computed(() => 'symbol-narrow');
  readonly currencyDigits = computed(() => '1.0-0');

  readonly currencyLocale = computed(() => {
    const currency = this.selectedCurrency();
    if (currency === 'CNY') return 'zh-CN';
    if (currency === 'USD') return 'en-US';
    if (currency === 'EUR') return 'de-DE';
    return 'ru-RU';
  });

  readonly possibleRemainingPotential = computed(() => {
    const remainingDays = this.remainingDaysInMonth();
    if (!Number.isFinite(remainingDays) || remainingDays <= 0) return 0;

    const hourlyRate = this.possibleHourlyRate();
    const hoursPerDay = this.possibleHoursPerDay();
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) return 0;
    if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) return 0;

    return Math.round(hourlyRate * hoursPerDay * remainingDays);
  });

  readonly remainingDaysInMonth = computed(() => {
    this.formValue();
    const month = this.selectedMonth();
    const today = this.today();
    const isCurrentMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
    if (!isCurrentMonth) return 0;
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    let count = 0;
    // Включаем сегодняшний день в подсчет
    for (let d = new Date(today); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (this.controls.includeWeekends.value || (d.getDay() !== 0 && d.getDay() !== 6)) {
        count++;
      }
    }
    return count;
  });

  readonly totalDaysInMonth = computed(() => {
    const month = this.selectedMonth();
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return lastDay.getDate();
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

  readonly isSettingsIncomplete = computed(() => {
    this.formValue();
    const hourlyRate = parseFloat(String(this.controls.hourlyRate.value).replace(',', '.')) || 0;
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 0;
    return hourlyRate === 0 || hoursPerDay === 0;
  });

  readonly summary = computed(() => {
    this.formValue();
    const tasks = this.taskStore.tasks();
    const month = this.selectedMonth();
    const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

    const monthTasks = tasks.filter((t) => t.date.startsWith(yearMonth));

    const hoursWorked = monthTasks.reduce((sum, t) => sum + getTotalHours(t), 0);
    const hourlyRate = parseFloat(String(this.controls.hourlyRate.value).replace(',', '.')) || 0;
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;

    const amountEarned = Math.round(hoursWorked * hourlyRate);
    const totalHoursNeeded = this.workingDaysInMonth() * hoursPerDay;
    const maxPossibleIncome = Math.round(hourlyRate * totalHoursNeeded);

    const progress = totalHoursNeeded ? Math.min(Math.round((hoursWorked / totalHoursNeeded) * 100), 100) : 0;

    return {
      hoursWorked,
      amountEarned,
      maxPossibleIncome,
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

    // Electron: open settings on Cmd+,
    if (typeof window !== 'undefined' && (window as any).electron?.onOpenSettings) {
      (window as any).electron.onOpenSettings(() => {
        this.openSettings();
      });
    }
  }

  // Public methods
  t(key: keyof typeof TRANSLATIONS['ru']): string {
    return this.translationService.t(key);
  }

  setLanguage(lang: SupportedLang) {
    this.settingsControls.language.setValue(lang);
  }

  selectDate(iso: string) {
    this.selectedDate.set(iso);
    this.showMonthTasks.set(false);
  }

  selectToday() {
    this.selectedDate.set(this.getIsoString(this.today()));
    this.selectedMonth.set(this.today());
    this.showMonthTasks.set(false);
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

  openSettings() {
    this.settingsForm.patchValue(this.earningsForm.getRawValue());
    this.settingsOpened.set(true);
  }

  closeSettings() {
    this.settingsOpened.set(false);
  }

  saveSettings() {
    this.earningsForm.patchValue(this.settingsForm.getRawValue());
    this.settingsOpened.set(false);
  }

  shareMonthResults() {
    const tasks = this.taskStore.tasks();
    const month = this.selectedMonth();
    const yearMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const lang = this.translationService.currentLang();
    const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU';

    const monthTasks = tasks.filter((t) => t.date.startsWith(yearMonth));

    const summary = this.summary();
    const monthLabel = this.selectedMonthLabel();

    let text = `${monthLabel}\n`;
    text += `${this.t('earned')}: ${summary.amountEarned}${this.getCurrencySymbol()}, ${this.t('worked').toLowerCase()}: ${this.formatHoursAndMinutes(summary.hoursWorked)}\n\n`;

    const groupedByDate = monthTasks.reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {} as Record<string, TaskEntry[]>);

    const sortedDates = Object.keys(groupedByDate).sort();
    for (const dateKey of sortedDates) {
      const d = parseLocalDate(dateKey);
      const dayLabel = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      text += `${dayLabel}\n`;
      for (const task of groupedByDate[dateKey]) {
        const prefix = task.inTracker ? '+' : '-';
        const timeStr = task.minutes > 0 ? `${task.hours} ${this.t('hours')} ${task.minutes} ${this.t('minutes')}` : `${task.hours} ${this.t('hours')}`;
        text += `${prefix} ${timeStr} ${task.title}\n`;
      }
      text += '\n';
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert(this.t('copiedToClipboard'));
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
      const timeStr = task.minutes > 0 ? `${task.hours} ${this.t('hours')} ${task.minutes} ${this.t('minutes')}` : `${task.hours} ${this.t('hours')}`;
      text += `${prefix} ${timeStr} ${task.title}\n`;
    }

    navigator.clipboard.writeText(text.trim()).then(() => {
      alert(this.t('copiedToClipboard'));
    }).catch(() => {
      alert(text);
    });
  }

  onTaskCreated(task: TaskEntry) {
    this.taskStore.add(task);
  }

  onTaskCreatedFromDialog(task: TaskEntry) {
    this.taskStore.add(task);
    this.addTaskDialogOpen.set(false);
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
    this.editForm.patchValue({
      date: task.date,
      title: task.title,
      hoursPart: task.hours.toString(),
      minutesPart: task.minutes.toString(),
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
    this.taskStore.update(task.id, {
      date: value.date,
      title: value.title,
      hours,
      minutes,
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

  getCurrencySymbol(): string {
    const currency = this.selectedCurrency();
    if (currency === 'CNY') return '¥';
    if (currency === 'USD') return '$';
    if (currency === 'EUR') return '€';
    return '₽';
  }

  shouldShowDayIndicator(iso: string): boolean {
    const totalHours = this.taskStore.totalHoursByDate(iso);
    return totalHours > 0;
  }

  isDayGoalMet(iso: string): boolean {
    this.formValue();
    const totalHours = this.taskStore.totalHoursByDate(iso);
    const hoursPerDay = parseFloat(String(this.controls.hoursPerDay.value).replace(',', '.')) || 8;
    return totalHours >= hoursPerDay;
  }

  getDayTooltip(iso: string): string {
    this.formValue();
    const totalHours = this.taskStore.totalHoursByDate(iso);
    const hourlyRate = parseFloat(String(this.controls.hourlyRate.value).replace(',', '.')) || 0;
    const earned = Math.round(totalHours * hourlyRate);

    if (totalHours === 0) return '';

    let tooltip = this.formatHoursAndMinutes(totalHours);
    if (hourlyRate > 0) {
      tooltip += ` • ${earned}${this.getCurrencySymbol()}`;
    }
    return tooltip;
  }

  // Private helper methods
  private buildCalendarWeeks(month: Date): CalendarDay[][] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    const startFromSunday = this.controls.startFromSunday.value;

    // Расчет дня недели в зависимости от настройки
    // getDay() возвращает 0=Вс, 1=Пн, ..., 6=Сб
    let dayOfWeek: number;
    if (startFromSunday) {
      // Неделя начинается с воскресенья, getDay() уже возвращает нужное значение
      dayOfWeek = firstDay.getDay();
    } else {
      // Неделя начинается с понедельника: Пн=0, Вт=1, ..., Вс=6
      dayOfWeek = (firstDay.getDay() + 6) % 7;
    }
    startDate.setDate(startDate.getDate() - dayOfWeek);

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
