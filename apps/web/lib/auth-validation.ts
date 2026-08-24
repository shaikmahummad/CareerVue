export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_NAME_LENGTH = 100;

export type SignupValues = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((label) => !/^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u.test(label))) return false;
  return (labels.at(-1)?.length ?? 0) >= 2;
}

export function normalizeIndianPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\+?[0-9 -]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/[ +\-]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9][0-9]{9}$/.test(digits) ? `+91${digits}` : null;
}

export function validateSignup(values: SignupValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = normalizeName(values.fullName);
  if (!name) errors.fullName = "Full name is required.";
  else if (name.length > MAX_NAME_LENGTH) errors.fullName = `Full name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  else if (!/^[\p{L} .'’-]+$/u.test(name) || !/\p{L}/u.test(name)) errors.fullName = "Use letters, spaces, hyphens, apostrophes, or periods for your name.";
  if (!isValidEmail(values.email)) errors.email = "Enter a valid email address, such as user@gmail.com.";
  if (values.phone.trim() && !normalizeIndianPhone(values.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (values.password.length > MAX_PASSWORD_LENGTH) errors.password = `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  else if (!values.password.trim()) errors.password = "Password cannot contain only whitespace.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}
