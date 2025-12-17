# GPH Refactoring - Feature-Based Architecture

## 📋 Обзор

Приложение GPH переведено с монолитной архитектуры на feature-based архитектуру с использованием Angular 21+ signals и standalone компонентов.

## 🏗️ Структура проекта

```
src/app/
├── features/
│   ├── i18n/
│   │   ├── translation.service.ts      # Сервис управления языком и переводами
│   │   ├── translations.ts              # Данные переводов (ru, en, zh)
│   │   └── index.ts                     # Экспорты
│   ├── tasks/
│   │   ├── models/
│   │   │   └── task.model.ts            # Модель TaskEntry
│   │   ├── components/
│   │   │   ├── task-form.component.ts   # Форма добавления задачи
│   │   │   └── task-list.component.ts   # Список задач дня
│   │   ├── task-store.service.ts        # Хранилище и управление задачами
│   │   └── index.ts                     # Экспорты
│   ├── calendar/
│   │   ├── calendar.model.ts            # Типы для календаря
│   │   ├── calendar-builder.service.ts  # Построение сетки календаря
│   │   └── index.ts                     # Экспорты
│   ├── earnings/
│   │   ├── earnings.model.ts            # Типы расчетов зарплаты
│   │   ├── earnings-calculator.service.ts # Калькулятор зарплаты
│   │   └── index.ts                     # Экспорты
│   └── settings/
│       └── (будет реализовано)
├── core/
│   ├── services/
│   │   └── theme.service.ts             # Управление темой (light/dark)
│   ├── utils/
│   │   └── format.utils.ts              # Утилиты форматирования
│   └── index.ts                         # Экспорты
├── ui/
│   └── (компоненты переиспользуемого UI)
├── app.ts                               # Главный компонент-shell
├── app.routes.ts                        # Маршруты приложения
└── app.config.ts                        # Конфигурация приложения
```

## 🎯 Ключевые принципы

### 1. **No Shared Modules**
- ❌ Папка `shared` удалена (это антипаттерн)
- ✅ Компоненты переиспользуются либо в `ui/`, либо через импорты напрямую
- ✅ Каждый feature самодостаточен

### 2. **Feature-Based Organization**
- Каждая фича содержит свою бизнес-логику, модели, компоненты
- Feature может импортировать из `core` и `ui`, но не из других features
- Сервисы feature предоставляют API для управления состоянием

### 3. **Signals-Based State Management**
- Используются `signal()` для состояния
- `computed()` для производных значений
- `effect()` для побочных эффектов
- Никаких BehaviorSubject/Observable при возможности использовать signals

### 4. **Standalone Components**
- Все компоненты `standalone: true`
- Ручные импорты вместо NgModules
- Ясная декларация зависимостей в декораторе

### 5. **OnPush Change Detection**
- Все компоненты используют `changeDetection: ChangeDetectionStrategy.OnPush`
- Сигналы привязаны к `@Component` только где нужно

## 📦 Feature: Tasks

### Файлы
- `task.model.ts` - тип `TaskEntry`
- `task-store.service.ts` - управление состоянием задач
- `task-form.component.ts` - форма создания задачи (принимает дату, эмитит событие создания)
- `task-list.component.ts` - список задач дня

### API
```typescript
// TaskStore
const store = inject(TaskStore);
store.tasks;              // сигнал всех задач
store.tasksByDate(iso);   // computed сигнал задач на дату
store.add(task);          // добавить задачу
store.remove(id);         // удалить задачу
store.update(id, patch);  // обновить задачу
totalHours = store.totalHoursByDate(iso); // часы за день
```

## 🌍 Feature: i18n

### Файлы
- `translations.ts` - словари переводов (ru, en, zh)
- `translation.service.ts` - сервис переводов

### API
```typescript
const i18n = inject(TranslationService);
i18n.currentLang;     // сигнал текущего языка
i18n.setLanguage('en'); // установить язык
i18n.t('key');        // получить перевод ключа
```

## 📅 Feature: Calendar

### Файлы
- `calendar.model.ts` - типы `CalendarDay`, `CalendarWeek`
- `calendar-builder.service.ts` - построение сетки календаря

### API
```typescript
const builder = inject(CalendarBuilderService);
weeks = builder.buildWeeks(month, today, hoursByDate);
```

## 💰 Feature: Earnings

### Файлы
- `earnings.model.ts` - типы `EarningsSummary`, `EarningsSettings`
- `earnings-calculator.service.ts` - расчеты зарплаты и рабочих дней

### API
```typescript
const calc = inject(EarningsCalculatorService);
summary = calc.calculateSummary(tasks, start, end, settings, workingDays);
workingDays = calc.calculateWorkingDays(month, includeWeekends);
```

## 🎨 Core Services

### ThemeService
```typescript
const theme = inject(ThemeService);
theme.isDark;     // сигнал текущей темы
theme.toggleTheme(); // переключить тему
theme.setTheme('dark'); // установить тему
```

### Format Utils
```typescript
formatHoursAndMinutes(2.5, 'ч', 'мин'); // "2 ч 30 мин"
formatDayWord(5);    // "дней"
getIsoString(date);  // "2025-12-15"
```

## 🔄 Миграция из App Component

### Что было в app.ts (монолит)
- 1500+ строк
- Все переводы inline
- Все управление задачами inline
- Все логика календаря inline
- Дублирование кода

### Что есть теперь (modular)
- app.ts: ~400 строк (только компоновка и lifecycle)
- features/tasks: компоненты + store
- features/calendar: model + service
- features/earnings: model + calculator
- features/i18n: service + translations
- core: shared services и utils

## 📝 Примеры использования

### Добавить задачу
```typescript
@Component({
  selector: 'app-my-component',
  template: `
    <app-task-form
      [selectedDate]="date()"
      (taskCreated)="store.add($event)">
    </app-task-form>
  `
})
export class MyComponent {
  store = inject(TaskStore);
  date = signal('2025-12-15');
}
```

### Получить задачи дня
```typescript
export class DayComponent {
  store = inject(TaskStore);
  
  dayTasks = computed(() => 
    this.store.tasksByDate('2025-12-15')()
  );
}
```

### Использовать переводы
```typescript
export class MyComponent {
  i18n = inject(TranslationService);
  
  label = computed(() => 
    this.i18n.t('addTask')
  );
}
```

## 🚀 Следующие шаги

1. ✅ Вынести Tasks feature
2. ✅ Вынести i18n feature
3. ✅ Вынести Calendar model и builder
4. ✅ Вынести Earnings calculator
5. ⏳ Создать Settings feature (отдельный компонент)
6. ⏳ Создать UI компоненты (Button, Modal, etc.)
7. ⏳ Добавить route-based lazy loading
8. ⏳ Миграция на NgRx SignalStore если нужна продвинутая синхронизация

## ⚠️ Важно

- **Никакого shared!** Если нужна переиспользуемая логика → в `core/` или `ui/`
- **Только standalone** - все новые компоненты должны быть `standalone: true`
- **OnPush всегда** - все компоненты должны быть `changeDetection: ChangeDetectionStrategy.OnPush`
- **localStorage проверка** - все операции с storage должны проверять `typeof localStorage !== 'undefined'`
- **Signals везде** - используй signals для состояния, не RxJS

## 📚 Ссылки

- [Angular Signals](https://angular.dev/guide/signals)
- [Standalone Components](https://angular.dev/guide/standalone-components)
- [OnPush Change Detection](https://angular.dev/guide/change-detection-strategy)
