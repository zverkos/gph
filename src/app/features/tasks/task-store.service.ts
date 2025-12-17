import { Injectable, signal, computed } from '@angular/core';
import { TaskEntry, getTotalHours } from './models/task.model';

const TASKS_STORAGE_KEY = 'gph_tasks';

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly _tasks = signal<TaskEntry[]>(this.loadFromStorage());

  readonly tasks = this._tasks.asReadonly();

  tasksByDate(dateKey: string) {
    return computed(() => this._tasks().filter((t) => t.date === dateKey));
  }

  totalHoursByDate(dateKey: string): number {
    return this._tasks()
      .filter((t) => t.date === dateKey)
      .reduce((sum, t) => sum + getTotalHours(t), 0);
  }

  add(task: TaskEntry) {
    this._tasks.update((list) => [...list, task]);
    this.saveToStorage();
  }

  update(id: string, patch: Partial<TaskEntry>) {
    this._tasks.update((list) =>
      list.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
    this.saveToStorage();
  }

  remove(id: string) {
    this._tasks.update((list) => list.filter((t) => t.id !== id));
    this.saveToStorage();
  }

  private loadFromStorage(): TaskEntry[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TaskEntry[]) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage() {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(this._tasks()));
    } catch {
      // ignore
    }
  }
}
