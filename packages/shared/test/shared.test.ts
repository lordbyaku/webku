import { describe, expect, it } from "vitest";
import {
  addOneYear, checkSlug, escapeHtml, generateTempPassword, hashPassword, hostingState, html, jsonForScript,
  multiline, newId, suggestSlug, verifyPassword, DAY_MS,
} from "../src";

describe("html", () => {
  it("escape interpolasi, bukan fragmen html", () => {
    const inner = html`<b>${"<i>"}</b>`;
    expect(html`<p>${"<x>"}${inner}</p>`.value).toBe("<p>&lt;x&gt;<b>&lt;i&gt;</b></p>");
    expect(escapeHtml(`"'\`&`)).toBe("&quot;&#39;&#96;&amp;");
    expect(html`${null}${undefined}${false}${0}`.value).toBe("0");
    expect(multiline("a<b\nc").value).toBe("a&lt;b<br>c");
    expect(jsonForScript({ a: "</script>" }).value).not.toContain("<");
  });
});

describe("password", () => {
  it("hash & verifikasi", async () => {
    const h = await hashPassword("rahasia-123", 10_000);
    expect(await verifyPassword("rahasia-123", h)).toBe(true);
    expect(await verifyPassword("rahasia-124", h)).toBe(false);
    const h2 = await hashPassword("rahasia-123", 10_000);
    expect(h2.salt).not.toBe(h.salt);
  });
  it("membatasi iterasi ke 100.000", async () => {
    expect((await hashPassword("x", 500_000)).iter).toBe(100_000);
  });
  it("password sementara mudah dibaca", () => {
    expect(generateTempPassword()).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
  });
});

describe("slug & id", () => {
  it("validasi slug", () => {
    expect(checkSlug("warung-bu-sri").ok).toBe(true);
    for (const bad of ["ab", "-abc", "abc-", "ABC", "a_b", "www", "cms", "a--b", "x".repeat(41)]) {
      expect(checkSlug(bad).ok, bad).toBe(false);
    }
    expect(suggestSlug("Warung Bu Sri (Malang)")).toBe("warung-bu-sri-malang");
  });
  it("id unik dengan prefix", () => {
    const id = newId("m");
    expect(id).toMatch(/^m_[A-Za-z0-9_-]{21}$/);
    expect(newId("m")).not.toBe(id);
  });
});

describe("waktu hosting", () => {
  it("tambah satu tahun", () => {
    expect(new Date(addOneYear(Date.UTC(2026, 10, 18))).toISOString()).toBe("2027-11-18T00:00:00.000Z");
    expect(new Date(addOneYear(Date.UTC(2028, 1, 29))).toISOString()).toBe("2029-02-28T00:00:00.000Z");
  });
  it("status hosting", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(hostingState(null, now)).toBe("none");
    expect(hostingState(now + 60 * DAY_MS, now)).toBe("ok");
    expect(hostingState(now + 20 * DAY_MS, now)).toBe("expiring_30");
    expect(hostingState(now + 3 * DAY_MS, now)).toBe("expiring_7");
    expect(hostingState(now - 1, now)).toBe("expired");
  });
});
