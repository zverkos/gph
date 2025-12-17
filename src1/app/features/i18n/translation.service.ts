import { Injectable, signal } from '@angular/core';
import { TRANSLATIONS, SupportedLang, TranslationKey } from './translations';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly _currentLang = signal<SupportedLang>('ru');
  
  readonly currentLang = this._currentLang.asReadonly();
  
  setLanguage(lang: SupportedLang) {
    this._currentLang.set(lang);
  }
  
  t(key: TranslationKey): string {
    return TRANSLATIONS[this._currentLang()][key];
  }
}
