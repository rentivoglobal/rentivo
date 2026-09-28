/**
 * Nigerian Phone Number Validator and Formatter
 * 
 * Validates formats such as:
 * - 0803 123 4567, 08031234567 (11 digits starting with 070, 080, 081, 090, 091)
 * - +2348031234567, 2348031234567 (13 digits starting with 234)
 * - 8031234567 (10 digits starting with 7, 8, or 9)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  cleaned: string;
  formatted: string;
  errorMessage?: string;
}

export function validateNigerianPhone(rawInput: string): PhoneValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      cleaned: '',
      formatted: '',
      errorMessage: 'Phone number is required.'
    };
  }

  // Remove any non-digit characters except leading plus
  const digitsOnly = trimmed.replace(/\D/g, '');

  // Case 1: Standard 11-digit local format (e.g., 08031234567)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    const prefix = digitsOnly.slice(0, 3);
    const validPrefixes = [
      '070', '071', '080', '081', '090', '091'
    ];
    const isPrefixValid = validPrefixes.includes(prefix);
    const formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;

    if (!isPrefixValid) {
      return {
        isValid: false,
        cleaned: digitsOnly,
        formatted,
        errorMessage: 'Invalid Nigerian network prefix. Use 080, 081, 070, 090, or 091.'
      };
    }

    return {
      isValid: true,
      cleaned: digitsOnly,
      formatted
    };
  }

  // Case 2: International format (e.g., 2348031234567 or +2348031234567)
  if (digitsOnly.length === 13 && digitsOnly.startsWith('234')) {
    const local = '0' + digitsOnly.slice(3);
    const prefix = local.slice(0, 3);
    const validPrefixes = ['070', '071', '080', '081', '090', '091'];
    const formatted = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;

    if (!validPrefixes.includes(prefix)) {
      return {
        isValid: false,
        cleaned: local,
        formatted,
        errorMessage: 'Invalid Nigerian network prefix in international format.'
      };
    }

    return {
      isValid: true,
      cleaned: local,
      formatted
    };
  }

  // Case 3: 10-digit without leading 0 (e.g., 8031234567)
  if (digitsOnly.length === 10 && ['7', '8', '9'].includes(digitsOnly[0])) {
    const local = '0' + digitsOnly;
    const formatted = `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
    return {
      isValid: true,
      cleaned: local,
      formatted
    };
  }

  // If too short or wrong length
  if (digitsOnly.length < 11) {
    return {
      isValid: false,
      cleaned: digitsOnly,
      formatted: trimmed,
      errorMessage: `Incomplete phone number (${digitsOnly.length}/11 digits). e.g. 0803 123 4567`
    };
  }

  return {
    isValid: false,
    cleaned: digitsOnly,
    formatted: trimmed,
    errorMessage: 'Please enter a valid 11-digit phone number (e.g. 0803 123 4567).'
  };
}
