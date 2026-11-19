import { L01 } from "./layouts/l01-sinema";
import { L02 } from "./layouts/l02-editorial";
import { L03 } from "./layouts/l03-katalog";
import { L04 } from "./layouts/l04-menu";
import { L05 } from "./layouts/l05-galeri";
import { L06 } from "./layouts/l06-cerita";
import { L07 } from "./layouts/l07-bio";
import { L08 } from "./layouts/l08-poster";
import { L09 } from "./layouts/l09-layanan";
import { L10 } from "./layouts/l10-butik";
import type { LayoutDef } from "./layouts/types";

export type Layout = LayoutDef;

export const LAYOUTS: Record<string, LayoutDef> = { L01, L02, L03, L04, L05, L06, L07, L08, L09, L10 };
