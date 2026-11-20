export function isPlaceholderName(name?: string | null): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return !normalized || normalized === 'alex' || normalized === 'student';
}

export function extractFirstName(fullName?: string | null): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed || isPlaceholderName(trimmed)) return '';
  return trimmed.split(/\s+/)[0] || '';
}

export function resolveUserFirstName(
  profileName?: string | null,
  authDisplayName?: string | null
): string {
  const fromProfile = extractFirstName(profileName);
  if (fromProfile) return fromProfile;
  const fromAuth = extractFirstName(authDisplayName);
  if (fromAuth) return fromAuth;
  return '';
}
