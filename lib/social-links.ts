export type SocialLink = {
  platform: string;
  url: string;
};

export const SOCIAL_PLATFORMS = [
  'Instagram', 'Facebook', 'TikTok', 'YouTube', 'X', 'Threads',
  'LinkedIn', 'Pinterest', 'Twitch', 'Discord', 'Reddit',
  'Snapchat', 'GitHub', 'Strava', 'Site web', 'Autre',
];

const SOCIAL_PREFIXES: Record<string, string> = {
  Instagram: 'https://instagram.com/',
  Facebook: 'https://facebook.com/',
  TikTok: 'https://tiktok.com/@',
  YouTube: 'https://youtube.com/@',
  X: 'https://x.com/',
  Threads: 'https://threads.net/@',
  LinkedIn: 'https://linkedin.com/in/',
  Pinterest: 'https://pinterest.com/',
  Twitch: 'https://twitch.tv/',
  Discord: 'https://discord.gg/',
  Reddit: 'https://reddit.com/u/',
  Snapchat: 'https://snapchat.com/add/',
  GitHub: 'https://github.com/',
  Strava: 'https://strava.com/athletes/',
};

export const SOCIAL_ICONS: Record<string, string> = {
  Instagram: 'instagram', Facebook: 'facebook-f', TikTok: 'tiktok',
  YouTube: 'youtube', X: 'x-twitter', Threads: 'threads',
  LinkedIn: 'linkedin-in', Pinterest: 'pinterest-p', Twitch: 'twitch',
  Discord: 'discord', Reddit: 'reddit-alien', Snapchat: 'snapchat',
  GitHub: 'github', Strava: 'strava', 'Site web': 'globe', Autre: 'link',
};

export function socialPlaceholder(platform: string) {
  return (SOCIAL_PREFIXES[platform] || 'https://').replace('https://', '');
}

export function socialAccountValue(value: string, platform: string) {
  const url = value.trim();
  const prefix = SOCIAL_PREFIXES[platform];
  if (!prefix) return url.replace(/^https?:\/\//i, '');
  return url.toLowerCase().startsWith(prefix.toLowerCase())
    ? url.slice(prefix.length)
    : url.replace(/^@/, '');
}

export function normalizeSocialUrl(value: string, platform?: string) {
  const url = value.trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const prefix = platform ? SOCIAL_PREFIXES[platform] : undefined;
  return prefix ? `${prefix}${url.replace(/^@/, '')}` : `https://${url}`;
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
