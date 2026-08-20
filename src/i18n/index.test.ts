import { describe, it, expect, afterEach } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES, setLanguage } from './index';

describe('i18n language switching', () => {
  afterEach(() => {
    setLanguage('en');
  });

  it('defaults to English', () => {
    expect(i18n.language).toBe('en');
    expect(i18n.t('common.save')).toBe('Save');
  });

  it('switches both the active language and every translated string when changed', () => {
    setLanguage('es');

    expect(i18n.language).toBe('es');
    expect(i18n.t('common.save')).toBe('Guardar');
    expect(i18n.t('rendering.clientSectionTitle')).toBe('Cliente');
  });

  it('persists the choice to localStorage so it survives a reload', () => {
    setLanguage('es');
    expect(localStorage.getItem('budgetapp.language')).toBe('es');
  });

  it('has a full Spanish translation for every supported language', () => {
    expect(SUPPORTED_LANGUAGES).toContain('en');
    expect(SUPPORTED_LANGUAGES).toContain('es');
  });
});
