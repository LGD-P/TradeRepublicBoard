/**
 * Tiny, dependency-free .xlsx writer.
 *
 * Builds the minimal OOXML parts by hand and packs them into a STORE (no
 * compression) zip — no SheetJS, no zip library. Keeps the CVE surface at zero
 * and the whole export path fully in-browser (privacy by architecture).
 */
import type { View } from "@tr/core";

import type { Key } from "./i18n";

// ---- cells ----------------------------------------------------------------
// Style ids match the <cellXfs> order in STYLES below.
const ST = { text: 0, head: 1, cur: 2, pct: 3, qty: 4, curBold: 5 } as const;

interface Cell { k: "s" | "n"; v: string | number; s: number }
const S = (v: string, s: number = ST.text): Cell => ({ k: "s", v, s });
const N = (v: number, s: number = ST.text): Cell => ({ k: "n", v: Math.round(v * 1e6) / 1e6, s });
interface Sheet { name: string; rows: Cell[][] }

// ---- xml helpers ----------------------------------------------------------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function colRef(i: number): string {
  let s = "", n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function cellXml(c: Cell, ref: string): string {
  if (c.k === "s") {
    if (c.v === "") return "";
    return `<c r="${ref}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(c.v))}</t></is></c>`;
  }
  return `<c r="${ref}" s="${c.s}"><v>${c.v}</v></c>`;
}

function sheetXml(rows: Cell[][]): string {
  const body = rows
    .map((row, r) => `<row r="${r + 1}">${row.map((c, ci) => cellXml(c, colRef(ci) + (r + 1))).join("")}</row>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="24" width="15" customWidth="1"/></cols>` +
    `<sheetData>${body}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3">
<numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/>
<numFmt numFmtId="165" formatCode="0.0%"/>
<numFmt numFmtId="166" formatCode="#,##0.######"/>
</numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// ---- STORE zip ------------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data), size = f.data.length;
    const lh = new Uint8Array(30 + name.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, size, true); dv.setUint32(22, size, true);
    dv.setUint16(26, name.length, true);
    lh.set(name, 30);
    parts.push(lh, f.data);
    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, size, true); cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
    cd.set(name, 46);
    central.push(cd);
    offset += lh.length + size;
  }
  let cdSize = 0;
  for (const c of central) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  const all = [...parts, ...central, eocd];
  let total = 0;
  for (const a of all) total += a.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}

// ---- workbook assembly ----------------------------------------------------
function sanitizeName(name: string, used: Set<string>): string {
  let n = name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Sheet";
  let base = n, i = 2;
  while (used.has(n.toLowerCase())) { n = `${base.slice(0, 28)} ${i++}`; }
  used.add(n.toLowerCase());
  return n;
}

function buildXlsx(sheets: Sheet[]): Uint8Array {
  const enc = new TextEncoder();
  const used = new Set<string>();
  const names = sheets.map((s) => sanitizeName(s.name, used));
  const nSheet = sheets.length;
  const stylesRid = nSheet + 1;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "xl/workbook.xml", data: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(workbookRels) },
    { name: "xl/styles.xml", data: enc.encode(STYLES) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s.rows)) })),
  ];
  return zipStore(files);
}

// ---- View -> workbook -----------------------------------------------------
export function buildWorkbookFromView(v: View, tr: (k: Key) => string): Uint8Array {
  const k = v.kpis;
  const sheets: Sheet[] = [];

  // Summary
  sheets.push({
    name: tr("xlsx_summary"),
    rows: [
      [S(tr("hero_label"), ST.head)],
      [S(tr("hero_label")), N(k.currentValue, ST.cur)],
      [S(tr("kpi_contrib")), N(k.contributions, ST.cur)],
      [S(tr("kpi_saveback")), N(k.savebackReceived, ST.cur)],
      [S(tr("kpi_cost")), N(k.totalCost, ST.cur)],
      [S(tr("kpi_fees")), N(k.fees, ST.cur)],
      [S(tr("kpi_perf")), N(k.gain, ST.cur)],
      [S(tr("th_gainloss") + " %"), N(k.gainPct, ST.pct)],
      [S(tr("kpi_savebackworth")), N(k.savebackContribution, ST.cur)],
    ],
  });

  // ETFs
  const etfRows: Cell[][] = [[
    S(tr("th_name"), ST.head), S(tr("th_shares"), ST.head), S(tr("th_buys"), ST.head),
    S(tr("th_saveback"), ST.head), S(tr("th_totalcost"), ST.head), S(tr("th_price"), ST.head),
    S(tr("th_value"), ST.head), S(tr("th_gainloss"), ST.head), S("%", ST.head),
  ]];
  for (const e of v.etfs)
    etfRows.push([S(e.name), N(e.shares, ST.qty), N(e.buys, ST.cur), N(e.saveback, ST.cur),
      N(e.costBasis, ST.cur), N(e.price, ST.cur), N(e.value, ST.cur), N(e.gain, ST.cur), N(e.gainPct, ST.pct)]);
  etfRows.push([S(tr("total"), ST.head), S(""), N(k.contributions, ST.curBold), N(k.savebackReceived, ST.curBold),
    N(k.totalCost, ST.curBold), S(""), N(k.currentValue, ST.curBold), N(k.gain, ST.curBold), N(k.gainPct, ST.pct)]);
  sheets.push({ name: tr("sec_etfs"), rows: etfRows });

  // Stocks
  if (v.stocks.length) {
    const rows: Cell[][] = [[
      S(tr("th_company"), ST.head), S(tr("th_shares"), ST.head), S(tr("th_avgcost"), ST.head),
      S(tr("th_price"), ST.head), S(tr("th_value"), ST.head), S(tr("th_unrealised"), ST.head),
      S("%", ST.head), S(tr("th_realised"), ST.head),
    ]];
    for (const s of v.stocks)
      rows.push([S(s.name), N(s.shares, ST.qty), N(s.avgCost, ST.cur), N(s.price, ST.cur),
        N(s.value, ST.cur), N(s.unrealised, ST.cur), N(s.unrealisedPct, ST.pct), N(s.realised, ST.cur)]);
    sheets.push({ name: tr("nav_stocks"), rows });
  }

  // Per-year, per-instrument monthly breakdown (flat, pivot-friendly)
  const byYear: Cell[][] = [[
    S(tr("th_year"), ST.head), S(tr("th_month"), ST.head), S(tr("th_name"), ST.head),
    S(tr("th_buys"), ST.head), S(tr("th_saveback"), ST.head), S(tr("th_cost"), ST.head),
    S(tr("th_valuetoday"), ST.head), S(tr("th_gain"), ST.head), S("%", ST.head),
  ]];
  for (const year of v.years)
    for (const m of v.byYear[year].monthly)
      for (const i of m.instruments)
        byYear.push([N(year), N(m.month), S(i.name), N(i.buys, ST.cur), N(i.saveback, ST.cur),
          N(i.cost, ST.cur), N(i.value, ST.cur), N(i.gain, ST.cur), N(i.gainPct, ST.pct)]);
  if (byYear.length > 1) sheets.push({ name: tr("sec_byyear"), rows: byYear });

  // Tax
  if (v.tax.length) {
    const num = (s: string | null) => (s == null ? 0 : Number(s));
    const rows: Cell[][] = [[
      S(tr("th_year"), ST.head), S(tr("tax_interest"), ST.head), S(tr("tax_realised"), ST.head),
      S(tr("tax_base"), ST.head), S(tr("tax_estimate"), ST.head), S(tr("tax_contrib"), ST.head),
    ]];
    for (const r of v.tax) {
      const interest = num(r.interest), realised = num(r.realised_gain);
      const base = interest + realised, est = Math.max(realised, 0) * 0.3 + interest * 0.3;
      rows.push([N(Number(r.year)), N(interest, ST.cur), N(realised, ST.cur), N(base, ST.cur),
        N(est, ST.cur), N(num(r.contributions), ST.cur)]);
    }
    sheets.push({ name: tr("tax_title"), rows });
  }

  return buildXlsx(sheets);
}

/** Build the workbook and trigger a client-side download (no network). */
export function exportXlsx(v: View, tr: (k: Key) => string, filename: string): void {
  const bytes = buildWorkbookFromView(v, tr);
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
