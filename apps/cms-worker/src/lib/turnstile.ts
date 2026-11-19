// Kunci rahasia uji resmi Cloudflare yang SELALU lolos (dipakai di dev & test).
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const ALWAYS_PASS_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function verifyTurnstile(secret: string, token: string | null, ip: string | null): Promise<boolean> {
  if (!secret) return false;
  if (secret === ALWAYS_PASS_TEST_SECRET) return true;
  if (!token || token.length > 2048) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
