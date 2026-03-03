/**
 * Password validation utilities for secure account creation and password reset
 */

export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  errors: string[];
  suggestions: string[];
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let strengthScore = 0;

  // Length checks
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  } else {
    strengthScore += 1;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be no more than ${PASSWORD_MAX_LENGTH} characters`);
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  } else {
    suggestions.push('Add uppercase letters (A-Z)');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    strengthScore += 1;
  } else {
    suggestions.push('Add lowercase letters (a-z)');
  }

  // Number check
  if (/\d/.test(password)) {
    strengthScore += 1;
  } else {
    suggestions.push('Add numbers (0-9)');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    strengthScore += 1;
  } else {
    suggestions.push('Add special characters (!@#$%^&* etc)');
  }

  // Common patterns to avoid
  const commonPatterns = [
    /^123456/,
    /^password/i,
    /^admin/i,
    /^qwerty/i,
    /^12345678/,
  ];

  if (commonPatterns.some((pattern) => pattern.test(password))) {
    errors.push('Password uses a common pattern. Please choose a more unique password');
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeating characters');
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (strengthScore >= 4) {
    strength = 'strong';
  } else if (strengthScore >= 3) {
    strength = 'good';
  } else if (strengthScore >= 2) {
    strength = 'fair';
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors,
    suggestions,
  };
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'strong':
      return 'text-green-600 dark:text-green-400';
    case 'good':
      return 'text-blue-600 dark:text-blue-400';
    case 'fair':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'weak':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
}

export function getPasswordStrengthBg(strength: string): string {
  switch (strength) {
    case 'strong':
      return 'bg-green-100 dark:bg-green-950/30';
    case 'good':
      return 'bg-blue-100 dark:bg-blue-950/30';
    case 'fair':
      return 'bg-yellow-100 dark:bg-yellow-950/30';
    case 'weak':
      return 'bg-red-100 dark:bg-red-950/30';
    default:
      return 'bg-muted';
  }
}
