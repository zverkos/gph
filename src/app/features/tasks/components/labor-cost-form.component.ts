import { Component, ChangeDetectionStrategy, input, output, inject, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LaborCostEntry } from '../models/labor-cost.model';
import { TranslationService } from '../../i18n/translation.service';
import { parseLocalDate } from '../../../utils/date.utils';

@Component({
  selector: 'app-labor-cost-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="labor-cost-form" [formGroup]="laborCostForm" (ngSubmit)="submitLaborCost()">
      <label>
        <span class="field-label">{{ t('date') }}</span>
        <input type="date" formControlName="date" />
      </label>

      <label>
        <span class="field-label">{{ t('taskDescription') }}</span>
        <textarea formControlName="title" placeholder="Например, консультация, разработка, встреча" rows="3"></textarea>
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

      <button type="submit" class="primary-button" [disabled]="laborCostForm.invalid">
        {{ t('addTask') }}
      </button>
    </form>
  `
})
export class LaborCostFormComponent {
  private fb = inject(FormBuilder);
  private translationService = inject(TranslationService);

  selectedDate = input.required<string>();
  laborCostCreated = output<LaborCostEntry>();

  laborCostForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    title: ['', Validators.required],
    hoursPart: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.max(24)]],
    minutesPart: ['', [Validators.pattern(/^\d*$/), Validators.max(59)]],
    link: [''],
    inTracker: [false]
  });

  constructor() {
    effect(() => {
      const date = this.selectedDate();
      this.laborCostForm.patchValue({ date });
    });
  }

  t(key: any): string {
    return this.translationService.t(key);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  submitLaborCost() {
    if (this.laborCostForm.invalid) return;

    const formValue = this.laborCostForm.getRawValue();
    const hours = parseInt(formValue.hoursPart, 10);
    const minutes = parseInt(formValue.minutesPart || '0', 10);

    const newLaborCost: LaborCostEntry = {
      id: this.generateId(),
      date: formValue.date,
      title: formValue.title.trim(),
      hours,
      minutes,
      link: formValue.link || undefined,
      inTracker: formValue.inTracker,
      createdAt: new Date().toISOString()
    };

    this.laborCostCreated.emit(newLaborCost);
    this.resetForm();
  }

  private resetForm() {
    this.laborCostForm.patchValue({
      title: '',
      hoursPart: '',
      minutesPart: '',
      link: '',
      inTracker: false
    });
    this.laborCostForm.markAsPristine();
  }
}
