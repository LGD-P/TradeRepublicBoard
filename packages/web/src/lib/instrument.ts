/**
 * Presentation helpers for instrument metadata — kept out of the shared model so
 * the Python↔TS parity fixtures stay untouched.
 *
 * The ETF issuer is NOT encoded in the ISIN (its country code is the domicile,
 * e.g. IE / LU / FR), so we parse it from the Trade Republic instrument name,
 * which almost always leads with the brand. Fully offline, no lookup.
 */
const ISSUERS: [RegExp, string][] = [
  [/\bishares\b/i, "iShares · BlackRock"],
  [/\bamundi\b/i, "Amundi"],
  [/\bvanguard\b/i, "Vanguard"],
  [/\bxtrackers\b/i, "Xtrackers · DWS"],
  [/\bspdr\b/i, "SPDR · State Street"],
  [/\blyxor\b/i, "Lyxor · Amundi"],
  [/\binvesco\b/i, "Invesco"],
  [/\bvaneck\b/i, "VanEck"],
  [/\bwisdomtree\b/i, "WisdomTree"],
  [/\bhsbc\b/i, "HSBC"],
  [/\bfidelity\b/i, "Fidelity"],
  [/\bubs\b/i, "UBS"],
  [/\bbnp\s*paribas\b/i, "BNP Paribas"],
  [/\bdeka\b/i, "Deka"],
  [/\bfranklin\b/i, "Franklin Templeton"],
  [/\b(jpmorgan|jpm)\b/i, "JPMorgan"],
  [/\b(l&g|legal\s*&\s*general)\b/i, "L&G"],
  [/\bglobal\s*x\b/i, "Global X"],
];

/** Issuer parsed from the instrument name, or null if unknown. */
export function providerOf(name: string): string | null {
  for (const [re, label] of ISSUERS) if (re.test(name)) return label;
  return null;
}

/**
 * justETF profile page for an ETF, keyed by ISIN. This is an external *link*
 * (user-initiated navigation), not a fetch — so it is unaffected by the CSP's
 * `connect-src`. Only the public ISIN is ever exposed, never your holdings.
 */
export function justetfUrl(isin: string): string {
  return `https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`;
}
