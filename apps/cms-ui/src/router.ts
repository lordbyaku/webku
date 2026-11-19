import { useEffect, useState } from "preact/hooks";

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h.startsWith("/") ? h : "/";
}

export function useRoute(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}

export function go(path: string): void {
  window.location.hash = path;
}

/** Cocokkan pola seperti "/admin/t/:id/edit/:section". */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("?")[0]!.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const p = a[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(b[i]!);
    else if (p !== b[i]) return null;
  }
  return params;
}
