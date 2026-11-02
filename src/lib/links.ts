export function whatsappUrl(phoneE164: string, message?: string): string {
  const base = `https://wa.me/${phoneE164}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telUrl(phoneE164: string): string {
  return `tel:+${phoneE164}`;
}
