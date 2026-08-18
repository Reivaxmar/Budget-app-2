// Vitest setup file
// You can add custom matchers or global setup here if needed

// Initializes i18next once for the whole test run, same as main.tsx does
// for the real app — without this, components render raw translation
// keys ("customers.title") instead of the English text tests assert on.
import '../i18n'
