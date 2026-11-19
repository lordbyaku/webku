import type { SafeHtml } from "@umkm/shared";
import type { Ctx } from "../parts";

export interface LayoutDef {
  id: string;
  name: string;
  /** dipakai UI untuk miniatur pemilih desain */
  products: "grid" | "menu" | "stack" | "rows" | "services";
  forceSerif?: boolean;
  css: string;
  render(ctx: Ctx): SafeHtml;
}
