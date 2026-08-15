export const REFERRAL_CODE_REGEX = /^[A-Za-z0-9-_]+$/;

export function validateReferralCode(code: string): string | null {
  const trimmed = code.trim();

  if (!trimmed) {
    return null;
  }

  if (!REFERRAL_CODE_REGEX.test(trimmed)) {
    return 'Use only letters, numbers, hyphens, and underscores.';
  }

  return null;
}
