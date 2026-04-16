const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "live.com",
  "msn.com",
  "me.com",
  "aol.com",
  "protonmail.com",
]);

function extractDomainFromUrl(url: string): string | null {
  try {
    const cleaned = url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    const host = cleaned.split("/")[0].split("?")[0].split("#")[0];
    if (!host || !host.includes(".")) return null;
    return host.toLowerCase();
  } catch {
    return null;
  }
}

function extractDomainFromEmail(email: string): string | null {
  const at = email.indexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return null;
  if (GENERIC_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

export interface ClientLogoSource {
  website?: string | null;
  email?: string | null;
}

export function getClientDomain(client: ClientLogoSource): string | null {
  if (client.website) {
    const d = extractDomainFromUrl(client.website);
    if (d) return d;
  }
  if (client.email) {
    const d = extractDomainFromEmail(client.email);
    if (d) return d;
  }
  return null;
}

export function getClientLogoUrl(client: ClientLogoSource): string | null {
  const domain = getClientDomain(client);
  return domain ? `https://logo.clearbit.com/${domain}` : null;
}

export function getClientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
