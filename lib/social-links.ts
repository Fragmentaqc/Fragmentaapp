export type SocialLink = {
  platform: string;
  url: string;
};

export const SOCIAL_PLATFORMS = [
  'Instagram', 'Facebook', 'TikTok', 'YouTube', 'X', 'Threads',
  'LinkedIn', 'Pinterest', 'Twitch', 'Discord', 'Reddit',
  'Snapchat', 'GitHub', 'Strava', 'Site web', 'Autre',
];

export function normalizeSocialUrl(value: string) {
  const url = value.trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SocialLink =>
      typeof item === 'object' && item !== null &&
      typeof (item as SocialLink).platform === 'string' &&
      typeof (item as SocialLink).url === 'string'
  );
}
