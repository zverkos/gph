import { Injectable, signal, computed } from '@angular/core';
import { LaborCostEntry, getTotalHours } from './models/labor-cost.model';
import { TaskEntry } from './models/task.model'; // для обратной совместимости

const TASKS_STORAGE_KEY = 'gph_tasks';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _laborCosts = signal<LaborCostEntry[]>(this.loadFromStorage());

  readonly tasks = this._laborCosts.asReadonly(); // для обратной совместимости

  // Новые методы для labor costs
  laborCostsByDate(dateKey: string) {
    return computed(() => this._laborCosts().filter((l) => l.date === dateKey));
  }

  // Старые методы для обратной совместимости
  tasksByDate(dateKey: string) {
    return this.laborCostsByDate(dateKey);
  }

  totalHoursByDate(dateKey: string): number {
    return this._laborCosts()
      .filter((l) => l.date === dateKey)
      .reduce((sum, l) => sum + getTotalHours(l), 0);
  }

  // Новые методы для labor costs
  addLaborCost(laborCost: LaborCostEntry) {
    this._laborCosts.update((list) => [...list, laborCost]);
    this.saveToStorage();
  }

  updateLaborCost(id: string, patch: Partial<LaborCostEntry>) {
    this._laborCosts.update((list) =>
      list.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
    this.saveToStorage();
  }

  removeLaborCost(id: string) {
    this._laborCosts.update((list) => list.filter((l) => l.id !== id));
    this.saveToStorage();
  }

  // Старые методы для обратной совместимости
  add(task: TaskEntry) {
    this.addLaborCost(task);
  }

  update(id: string, patch: Partial<TaskEntry>) {
    this.updateLaborCost(id, patch);
  }

  remove(id: string) {
    this.removeLaborCost(id);
  }

  private loadFromStorage(): LaborCostEntry[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LaborCostEntry[]) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage() {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(this._laborCosts()));
    } catch {
      // ignore
    }
  }
}
