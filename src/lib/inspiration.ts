/**
 * Inspiration links are stored as a reference only. Miles OS never fetches,
 * downloads, copies or re-uploads content from other sites.
 */
const VIDEO_HOSTS = [
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "vimeo.com",
  "instagram.com",
  "twitch.tv",
  "dailymotion.com",
  "facebook.com",
];

export type UrlCheck =
  | { ok: true; url: string; host: string; isVideoPlatform: boolean }
  | { ok: false; error: string };

export function checkInspirationUrl(raw: string): UrlCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Add a link or switch to a written idea." };
  if (value.length > 2000) return { ok: false, error: "That link is too long." };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "That doesn't look like a web link (it should start with https://)." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only web links (https://) can be saved." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Links with sign-in details can't be saved." };
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const isVideoPlatform = VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  return { ok: true, url: parsed.toString(), host, isVideoPlatform };
}

/** Only the hostname of a link is ever shared with the AI, never the full link. */
export function hostForAi(url: string | null | undefined): string | null {
  if (!url) return null;
  const check = checkInspirationUrl(url);
  return check.ok ? check.host : null;
}