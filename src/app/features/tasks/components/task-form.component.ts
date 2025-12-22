import { Component, ChangeDetectionStrategy, input, output, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskEntry } from '../models/task.model';
import { TranslationService } from '../../i18n/translation.service';
import { parseLocalDate } from '../../../utils/date.utils';

@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="task-form" [formGroup]="taskForm" (ngSubmit)="submitTask()">
      <label>
        <span class="field-label">{{ t('date') }}</span>
        <input type="date" formControlName="date" />
      </label>

      <label>
        <span class="field-label">{{ t('taskDescription') }}</span>
        <textarea formControlName="title" placeholder="Например, консультация" rows="3"></textarea>
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
        <input type="checkbox" id="inTracker" formControlName="inTracker" />
        <label for="inTracker">{{ t('inTracker') }}</label>
      </div>

      <button type="submit" class="primary-button" [disabled]="taskForm.invalid">
        {{ t('addTask') }}
      </button>
    </form>
  `
})
export class TaskFormComponent {
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);

  selectedDate = input.required<string>();
  taskCreated = output<TaskEntry>();

  taskForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    title: ['', Validators.required],
    hoursPart: ['', [Validators.pattern(/^\d*$/)]],
    minutesPart: ['', [Validators.pattern(/^\d*$/), Validators.max(59)]],
    link: [''],
    inTracker: [false]
  });

  constructor() {
    effect(() => {
      // Update date field when selectedDate changes
      const currentDate = this.selectedDate();
      this.taskForm.patchValue({ date: currentDate });
      // Reset other fields when date changes
      this.taskForm.patchValue({
        title: '',
        hoursPart: '',
        minutesPart: '',
        link: '',
        inTracker: false
      });
    });
  }

  t(key: string): string {
    return this.translationService.t(key as any);
  }

  submitTask() {
    if (this.taskForm.invalid) return;

    const value = this.taskForm.getRawValue();
    const hours = parseInt(value.hoursPart || '0', 10);
    const minutes = parseInt(value.minutesPart || '0', 10);

    const task: TaskEntry = {
      id: crypto.randomUUID(),
      date: value.date,                    // Дата из формы
      createdAt: new Date().toISOString(), // Время создания
      title: value.title,
      hours,
      minutes,
      link: value.link || undefined,
      inTracker: value.inTracker
    };

    this.taskCreated.emit(task);
    this.taskForm.reset({ date: this.selectedDate() });
  }
}
