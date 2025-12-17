# GPH - Electron Desktop App для macOS

## Установка зависимостей

```bash
npm install
```

## Разработка

### Запуск в режиме разработки
Запускает Angular dev server и Electron одновременно:

```bash
npm run electron:dev
```

Или запускайте отдельно:

```bash
# Терминал 1 - Angular dev server
npm start

# Терминал 2 - Electron
npm run electron
```

## Сборка

### Создание .app для macOS

```bash
npm run electron:build:mac
```

Собранное приложение будет в папке `release/`:
- `GPH-1.0.0.dmg` - установщик
- `GPH-1.0.0-mac.zip` - архив с приложением

### Только сборка Angular

```bash
npm run build
```

## Структура проекта

```
gph/
├── electron-main.js      # Главный процесс Electron
├── electron-preload.js   # Preload скрипт для безопасности
├── src/                  # Angular приложение
├── dist/                 # Собранное Angular приложение
└── release/              # Собранные Electron приложения
```

## Особенности macOS версии

- ✅ Нативный titleBar с traffic lights
- ✅ Минимальный размер окна: 800x600
- ✅ Стандартные горячие клавиши macOS
- ✅ .dmg и .zip форматы для распространения

## Требования

- macOS 10.13 или новее
- Node.js 18+
- npm 10+

## Возможные проблемы

### Если не запускается electron:dev

Убедитесь что порт 3000 свободен:
```bash
lsof -ti:3000 | xargs kill -9
```

### Если нужно изменить порт

В `package.json` измените:
- `"start": "ng serve --port 3000"` на нужный порт
- В `electron-main.js` измените URL на соответствующий

## Создание иконки (опционально)

Для создания .icns иконки:

1. Подготовьте PNG 1024x1024
2. Создайте iconset:
```bash
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```
3. Поместите icon.icns в `src/assets/`
