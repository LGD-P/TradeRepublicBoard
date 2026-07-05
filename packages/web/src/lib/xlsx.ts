/**
 * Dependency-free .xlsx writer that reproduces the styling of the Python tool's
 * workbook (tr_board.py): navy banners, KPI cards, gold/light fills, €/%/shares
 * number formats, green/red P/L, and line/bar/pie charts — all hand-built OOXML
 * packed into a STORE zip. No SheetJS, no zip lib, no network: keeps the CVE
 * surface at zero and the export fully in-browser.
 */
import type { View } from "@tr/core";

// ---- palette (ARGB) -------------------------------------------------------
const NAVY = "FF1F3A5F", BLUE = "FF2E5E8C", LIGHT = "FFEAF1F8", YELLOW = "FFFFF2CC";
const GOLD = "FFC9A227", WHITE = "FFFFFFFF", GREEN = "FF1B7F3B", RED = "FFC0392B";
const BLACK = "FF000000", GREY1 = "FF888888", GREY2 = "FF666666", GREY3 = "FF333333";

// ---- number formats (identical to tr_board.py) ----------------------------
const F_EUR = '#,##0.00" €";[RED]\\-#,##0.00" €"';
const F_EURPL = '#,##0.00" €";\\-#,##0.00" €"';
const F_PCTPL = "0.0%;\\-0.0%";
const F_PRICE = '#,##0.0000" €"';
const F_SHARES = "0.000000";

interface FontSpec { sz: number; bold?: boolean; italic?: boolean; color: string }
interface AlignSpec { h?: string; v?: string; wrap?: boolean }
// font shorthands mirroring the Python F_* constants
const fTitle = (sz: number): FontSpec => ({ sz, bold: true, color: NAVY });
const F_SECTION: FontSpec = { sz: 11, bold: true, color: WHITE };
const F_HDR: FontSpec = { sz: 10, bold: true, color: WHITE };
const F_HDR9: FontSpec = { sz: 9, bold: true, color: WHITE };
const F_LABEL: FontSpec = { sz: 10, bold: true, color: NAVY };
const F_CALC: FontSpec = { sz: 10, color: BLACK };
const F_TOTAL: FontSpec = { sz: 10, bold: true, color: NAVY };
const F_KPI: FontSpec = { sz: 13, bold: true, color: NAVY };
const F_NOTE: FontSpec = { sz: 9, color: GREY2 };
const F_SUB: FontSpec = { sz: 9, italic: true, color: GREY1 };
const F_TXT: FontSpec = { sz: 10, color: GREY3 };
const F_GOLD: FontSpec = { sz: 10, bold: true, color: WHITE };
const A_C: AlignSpec = { h: "center", v: "center", wrap: true };
const A_CV: AlignSpec = { h: "center", v: "center" };
const A_L: AlignSpec = { h: "left", v: "center" };
const A_LW: AlignSpec = { h: "left", v: "center", wrap: true };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function colLetter(c: number): string { let s = "", n = c; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
const ref = (r: number, c: number) => colLetter(c) + r;

// ---- style registry -> styles.xml -----------------------------------------
class Styles {
  private fonts: string[] = [];
  private fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  private borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"];
  private fmts: { id: number; code: string }[] = [];
  private fmtByCode = new Map<string, number>();
  private xfs: string[] = [];
  private xfKey = new Map<string, number>();
  private nextFmt = 164;
  constructor() { this.xf({ font: F_CALC }); } // reserve index 0 = default

  private font(f: FontSpec): number {
    const xml = `<font>${f.bold ? "<b/>" : ""}${f.italic ? "<i/>" : ""}<sz val="${f.sz}"/><color rgb="${f.color}"/><name val="Calibri"/></font>`;
    let i = this.fonts.indexOf(xml); if (i < 0) { i = this.fonts.length; this.fonts.push(xml); } return i;
  }
  private fill(hex?: string): number {
    if (!hex) return 0;
    const xml = `<fill><patternFill patternType="solid"><fgColor rgb="${hex}"/></patternFill></fill>`;
    let i = this.fills.indexOf(xml); if (i < 0) { i = this.fills.length; this.fills.push(xml); } return i;
  }
  private border(on?: boolean): number {
    if (!on) return 0;
    const xml = '<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>';
    let i = this.borders.indexOf(xml); if (i < 0) { i = this.borders.length; this.borders.push(xml); } return i;
  }
  private fmt(code?: string): number {
    if (!code) return 0;
    let id = this.fmtByCode.get(code);
    if (id == null) { id = this.nextFmt++; this.fmtByCode.set(code, id); this.fmts.push({ id, code }); }
    return id;
  }
  xf(o: { font: FontSpec; fill?: string; fmt?: string; align?: AlignSpec; border?: boolean }): number {
    const fi = this.font(o.font), fl = this.fill(o.fill), bi = this.border(o.border), nf = this.fmt(o.fmt);
    const a = o.align;
    const al = a ? `<alignment${a.h ? ` horizontal="${a.h}"` : ""}${a.v ? ` vertical="${a.v}"` : ""}${a.wrap ? ' wrapText="1"' : ""}/>` : "";
    const key = `${fi}|${fl}|${bi}|${nf}|${al}`;
    let idx = this.xfKey.get(key);
    if (idx == null) {
      const attrs = `numFmtId="${nf}" fontId="${fi}" fillId="${fl}" borderId="${bi}" xfId="0"`
        + (nf ? ' applyNumberFormat="1"' : "") + (fl ? ' applyFill="1"' : "") + (bi ? ' applyBorder="1"' : "")
        + (fi ? ' applyFont="1"' : "") + (al ? ' applyAlignment="1"' : "");
      idx = this.xfs.length;
      this.xfs.push(al ? `<xf ${attrs}>${al}</xf>` : `<xf ${attrs}/>`);
      this.xfKey.set(key, idx);
    }
    return idx;
  }
  xml(): string {
    const numFmts = this.fmts.length
      ? `<numFmts count="${this.fmts.length}">${this.fmts.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${esc(f.code)}"/>`).join("")}</numFmts>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
      + numFmts
      + `<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>`
      + `<fills count="${this.fills.length}">${this.fills.join("")}</fills>`
      + `<borders count="${this.borders.length}">${this.borders.join("")}</borders>`
      + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
      + `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>`
      + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

// ---- chart specs ----------------------------------------------------------
interface Anchor { c1: number; r1: number; c2: number; r2: number } // 0-based
interface Ser { name: string; vals: number[]; valRef: string; color?: string }
interface ChartSpec {
  kind: "line" | "bar" | "pie";
  title: string;
  cats: string[];
  catRef: string;
  series: Ser[];
  anchor: Anchor;
}

// ---- one worksheet --------------------------------------------------------
class Sheet {
  cells: { r: number; c: number; v: string | number; t: "s" | "n"; s: number }[] = [];
  merges: string[] = [];
  colW = new Map<number, number>();
  rowH = new Map<number, number>();
  freeze: { ySplit: number; topLeft: string } | null = null;
  charts: ChartSpec[] = [];
  name: string;
  constructor(name: string) { this.name = name; }
  put(r: number, c: number, v: string | number | null | undefined, s: number) {
    if (v == null || v === "") return;
    this.cells.push({ r, c, v, t: typeof v === "number" ? "n" : "s", s });
  }
  merge(r1: number, c1: number, r2: number, c2: number) { this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`); }
  width(c: number, w: number) { this.colW.set(c, w); }
  xml(drawingRid: number | null): string {
    const view = `<sheetViews><sheetView showGridLines="0" workbookViewId="0">`
      + (this.freeze ? `<pane ySplit="${this.freeze.ySplit}" topLeftCell="${this.freeze.topLeft}" activePane="bottomLeft" state="frozen"/>` : "")
      + `</sheetView></sheetViews>`;
    const cols = this.colW.size
      ? `<cols>${[...this.colW.entries()].sort((a, b) => a[0] - b[0]).map(([c, w]) => `<col min="${c}" max="${c}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    const byRow = new Map<number, typeof this.cells>();
    for (const cell of this.cells) { const a = byRow.get(cell.r) ?? []; a.push(cell); byRow.set(cell.r, a); }
    const rows = [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([r, cs]) => {
      const cells = cs.sort((a, b) => a.c - b.c).map((c) => {
        const rr = ref(r, c.c);
        return c.t === "n"
          ? `<c r="${rr}" s="${c.s}"><v>${c.v}</v></c>`
          : `<c r="${rr}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(c.v))}</t></is></c>`;
      }).join("");
      return `<row r="${r}">${cells}</row>`;
    }).join("");
    const merges = this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
    const drawing = drawingRid != null ? `<drawing r:id="rId${drawingRid}"/>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`
      + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + view + cols + `<sheetData>${rows}</sheetData>` + merges + drawing + `</worksheet>`;
  }
}

// ---- chart XML ------------------------------------------------------------
const CNS = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
function numCache(vals: number[]): string {
  return `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${vals.length}"/>`
    + vals.map((v, i) => `<c:pt idx="${i}"><c:v>${Math.round(v * 1e6) / 1e6}</c:v></c:pt>`).join("") + `</c:numCache>`;
}
function strCache(vals: string[]): string {
  return `<c:strCache><c:ptCount val="${vals.length}"/>`
    + vals.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join("") + `</c:strCache>`;
}
function catXml(spec: ChartSpec): string {
  return `<c:cat><c:strRef><c:f>${esc(spec.catRef)}</c:f>${strCache(spec.cats)}</c:strRef></c:cat>`;
}
function serXml(spec: ChartSpec, s: Ser, idx: number, line: boolean): string {
  const spPr = s.color
    ? (line
      ? `<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill></a:ln></c:spPr>`
      : `<c:spPr><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill></c:spPr>`)
    : "";
  return `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>`
    + `<c:tx><c:v>${esc(s.name)}</c:v></c:tx>`
    + spPr
    + (line ? `<c:marker><c:symbol val="none"/></c:marker>` : "")
    + catXml(spec)
    + `<c:val><c:numRef><c:f>${esc(s.valRef)}</c:f>${numCache(s.vals)}</c:numRef></c:val>`
    + (line ? `<c:smooth val="0"/>` : "")
    + `</c:ser>`;
}
function chartXml(spec: ChartSpec): string {
  const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${esc(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;
  let plot: string, legend = "";
  if (spec.kind === "pie") {
    const s0 = spec.series[0];
    // Pie series mirror openpyxl exactly: no <c:tx>, an <spPr> stroke, cat + val.
    const ser = `<c:ser><c:idx val="0"/><c:order val="0"/>`
      + `<c:spPr><a:ln><a:prstDash val="solid"/></a:ln></c:spPr>`
      + catXml(spec)
      + `<c:val><c:numRef><c:f>${esc(s0.valRef)}</c:f>${numCache(s0.vals)}</c:numRef></c:val></c:ser>`;
    plot = `<c:pieChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/></c:pieChart>`;
    legend = `<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>`;
  } else {
    const line = spec.kind === "line";
    const sers = spec.series.map((s, i) => serXml(spec, s, i, line)).join("");
    const axes = `<c:axId val="111111111"/><c:axId val="222222222"/>`;
    const body = line
      ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${sers}<c:marker val="1"/>${axes}</c:lineChart>`
      : `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${sers}<c:gapWidth val="150"/>${axes}</c:barChart>`;
    plot = body
      + `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`
      + `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`;
    legend = `<c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace ${CNS}><c:chart>${title}<c:plotArea><c:layout/>${plot}</c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}
function drawingXml(specs: ChartSpec[]): string {
  const anchors = specs.map((sp, i) => {
    const a = sp.anchor;
    return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
      + `<xdr:to><xdr:col>${a.c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
      + `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`
      + `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>`
      + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic>`
      + `</xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`;
}

// ---- STORE zip ------------------------------------------------------------
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new Uint8Array(30 + name.length); const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true); dv.setUint32(22, size, true); dv.setUint16(26, name.length, true); lh.set(name, 30);
    parts.push(lh, f.data);
    const cd = new Uint8Array(46 + name.length); const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); cd.set(name, 46);
    central.push(cd); offset += lh.length + size;
  }
  let cdSize = 0; for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const all = [...parts, ...central, eocd]; let total = 0; for (const a of all) total += a.length;
  const out = new Uint8Array(total); let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ---- package assembly -----------------------------------------------------
function pack(sheets: Sheet[]): Uint8Array {
  const enc = new TextEncoder();
  const used = new Set<string>();
  const names = sheets.map((s) => { let n = s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sheet"; let b = n, i = 2; while (used.has(n.toLowerCase())) n = `${b.slice(0, 28)} ${i++}`; used.add(n.toLowerCase()); return n; });

  const files: { name: string; data: Uint8Array }[] = [];
  const ctOverrides: string[] = [
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
  ];

  let drawingNo = 0, chartNo = 0;
  sheets.forEach((s, si) => {
    const sheetIdx = si + 1;
    let drawingRid: number | null = null;
    if (s.charts.length) {
      drawingNo++;
      const dNo = drawingNo;
      const chartRels: string[] = [];
      s.charts.forEach((sp) => {
        chartNo++;
        files.push({ name: `xl/charts/chart${chartNo}.xml`, data: enc.encode(chartXml(sp)) });
        ctOverrides.push(`<Override PartName="/xl/charts/chart${chartNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
        chartRels.push(`<Relationship Id="rId${chartRels.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartNo}.xml"/>`);
      });
      files.push({ name: `xl/drawings/drawing${dNo}.xml`, data: enc.encode(drawingXml(s.charts)) });
      files.push({ name: `xl/drawings/_rels/drawing${dNo}.xml.rels`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${chartRels.join("")}</Relationships>`) });
      ctOverrides.push(`<Override PartName="/xl/drawings/drawing${dNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      files.push({ name: `xl/worksheets/_rels/sheet${sheetIdx}.xml.rels`, data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${dNo}.xml"/></Relationships>`) });
      drawingRid = 1;
    }
    ctOverrides.push(`<Override PartName="/xl/worksheets/sheet${sheetIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    files.push({ name: `xl/worksheets/sheet${sheetIdx}.xml`, data: enc.encode(s.xml(drawingRid)) });
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    + ctOverrides.join("") + `</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`
    + names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") + `</sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")
    + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const head = [
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "xl/workbook.xml", data: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(wbRels) },
    { name: "xl/styles.xml", data: enc.encode(STY.xml()) },
  ];
  return zipStore([...head, ...files]);
}

// ---- labels (mirrors tr_board.py S[...]) ----------------------------------
const MONTH_ABBR: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["Janv", "Févr", "Mars", "Avri", "Mai", "Juin", "Juil", "Août", "Sept", "Octo", "Nove", "Déce"],
};
interface Labels {
  sheets: string[]; total: string;
  db_title: string; db_cards: string[]; db_perf: string; db_perf_cols: string[];
  db_perf_tr: string; db_perf_tr_m: string; db_perf_sav: string; db_perf_sav_m: string; db_perf_note: string;
  db_month_section: string; db_mcols: string[]; db_month_note: string;
  db_chart_line: string; db_chart_bar: string; db_chart_pie: string;
  yr_title: string; yr_cols: string[];
  etf_title: string; etf_cols: string[]; etf_value_note: string; etf_global: string;
  etf_chart_gl_bar: string; etf_chart_gl_pie: string;
  tax_title: string; tax_sub: string; tax_cols: string[]; tax_notes: string[];
  sp_title: string; sp_sub: string; sp_summary: string; sp_scols: string[]; sp_empty: string;
  rm_title: string; rm_blocks: [string, string[]][];
}
const LABELS: Record<string, Labels> = {
  en: {
    sheets: ["Read me", "Dashboard", "Yearly", "By ETF", "Tax", "Stock Picking-IPO"], total: "Total",
    db_title: "Dashboard — overview",
    db_cards: ["Contributions\n(buys)", "Saveback\nreceived", "Total cost\n(buys + saveback)", "Fees", "Portfolio\ncurrent value", "Gain/loss (€)", "Gain/loss (%)"],
    db_perf: "Performance", db_perf_cols: ["—", "Basis", "Gain/loss (€)", "Gain/loss (%)", "What it measures"],
    db_perf_tr: "Performance\n(TR method)", db_perf_tr_m: "Return on all invested money",
    db_perf_sav: "Saveback contribution", db_perf_sav_m: "Today's value of offered shares (+ their perf)",
    db_perf_note: '"Performance" = your market gain (like TR). "Saveback contribution" = today\'s value of offered shares.',
    db_month_section: "Monthly detail — portfolio value over time",
    db_mcols: ["Month", "Buys (€)", "Saveback (€)", "Cost of month (€)", "Cumulative cost (€)", "Portfolio value (€)", "Unrealised gain/loss (€)", "Unrealised gain/loss (%)"],
    db_month_note: "Portfolio value = your shares priced at each month's transactions; last point = current price. Indicative (prices at transaction dates).",
    db_chart_line: "Invested cost vs portfolio value", db_chart_bar: "Unrealised gain/loss over time (€)", db_chart_pie: "Split (current value)",
    yr_title: "Yearly summary — contributions and performance",
    yr_cols: ["Year", "Buys (€)", "Saveback (€)", "Fees (€)", "Total cost (€)", "Current value (€)", "Gain/loss (€)", "Gain/loss (%)"],
    etf_title: "Summary by ETF / stock",
    etf_cols: ["Name / ETF", "Cumulative shares", "Buys (€)", "Saveback (€)", "Total cost (€)", "Current price (€)", "Current value (€)", "Gain/loss (€)", "Gain/loss (%)"],
    etf_value_note: '"Current value" = cumulative shares × current price. Gains are green, losses red.',
    etf_global: "Global view — all ETFs", etf_chart_gl_bar: "Gain/loss by ETF (global)", etf_chart_gl_pie: "Value split (global)",
    tax_title: "Tax — summary for your filing",
    tax_sub: "Ordinary securities account — flat tax 30% unless you opt for the progressive scale.",
    tax_cols: ["Year", "Cash interest\nreceived (€)", "Realised\ngains (€)", "Taxable base\n(€)", "Estimated\ntax 30% (€)", "Contributions\nof the year (€)"],
    tax_notes: [
      "Cash interest: taxable in the year received (investment income).",
      "Accumulating ETFs (Acc): no dividend paid, taxed only on a sale (realised gain).",
      "Realised gains use the weighted-average cost method. Unrealised gains are not taxable.",
      "Indicative estimate, not tax advice.",
    ],
    sp_title: "Stock Picking & IPO — single stocks",
    sp_sub: "Buys/sells outside ETFs. Cost basis at weighted-average price; realised gain on sells.",
    sp_summary: "Summary by stock",
    sp_scols: ["Company", "Shares held", "Avg cost (€)", "Remaining cost (€)", "Current price (€)", "Current value (€)", "Unrealised g/l (€)", "Unrealised g/l (%)", "Realised g/l (€)"],
    sp_empty: "No stock-picking transaction yet.",
    rm_title: "Investment tracker — Trade Republic",
    rm_blocks: [
      ["How it works", ["This workbook is a snapshot exported from the web dashboard: it reads your Trade Republic CSV entirely in your browser.", "Values are computed on your device — no account, no network."]],
      ["The sheets", ["Dashboard — KPIs, performance and portfolio value over time.", "Yearly — contributions and gains per year.", "By ETF — per-line breakdown with global charts.", "Tax — cash interest and realised gains per year.", "Stock Picking-IPO — single stocks, weighted-average cost, realised & unrealised P/L."]],
      ["Prices", ["Current prices come from the last transaction, or from what you typed in the web app's Settings. Gains are green, losses red."]],
    ],
  },
  fr: {
    sheets: ["Read me", "Dashboard", "Yearly", "By ETF", "Tax", "Stock Picking-IPO"], total: "Total",
    db_title: "Dashboard — synthèse globale",
    db_cards: ["Versements\n(achats)", "Saveback\nreçu", "Coût total\n(achats + saveback)", "Frais", "Valeur actuelle\nportefeuille", "+/- value (€)", "+/- value (%)"],
    db_perf: "Performance", db_perf_cols: ["—", "Base de calcul", "+/- value (€)", "+/- value (%)", "Ce que ça mesure"],
    db_perf_tr: "Performance\n(méthode TR)", db_perf_tr_m: "Rendement de tout l'argent investi",
    db_perf_sav: "Apport du saveback", db_perf_sav_m: "Valeur actuelle des parts offertes (+ leur perf)",
    db_perf_note: '"Performance" = ta plus-value de marché (comme l\'affiche TR). "Apport du saveback" = ce que valent aujourd\'hui les parts offertes.',
    db_month_section: "Détail mensuel — valeur du portefeuille au fil du temps",
    db_mcols: ["Mois", "Achats (€)", "Saveback (€)", "Coût du mois (€)", "Cumul coût (€)", "Valeur portefeuille (€)", "+/- value latente (€)", "+/- value latente (%)"],
    db_month_note: "Valeur portefeuille = tes parts valorisées au cours de chaque mois (prix des transactions TR) ; dernier point = cours du jour. Vue indicative.",
    db_chart_line: "Coût investi vs valeur du portefeuille", db_chart_bar: "+/- value latente au fil du temps (€)", db_chart_pie: "Répartition (valeur actuelle)",
    yr_title: "Récapitulatif par année — versements et performance",
    yr_cols: ["Année", "Achats (€)", "Saveback (€)", "Frais (€)", "Coût total (€)", "Valeur actuelle (€)", "+/- value (€)", "+/- value (%)"],
    etf_title: "Récapitulatif par ETF / action",
    etf_cols: ["Nom / ETF", "Parts cumulées", "Achats (€)", "Saveback (€)", "Coût total (€)", "Cours du jour (€)", "Valeur actuelle (€)", "+/- value (€)", "+/- value (%)"],
    etf_value_note: '"Valeur actuelle" = parts cumulées × cours du jour. Les +/- values sont en vert (gain) ou rouge (perte).',
    etf_global: "Vue globale — tous les ETF", etf_chart_gl_bar: "+/- value par ETF (global)", etf_chart_gl_pie: "Répartition valeur (global)",
    tax_title: "Fiscalité — récapitulatif pour la déclaration",
    tax_sub: "Compte-titres ordinaire (CTO) — imposition au PFU 30 % (flat tax) sauf option barème.",
    tax_cols: ["Année", "Intérêts espèces\nperçus (€)", "Plus-values\nréalisées (€)", "Base imposable\n(€)", "Estimation\nprélèvement 30 % (€)", "Versements\nde l'année (€)"],
    tax_notes: [
      "Intérêts espèces : imposables l'année de perception (revenus de capitaux mobiliers, case 2TR).",
      "ETF capitalisants (Acc) : aucun dividende distribué, imposition uniquement lors d'une revente (plus-value réalisée).",
      "Plus-values réalisées au prix moyen pondéré. La +/- value latente n'est pas imposable.",
      "Estimation indicative, ce n'est pas un conseil fiscal.",
    ],
    sp_title: "Stock Picking & IPO — actions individuelles",
    sp_sub: "Achats/ventes hors ETF. Prix de revient au prix moyen pondéré ; +/- value réalisée sur les ventes.",
    sp_summary: "Synthèse par titre",
    sp_scols: ["Société", "Qté détenue", "PMP (€)", "Coût restant (€)", "Cours du jour (€)", "Valeur actuelle (€)", "+/- value latente (€)", "+/- value latente (%)", "+/- value réalisée (€)"],
    sp_empty: "Aucune opération de stock picking pour l'instant.",
    rm_title: "Suivi d'investissement — Trade Republic",
    rm_blocks: [
      ["Fonctionnement", ["Ce classeur est un instantané exporté depuis le tableau de bord web : il lit ton CSV Trade Republic entièrement dans ton navigateur.", "Les valeurs sont calculées sur ton appareil — sans compte, sans réseau."]],
      ["Les feuilles", ["Dashboard — KPI, performance et valeur du portefeuille dans le temps.", "Yearly — versements et +/- values par année.", "By ETF — détail par ligne avec graphiques globaux.", "Tax — intérêts espèces et plus-values réalisées par année.", "Stock Picking-IPO — actions individuelles, PMP, +/- values réalisées & latentes."]],
      ["Cours", ["Les cours du jour viennent de la dernière transaction, ou de ce que tu as saisi dans les Réglages du web. Gains en vert, pertes en rouge."]],
    ],
  },
};

// Shared style registry for the current build.
let STY: Styles;

// ---- build the workbook ---------------------------------------------------
export function buildWorkbookFromView(v: View, lang: "en" | "fr"): Uint8Array {
  STY = new Styles();
  const L = LABELS[lang] ?? LABELS.en;
  const abbr = MONTH_ABBR[lang] ?? MONTH_ABBR.en;
  const k = v.kpis;

  // style helpers
  const s = (o: Parameters<Styles["xf"]>[0]) => STY.xf(o);
  const eur = (b?: boolean) => s({ font: b ? F_TOTAL : F_CALC, fmt: F_EUR, align: A_CV, border: true });
  const eurPL = (val: number, b?: boolean) => s({ font: { sz: 10, bold: b, color: val > 0 ? GREEN : val < 0 ? RED : (b ? NAVY : BLACK) }, fmt: F_EURPL, align: A_CV, border: true });
  const pctPL = (val: number, b?: boolean) => s({ font: { sz: 10, bold: b, color: val > 0 ? GREEN : val < 0 ? RED : (b ? NAVY : BLACK) }, fmt: F_PCTPL, align: A_CV, border: true });
  const price = () => s({ font: F_CALC, fmt: F_PRICE, align: A_CV, border: true });
  const sharesFmt = () => s({ font: F_CALC, fmt: F_SHARES, align: A_CV, border: true });
  const hdr = (small = true) => s({ font: small ? F_HDR9 : F_HDR, fill: NAVY, align: A_C, border: true });
  const label = () => s({ font: F_LABEL, fill: LIGHT, align: A_L, border: true });
  const labelC = () => s({ font: F_LABEL, fill: LIGHT, align: A_CV, border: true });
  const total = () => s({ font: F_TOTAL, align: A_CV, border: true });
  const totalL = () => s({ font: F_TOTAL, align: A_L, border: true });
  const section = () => s({ font: F_SECTION, fill: BLUE, align: A_L });
  const note = () => s({ font: F_NOTE, align: A_LW });
  const sub = () => s({ font: F_SUB, align: A_L });

  const sheets: Sheet[] = [];

  // ---- Read me ----
  {
    const sh = new Sheet(L.sheets[0]); sh.width(1, 3); sh.width(2, 112);
    sh.put(2, 2, L.rm_title, s({ font: fTitle(20), align: A_L }));
    let r = 4;
    for (const [title, lines] of L.rm_blocks) {
      sh.put(r++, 2, title, section());
      for (const line of lines) sh.put(r++, 2, line, s({ font: F_TXT, align: A_LW }));
      r++;
    }
    sheets.push(sh);
  }

  // ---- Dashboard ----
  {
    const sh = new Sheet(L.sheets[1]);
    [3, 15, 9, 9, 9, 11, 9, 11, 9, 13, 9, 11, 9, 11, 9].forEach((w, i) => sh.width(i + 1, w));
    sh.put(2, 2, L.db_title, s({ font: fTitle(18), align: A_L })); sh.merge(2, 2, 2, 15);
    // KPI cards (7)
    const kpiVals = [k.contributions, k.savebackReceived, k.totalCost, k.fees, k.currentValue, k.gain, k.gainPct];
    L.db_cards.forEach((title, i) => {
      const c = 2 + i * 2;
      sh.put(4, c, title, hdr()); sh.merge(4, c, 4, c + 1);
      const isPct = i === 6, isPL = i >= 5;
      const st = isPct ? pctPL(kpiVals[i]) : isPL ? eurPL(kpiVals[i]) : s({ font: F_KPI, fill: WHITE, fmt: F_EUR, align: A_C, border: true });
      // KPI cells use bigger font: override for the currency ones
      const stKpi = isPL ? st : s({ font: F_KPI, fill: WHITE, fmt: isPct ? F_PCTPL : F_EUR, align: A_C, border: true });
      sh.put(5, c, kpiVals[i], stKpi); sh.merge(5, c, 5, c + 1);
    });
    // Performance
    sh.put(7, 2, L.db_perf, section()); sh.merge(7, 2, 7, 11);
    L.db_perf_cols.forEach((t, i) => { const c = 2 + i * 2; sh.put(8, c, t, hdr()); sh.merge(8, c, 8, c + 1); });
    const perfRows = [
      { lab: L.db_perf_tr, labFill: GOLD, base: k.totalCost as number | null, ple: k.gain, plp: k.gainPct, m: L.db_perf_tr_m },
      { lab: L.db_perf_sav, labFill: LIGHT, base: null, ple: k.savebackContribution, plp: k.savebackReceived ? (k.savebackContribution - k.savebackReceived) / k.savebackReceived : 0, m: L.db_perf_sav_m },
    ];
    perfRows.forEach((row, i) => {
      const r = 9 + i;
      const labSt = row.labFill === GOLD ? s({ font: F_GOLD, fill: GOLD, align: A_C, border: true }) : s({ font: F_LABEL, fill: LIGHT, align: A_C, border: true });
      sh.put(r, 2, row.lab, labSt); sh.merge(r, 2, r, 3);
      if (row.base != null) sh.put(r, 4, row.base, eur()); else sh.put(r, 4, "—", s({ font: F_CALC, align: A_CV, border: true }));
      sh.merge(r, 4, r, 5);
      sh.put(r, 6, row.ple, eurPL(row.ple)); sh.merge(r, 6, r, 7);
      sh.put(r, 8, row.plp, pctPL(row.plp)); sh.merge(r, 8, r, 9);
      sh.put(r, 10, row.m, s({ font: F_NOTE, align: A_LW, border: true })); sh.merge(r, 10, r, 11);
    });
    sh.put(12, 2, L.db_perf_note, note()); sh.merge(12, 2, 12, 11);
    // Monthly detail
    sh.put(15, 2, L.db_month_section, section()); sh.merge(15, 2, 15, 9);
    L.db_mcols.forEach((t, i) => sh.put(16, 2 + i, t, hdr()));
    const monthAgg = new Map<string, { buys: number; saveback: number }>();
    for (const y of v.years) for (const m of v.byYear[y].monthly) monthAgg.set(`${y}-${m.month}`, { buys: m.buys, saveback: m.saveback });
    const r0 = 17;
    const cats: string[] = [], costs: number[] = [], vals: number[] = [], unreal: number[] = [];
    v.series.forEach((pt, i) => {
      const r = r0 + i;
      const agg = monthAgg.get(`${pt.year}-${pt.month}`) ?? { buys: 0, saveback: 0 };
      const cat = `${abbr[pt.month - 1]} ${pt.year}`;
      const un = pt.value - pt.cost;
      sh.put(r, 2, cat, labelC());
      sh.put(r, 3, agg.buys, eur()); sh.put(r, 4, agg.saveback, eur());
      sh.put(r, 5, agg.buys + agg.saveback, eur()); sh.put(r, 6, pt.cost, eur());
      sh.put(r, 7, pt.value, eur()); sh.put(r, 8, un, eurPL(un));
      sh.put(r, 9, pt.cost ? un / pt.cost : 0, pctPL(pt.cost ? un / pt.cost : 0));
      cats.push(cat); costs.push(pt.cost); vals.push(pt.value); unreal.push(un);
    });
    const rt = r0 + v.series.length;
    sh.put(rt, 2, L.total, total());
    sh.put(rt, 3, v.series.reduce((a, p) => a + (monthAgg.get(`${p.year}-${p.month}`)?.buys ?? 0), 0), eur(true));
    sh.put(rt, 4, v.series.reduce((a, p) => a + (monthAgg.get(`${p.year}-${p.month}`)?.saveback ?? 0), 0), eur(true));
    sh.put(rt, 5, k.totalCost, eur(true));
    sh.put(rt, 6, v.series.length ? v.series[v.series.length - 1].cost : 0, eur(true));
    sh.put(rt, 7, k.currentValue, eur(true));
    sh.put(rt, 8, k.gain, eurPL(k.gain, true));
    sh.put(rt, 9, k.gainPct, pctPL(k.gainPct, true));
    sh.put(rt + 1, 2, L.db_month_note, note()); sh.merge(rt + 1, 2, rt + 1, 9);

    // Charts (0-based anchors). Line + bar below the table; pie to the right.
    const qName = `'${L.sheets[1]}'`;
    if (v.series.length) {
      const chartTop = rt + 2; // 0-based row start below the note
      sh.charts.push({
        kind: "line", title: L.db_chart_line, cats, catRef: `${qName}!$B$${r0}:$B$${rt - 1}`,
        series: [
          { name: L.db_mcols[4], vals: costs, valRef: `${qName}!$F$${r0}:$F$${rt - 1}`, color: "2E5E8C" },
          { name: L.db_mcols[5], vals: vals, valRef: `${qName}!$G$${r0}:$G$${rt - 1}`, color: "C0392B" },
        ],
        anchor: { c1: 1, r1: chartTop, c2: 10, r2: chartTop + 16 },
      });
      sh.charts.push({
        kind: "bar", title: L.db_chart_bar, cats, catRef: `${qName}!$B$${r0}:$B$${rt - 1}`,
        series: [{ name: L.db_mcols[6], vals: unreal, valRef: `${qName}!$H$${r0}:$H$${rt - 1}`, color: "2E5E8C" }],
        anchor: { c1: 1, r1: chartTop + 17, c2: 10, r2: chartTop + 33 },
      });
      const alloc = v.allocation.filter((a) => a.value > 0);
      if (alloc.length) {
        const eName = `'${L.sheets[3]}'`;
        sh.charts.push({
          kind: "pie", title: L.db_chart_pie, cats: alloc.map((a) => a.name), catRef: `${eName}!$A$4:$A$${3 + alloc.length}`,
          series: [{ name: L.db_chart_pie, vals: alloc.map((a) => a.value), valRef: `${eName}!$G$4:$G$${3 + alloc.length}` }],
          anchor: { c1: 11, r1: chartTop, c2: 17, r2: chartTop + 16 },
        });
      }
    }
    sheets.push(sh);
  }

  // ---- Yearly ----
  {
    const sh = new Sheet(L.sheets[2]);
    [10, 14, 14, 12, 14, 15, 14, 12].forEach((w, i) => sh.width(i + 1, w));
    sh.put(1, 1, L.yr_title, s({ font: fTitle(16), align: A_L })); sh.merge(1, 1, 1, 8);
    L.yr_cols.forEach((t, i) => sh.put(3, 1 + i, t, hdr()));
    const taxByYear = new Map(v.tax.map((t) => [Number(t.year), Number(t.contributions ?? 0)]));
    let r = 4; let tBuys = 0, tSav = 0, tCost = 0, tVal = 0;
    for (const y of v.years) {
      const mm = v.byYear[y].monthly;
      const buys = mm.reduce((a, m) => a + m.buys, 0), sav = mm.reduce((a, m) => a + m.saveback, 0);
      const cost = buys + sav;
      const val = v.byYear[y].etfs.reduce((a, e) => a + e.value, 0);
      const gain = val - cost;
      sh.put(r, 1, y, labelC());
      sh.put(r, 2, buys, eur()); sh.put(r, 3, sav, eur()); sh.put(r, 4, 0, eur());
      sh.put(r, 5, cost, eur()); sh.put(r, 6, val, eur());
      sh.put(r, 7, gain, eurPL(gain)); sh.put(r, 8, cost ? gain / cost : 0, pctPL(cost ? gain / cost : 0));
      tBuys += buys; tSav += sav; tCost += cost; tVal += val; r++;
    }
    const tGain = tVal - tCost;
    sh.put(r, 1, L.total, total());
    sh.put(r, 2, tBuys, eur(true)); sh.put(r, 3, tSav, eur(true)); sh.put(r, 4, 0, eur(true));
    sh.put(r, 5, tCost, eur(true)); sh.put(r, 6, tVal, eur(true));
    sh.put(r, 7, tGain, eurPL(tGain, true)); sh.put(r, 8, tCost ? tGain / tCost : 0, pctPL(tCost ? tGain / tCost : 0, true));
    sheets.push(sh);
  }

  // ---- By ETF ----
  {
    const sh = new Sheet(L.sheets[3]);
    [30, 14, 15, 13, 15, 14, 16, 15, 13].forEach((w, i) => sh.width(i + 1, w));
    sh.put(1, 1, L.etf_title, s({ font: fTitle(16), align: A_L })); sh.merge(1, 1, 1, 9);
    L.etf_cols.forEach((t, i) => sh.put(3, 1 + i, t, hdr()));
    let r = 4;
    for (const e of v.etfs) {
      sh.put(r, 1, e.name, label());
      sh.put(r, 2, e.shares, sharesFmt());
      sh.put(r, 3, e.buys, eur()); sh.put(r, 4, e.saveback, eur()); sh.put(r, 5, e.costBasis, eur());
      sh.put(r, 6, e.price, price()); sh.put(r, 7, e.value, eur());
      sh.put(r, 8, e.gain, eurPL(e.gain)); sh.put(r, 9, e.gainPct, pctPL(e.gainPct));
      r++;
    }
    const et = r;
    sh.put(et, 1, L.total, totalL());
    sh.put(et, 2, v.etfs.reduce((a, e) => a + e.shares, 0), s({ font: F_TOTAL, fmt: F_SHARES, align: A_CV, border: true }));
    sh.put(et, 3, k.contributions, eur(true)); sh.put(et, 4, k.savebackReceived, eur(true));
    sh.put(et, 5, k.totalCost, eur(true)); sh.put(et, 7, k.currentValue, eur(true));
    sh.put(et, 8, k.gain, eurPL(k.gain, true)); sh.put(et, 9, k.gainPct, pctPL(k.gainPct, true));
    sh.put(et + 2, 1, L.etf_value_note, note()); sh.merge(et + 2, 1, et + 2, 9);
    // Global charts
    const gt = et + 4;
    sh.put(gt, 1, L.etf_global, section()); sh.merge(gt, 1, gt, 9);
    if (v.etfs.length) {
      const q = `'${L.sheets[3]}'`;
      const names = v.etfs.map((e) => e.name);
      sh.charts.push({
        kind: "bar", title: L.etf_chart_gl_bar, cats: names, catRef: `${q}!$A$4:$A$${3 + v.etfs.length}`,
        series: [{ name: L.etf_cols[7], vals: v.etfs.map((e) => e.gain), valRef: `${q}!$H$4:$H$${3 + v.etfs.length}`, color: "2E5E8C" }],
        anchor: { c1: 0, r1: gt, c2: 6, r2: gt + 15 },
      });
      sh.charts.push({
        kind: "pie", title: L.etf_chart_gl_pie, cats: names, catRef: `${q}!$A$4:$A$${3 + v.etfs.length}`,
        series: [{ name: L.etf_cols[6], vals: v.etfs.map((e) => e.value), valRef: `${q}!$G$4:$G$${3 + v.etfs.length}` }],
        anchor: { c1: 6, r1: gt, c2: 12, r2: gt + 15 },
      });
    }
    sheets.push(sh);
  }

  // ---- Tax ----
  {
    const sh = new Sheet(L.sheets[4]);
    [3, 16, 16, 16, 16, 18, 16].forEach((w, i) => sh.width(i + 1, w));
    sh.put(2, 2, L.tax_title, s({ font: fTitle(18), align: A_L }));
    sh.put(3, 2, L.tax_sub, sub());
    L.tax_cols.forEach((t, i) => sh.put(5, 2 + i, t, hdr(false)));
    let r = 6; let ti = 0, tg = 0, tc = 0;
    for (const row of v.tax) {
      const interest = Number(row.interest ?? 0), realised = Number(row.realised_gain ?? 0);
      const base = interest + realised, est = Math.max(realised, 0) * 0.3 + interest * 0.3, contrib = Number(row.contributions ?? 0);
      sh.put(r, 2, Number(row.year), labelC());
      sh.put(r, 3, interest, eurPL(interest)); sh.put(r, 4, realised, eurPL(realised));
      sh.put(r, 5, base, eurPL(base)); sh.put(r, 6, est, eur()); sh.put(r, 7, contrib, eur());
      ti += interest; tg += realised; tc += contrib; r++;
    }
    const tb = ti + tg;
    sh.put(r, 2, L.total, total());
    sh.put(r, 3, ti, eurPL(ti, true)); sh.put(r, 4, tg, eurPL(tg, true)); sh.put(r, 5, tb, eurPL(tb, true));
    sh.put(r, 6, Math.max(tg, 0) * 0.3 + ti * 0.3, eur(true)); sh.put(r, 7, tc, eur(true));
    r += 2;
    for (const n of L.tax_notes) { sh.put(r, 2, "• " + n, note()); sh.merge(r, 2, r, 7); r++; }
    sheets.push(sh);
  }

  // ---- Stock Picking-IPO ----
  {
    const sh = new Sheet(L.sheets[5]);
    [24, 14, 13, 15, 15, 15, 16, 15, 15].forEach((w, i) => sh.width(i + 1, w));
    sh.put(1, 1, L.sp_title, s({ font: fTitle(16), align: A_L })); sh.merge(1, 1, 1, 9);
    sh.put(2, 1, L.sp_sub, sub());
    sh.put(4, 1, L.sp_summary, section()); sh.merge(4, 1, 4, 9);
    L.sp_scols.forEach((t, i) => sh.put(5, 1 + i, t, hdr()));
    let r = 6;
    if (v.stocks.length) {
      for (const st of v.stocks) {
        sh.put(r, 1, st.name, label());
        sh.put(r, 2, st.shares, sharesFmt()); sh.put(r, 3, st.avgCost, price());
        sh.put(r, 4, st.remainingCost, eur()); sh.put(r, 5, st.price, price()); sh.put(r, 6, st.value, eur());
        sh.put(r, 7, st.unrealised, eurPL(st.unrealised)); sh.put(r, 8, st.unrealisedPct, pctPL(st.unrealisedPct));
        sh.put(r, 9, st.realised, eurPL(st.realised));
        r++;
      }
    } else {
      sh.put(r, 1, L.sp_empty, note());
    }
    sheets.push(sh);
  }

  return pack(sheets);
}

/** Build the styled workbook and trigger a client-side download (no network). */
export function exportXlsx(v: View, lang: "en" | "fr", filename: string): void {
  const bytes = buildWorkbookFromView(v, lang);
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
