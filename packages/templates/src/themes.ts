import { fontStack, type FontKey } from "./fonts";

export interface Theme {
  id: string;
  name: string;
  /** warna utama (tombol, aksen) & teks di atasnya */
  p: string;
  onP: string;
  /** warna utama yang aman sebagai teks di atas latar */
  pt: string;
  bg: string;
  sf: string;
  tx: string;
  mu: string;
  ac: string;
  onAc: string;
  line: string;
  tint: string;
  /** huruf judul & isi */
  fd: FontKey;
  fb: FontKey;
  /** ketebalan & jarak huruf judul, huruf kapital */
  dw: number;
  dt: string;
  du?: boolean;
  /** pakai miring (italic) untuk aksen judul */
  it?: boolean;
  r: string;
  dark?: boolean;
}

const t = (x: Omit<Theme, "pt"> & { pt?: string }): Theme => ({ ...x, pt: x.pt ?? x.p });

export const THEMES: Record<string, Theme> = {
  T01: t({ id: "T01", name: "Merah Cabai", bg: "#fbf6f0", sf: "#f3e7dc", tx: "#2a1611", mu: "#74574c", p: "#a3201a", onP: "#fff7f0", ac: "#d99a2b", onAc: "#2a1611", line: "rgba(42,22,17,.12)", tint: "#ecd6c6", fd: "fraunces", fb: "manrope", dw: 600, dt: "-0.02em", it: true, r: "14px" }),
  T02: t({ id: "T02", name: "Espresso", bg: "#17110d", sf: "#211812", tx: "#f2e8dc", mu: "#b6a28c", p: "#c9965b", onP: "#17110d", pt: "#d9a86f", ac: "#e8d5bd", onAc: "#17110d", line: "rgba(242,232,220,.14)", tint: "#2c211a", fd: "dmserif", fb: "manrope", dw: 400, dt: "0em", it: true, r: "4px", dark: true }),
  T03: t({ id: "T03", name: "Daun Sage", bg: "#f4f6f0", sf: "#e8ede1", tx: "#1a2a1f", mu: "#5a6b5e", p: "#2f5d3a", onP: "#f4f6f0", ac: "#c9a227", onAc: "#1a2a1f", line: "rgba(26,42,31,.12)", tint: "#d7e1cf", fd: "bricolage", fb: "manrope", dw: 700, dt: "-0.03em", r: "20px" }),
  T04: t({ id: "T04", name: "Biru Laut", bg: "#f5f9fa", sf: "#e6f0f3", tx: "#0e2a33", mu: "#4d6872", p: "#0b6e82", onP: "#ffffff", ac: "#ff8a5b", onAc: "#2a0f05", line: "rgba(14,42,51,.12)", tint: "#cfe4ea", fd: "outfit", fb: "outfit", dw: 700, dt: "-0.035em", r: "16px" }),
  T05: t({ id: "T05", name: "Blush", bg: "#fdf7f6", sf: "#f8e8e6", tx: "#3a2228", mu: "#85646b", p: "#b23a5b", onP: "#ffffff", ac: "#8a6bd1", onAc: "#ffffff", line: "rgba(58,34,40,.1)", tint: "#f3d6d5", fd: "fraunces", fb: "outfit", dw: 450, dt: "-0.02em", it: true, r: "28px" }),
  T06: t({ id: "T06", name: "Monokrom", bg: "#fafaf8", sf: "#efefec", tx: "#0d0d0d", mu: "#5b5b57", p: "#0d0d0d", onP: "#fafaf8", ac: "#0d0d0d", onAc: "#fafaf8", line: "rgba(13,13,13,.14)", tint: "#e4e4e0", fd: "spacegrotesk", fb: "spacegrotesk", dw: 600, dt: "-0.045em", r: "0px" }),
  T07: t({ id: "T07", name: "Gading Emas", bg: "#f6f1e9", sf: "#ece4d6", tx: "#211c14", mu: "#6f6553", p: "#7d5e27", onP: "#fbf7f0", ac: "#211c14", onAc: "#f6f1e9", line: "rgba(33,28,20,.16)", tint: "#e2d5bd", fd: "cormorant", fb: "manrope", dw: 500, dt: "-0.01em", it: true, r: "0px" }),
  T08: t({ id: "T08", name: "Kuning Ceria", bg: "#fffbea", sf: "#fff0b8", tx: "#24200a", mu: "#6b6230", p: "#ffd23f", onP: "#24200a", pt: "#8a6a00", ac: "#e8455d", onAc: "#ffffff", line: "rgba(36,32,10,.14)", tint: "#ffe680", fd: "bricolage", fb: "outfit", dw: 800, dt: "-0.04em", r: "22px" }),
  T09: t({ id: "T09", name: "Batik Sogan", bg: "#f7efe3", sf: "#ecdcc5", tx: "#2b1a0c", mu: "#6e5641", p: "#6b3d16", onP: "#f7efe3", ac: "#1f3b5c", onAc: "#f7efe3", line: "rgba(43,26,12,.16)", tint: "#dfc7a6", fd: "playfair", fb: "manrope", dw: 600, dt: "-0.01em", it: true, r: "6px" }),
  T10: t({ id: "T10", name: "Lavender", bg: "#f7f5fd", sf: "#ece7fa", tx: "#1e1733", mu: "#625a7a", p: "#5b3fd1", onP: "#ffffff", ac: "#ff7ab6", onAc: "#1e1733", line: "rgba(30,23,51,.12)", tint: "#dcd3f7", fd: "syne", fb: "outfit", dw: 700, dt: "-0.03em", r: "18px" }),
  T11: t({ id: "T11", name: "Senja", bg: "#fff6ee", sf: "#ffe6d1", tx: "#2a1206", mu: "#7a5a47", p: "#c9440f", onP: "#ffffff", ac: "#1c1c1c", onAc: "#fff6ee", line: "rgba(42,18,6,.13)", tint: "#ffd2b0", fd: "anton", fb: "manrope", dw: 400, dt: "0.005em", du: true, r: "10px" }),
  T12: t({ id: "T12", name: "Navy", bg: "#f7f8fb", sf: "#e9edf5", tx: "#0f1a2e", mu: "#55607a", p: "#18306b", onP: "#ffffff", ac: "#d4a72c", onAc: "#0f1a2e", line: "rgba(15,26,46,.12)", tint: "#d3dbea", fd: "jakarta", fb: "jakarta", dw: 750, dt: "-0.035em", r: "12px" }),
};

export function themeVars(th: Theme): string {
  return `:root{--p:${th.p};--on-p:${th.onP};--pt:${th.pt};--bg:${th.bg};--sf:${th.sf};--tx:${th.tx};--mu:${th.mu};--ac:${th.ac};--on-ac:${th.onAc};--line:${th.line};--tint:${th.tint};--fd:${fontStack(th.fd)};--fb:${fontStack(th.fb)};--dw:${th.dw};--dt:${th.dt};--du:${th.du ? "uppercase" : "none"};--r:${th.r};--shadow:${th.dark ? "0 20px 50px -20px rgba(0,0,0,.6)" : "0 18px 40px -22px rgba(30,20,10,.28)"};color-scheme:${th.dark ? "dark" : "light"}}`;
}
