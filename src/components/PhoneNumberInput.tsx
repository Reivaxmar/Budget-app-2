import React from 'react';
import { COUNTRY_CALLING_CODES } from '../utils/countryCallingCodes';

const DEFAULT_DIAL_CODE = '+34';

const UNIQUE_DIAL_CODES = Array.from(new Set(COUNTRY_CALLING_CODES.map((c) => c.dialCode)));

/**
 * Splits a stored phone value ("+34 612345678") into its country dial code
 * and the rest of the number. Matches the longest known dial code prefix so
 * e.g. "+52" (Mexico) isn't mistaken for "+5" — falls back to Spain when the
 * value is empty or has no recognizable prefix (the app's home market).
 */
function splitPhoneValue(value: string): { dialCode: string; rest: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { dialCode: DEFAULT_DIAL_CODE, rest: '' };
  }

  const match = UNIQUE_DIAL_CODES.filter((code) => trimmed.startsWith(code)).sort(
    (a, b) => b.length - a.length
  )[0];

  if (match) {
    return { dialCode: match, rest: trimmed.slice(match.length).trim() };
  }
  return { dialCode: DEFAULT_DIAL_CODE, rest: trimmed };
}

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  countryAriaLabel?: string;
  numberAriaLabel?: string;
}

/**
 * A phone number field split into a country-calling-code select (every
 * ITU-assigned "+..." prefix, see utils/countryCallingCodes) and a plain
 * text field for the rest of the number. The two are combined into one
 * plain string ("+34 612345678") for storage — same shape phone fields
 * already used before this component existed.
 */
export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  required,
  countryAriaLabel,
  numberAriaLabel,
}) => {
  const { dialCode, rest } = splitPhoneValue(value);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
      <select
        value={dialCode}
        onChange={(e) => onChange(`${e.target.value} ${rest}`.trim())}
        aria-label={countryAriaLabel}
        style={{ flex: '1 1 10rem', minWidth: '10rem', maxWidth: '14rem' }}
      >
        {COUNTRY_CALLING_CODES.map((country) => (
          <option key={country.iso2} value={country.dialCode}>
            {country.name} ({country.dialCode})
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={rest}
        onChange={(e) => onChange(`${dialCode} ${e.target.value}`.trim())}
        required={required}
        aria-label={numberAriaLabel}
        style={{ flex: '2 1 12rem', minWidth: '12rem' }}
      />
    </div>
  );
};

export default PhoneNumberInput;
