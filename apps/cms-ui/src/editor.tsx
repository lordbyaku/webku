import { createContext, type ComponentChildren } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Content } from "@umkm/content-schema";
import { api, ApiError, type EditorEndpoints } from "./api";
import { toast } from "./components/ui";

export interface MediaItem {
  id: string;
  url: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface SiteData {
  tenant: {
    id: string;
    slug: string;
    businessName: string;
    templateId: string;
    status: "draft" | "active" | "suspended";
    allowTemplateSwitch: boolean;
    publishedAt: number | null;
    hosting: { until: number | null; state: "none" | "ok" | "expiring_30" | "expiring_7" | "expired" };
  };
  urls: { site: string; hostnames: string[] };
  content: { draft: Content; version: number; hasUnpublishedChanges: boolean };
  limits: { products: number; gallery: number; testimonials: number; mediaFiles: number; mediaBytes: number; mediaUsedBytes: number; publishPerDay: number; publishUsedToday: number };
  contactAdminWa: string | null;
}

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

interface Ctx {
  ep: EditorEndpoints;
  base: string; // prefix rute: "" untuk pemilik, "/admin/t/:id" untuk admin
  isAdmin: boolean;
  data: SiteData;
  content: Content;
  update: (mutate: (draft: Content) => void) => void;
  saveState: SaveState;
  errors: Record<string, string>;
  unpublished: boolean;
  publishing: boolean;
  publish: () => Promise<void>;
  reload: () => Promise<void>;
  media: Map<string, MediaItem>;
  mediaList: MediaItem[];
  refreshMedia: () => Promise<void>;
  addMedia: (m: MediaItem) => void;
  removeMedia: (id: string) => void;
  setTemplate: (id: string) => Promise<void>;
  previewHtml: string | null;
  previewTemplate: string | null;
  setPreviewTemplate: (id: string | null) => void;
}

const EditorCtx = createContext<Ctx | null>(null);

export function useEditor(): Ctx {
  const c = useContext(EditorCtx);
  if (!c) throw new Error("useEditor di luar EditorProvider");
  return c;
}

export function EditorProvider({ ep, base, isAdmin, children, fallback }: { ep: EditorEndpoints; base: string; isAdmin: boolean; children: ComponentChildren; fallback: ComponentChildren }) {
  const [data, setData] = useState<SiteData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unpublished, setUnpublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const contentRef = useRef<Content | null>(null);
  const versionRef = useRef(0);
  const dirty = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const d = await api<SiteData>("GET", ep.site);
      setData(d);
      setContent(d.content.draft);
      contentRef.current = d.content.draft;
      versionRef.current = d.content.version;
      dirty.current = false;
      setUnpublished(d.content.hasUnpublishedChanges);
      setSaveState("idle");
      setErrors({});
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data");
    }
  }, [ep.site]);

  const refreshMedia = useCallback(async () => {
    const all: MediaItem[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 3; i++) {
      const r: { items: MediaItem[]; nextCursor: string | null } = await api("GET", `${ep.media}${cursor ? `?cursor=${cursor}` : ""}`);
      all.push(...r.items);
      cursor = r.nextCursor;
      if (!cursor) break;
    }
    setMediaList(all);
  }, [ep.media]);

  useEffect(() => {
    reload();
    refreshMedia().catch(() => {});
  }, [reload, refreshMedia]);

  const saveNow = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      await inFlight.current;
      if (dirty.current) return saveNow();
      return;
    }
    if (!dirty.current || !contentRef.current) return;
    dirty.current = false;
    setSaveState("saving");
    let failed = false;
    const p = (async () => {
      try {
        const r = await api<{ version: number }>("PUT", ep.content, { version: versionRef.current, content: contentRef.current });
        versionRef.current = r.version;
        setErrors({});
        setUnpublished(true);
        setSaveState(dirty.current ? "saving" : "saved");
      } catch (e) {
        failed = true;
        if (e instanceof ApiError && e.code === "VERSION_CONFLICT") setSaveState("conflict");
        else {
          if (e instanceof ApiError && e.fields) setErrors(e.fields);
          dirty.current = true;
          setSaveState("error");
        }
      }
    })();
    inFlight.current = p;
    await p;
    inFlight.current = null;
    // Gagal → tunggu perubahan berikutnya (tidak mengulang terus). Berhasil tapi ada perubahan baru → simpan lagi.
    if (dirty.current && !failed) return saveNow();
  }, [ep.content]);

  const update = useCallback(
    (mutate: (draft: Content) => void) => {
      if (!contentRef.current) return;
      const next = structuredClone(contentRef.current);
      mutate(next);
      contentRef.current = next;
      setContent(next);
      dirty.current = true;
      setSaveState("saving");
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void saveNow(), 1200);
    },
    [saveNow],
  );

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inFlight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // Pratinjau langsung (desktop): render ulang ±0,9 detik setelah perubahan terakhir.
  useEffect(() => {
    if (!content || !window.matchMedia("(min-width: 1040px)").matches) return;
    const t = window.setTimeout(async () => {
      try {
        const html = await api<string>("POST", ep.preview, { content, templateId: previewTemplate ?? undefined }, { raw: true });
        setPreviewHtml(html);
      } catch {
        /* pratinjau gagal karena isian belum valid: biarkan versi terakhir */
      }
    }, 900);
    return () => clearTimeout(t);
  }, [content, previewTemplate, ep.preview, data?.tenant.templateId]);

  const publish = useCallback(async () => {
    clearTimeout(timer.current);
    await saveNow();
    if (dirty.current) {
      toast("Perbaiki isian yang ditandai merah sebelum menerbitkan.", true);
      return;
    }
    setPublishing(true);
    try {
      await api("POST", ep.publish, { version: versionRef.current });
      setUnpublished(false);
      toast("Situs diterbitkan. Perubahan tampil dalam beberapa menit.");
      const d = await api<SiteData>("GET", ep.site);
      setData(d);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menerbitkan", true);
    } finally {
      setPublishing(false);
    }
  }, [ep.publish, ep.site, saveNow]);

  const setTemplate = useCallback(
    async (id: string) => {
      await api("PUT", ep.template, { templateId: id });
      setData((d) => (d ? { ...d, tenant: { ...d.tenant, templateId: id } } : d));
      setUnpublished(true);
      setPreviewTemplate(null);
    },
    [ep.template],
  );

  const media = useMemo(() => new Map(mediaList.map((m) => [m.id, m])), [mediaList]);

  if (loadError) {
    return (
      <div class="layout">
        <div class="notice danger" role="alert">
          <div>
            <b>Data tidak bisa dimuat</b>
            {loadError}
          </div>
        </div>
        <button class="btn" onClick={() => reload()}>
          Coba lagi
        </button>
      </div>
    );
  }
  if (!data || !content) return <>{fallback}</>;

  const value: Ctx = {
    ep,
    base,
    isAdmin,
    data,
    content,
    update,
    saveState,
    errors,
    unpublished,
    publishing,
    publish,
    reload,
    media,
    mediaList,
    refreshMedia,
    addMedia: (m) => setMediaList((l) => [m, ...l]),
    removeMedia: (id) => setMediaList((l) => l.filter((m) => m.id !== id)),
    setTemplate,
    previewHtml,
    previewTemplate,
    setPreviewTemplate,
  };
  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
}
