import { derived, writable } from "svelte/store";

export type Lang = "en" | "fr";

const dict = {
  en: {
    // nav
    nav_overview: "Overview", nav_portfolio: "Portfolio", nav_performance: "Performance",
    nav_stocks: "Stocks", nav_tax: "Tax", nav_settings: "Settings",
    // topbar
    prices_sample: "Sample data", prices_lasttx: "Prices: last transaction",
    prices_manual: "Prices: manual", refresh: "Refresh", theme: "Theme", import: "Import",
    // hero + kpis
    hero_label: "Portfolio value", all_time: "all time",
    kpi_contrib: "Contributions", kpi_contrib_sub: "your money in",
    kpi_saveback: "Saveback received", kpi_saveback_sub: "“free”, reinvested",
    kpi_cost: "Total cost", kpi_cost_sub: "buys + saveback",
    kpi_fees: "Fees", kpi_fees_sub: "on your orders",
    kpi_perf: "Market perf",
    kpi_savebackworth: "Saveback worth", kpi_savebackworth_sub: "value of the “free” shares",
    // cards
    c_value: "Value over time", c_value_sub: "Portfolio value vs invested cost — the gap is your unrealised gain.",
    c_alloc: "Allocation", c_movers: "Movers", c_movers_sub: "by unrealised gain/loss",
    c_holdings: "Holdings", legend_value: "Value", legend_cost: "Cost",
    holdings_count: "holdings", stock_picking: "Stock picking", realised: "realised",
    // table headers
    th_name: "Name", th_shares: "Shares", th_cost: "Cost", th_value: "Value",
    th_gainloss: "Gain/Loss", total: "Total",
    th_buys: "Buys", th_saveback: "Saveback", th_totalcost: "Total cost", th_price: "Price",
    sec_etfs: "ETFs",
    // performance page
    perf_break: "Performance breakdown", perf_basis: "Basis", perf_measures: "What it measures",
    perf_tr: "Market (TR method)", perf_tr_m: "Return on all invested money",
    perf_sav: "Saveback contribution", perf_sav_m: "Today's value of the “free” shares",
    perf_monthly: "Month by month", th_month: "Month", th_gain: "Gain",
    // tax page
    tax_title: "Tax summary", tax_sub: "Ordinary securities account — flat tax 30% unless you opt for the scale.",
    th_year: "Year", tax_interest: "Cash interest", tax_realised: "Realised gains",
    tax_base: "Taxable base", tax_estimate: "Est. tax 30%", tax_contrib: "Contributions",
    tax_note1: "Cash interest is taxable in the year received.",
    tax_note2: "Accumulating ETFs are taxed only on a sale (realised gain).",
    tax_note3: "Indicative estimate — not tax advice.",
    // stocks page
    st_title: "Stock picking", st_sub: "Single stocks — weighted-average cost, realised & unrealised P/L.",
    th_company: "Company", th_avgcost: "Avg cost", th_unrealised: "Unrealised", th_realised: "Realised",
    st_empty: "No single-stock trades in this export.",
    // portfolio page
    pf_sub: "Everything you hold, by value.",
    // empty state
    e_title: "Your portfolio, privately.",
    e_sub: "Your Trade Republic CSV is read entirely in your browser — it never leaves your device.",
    e_drop: "Drop your Trade Republic CSV, or click to browse",
    e_local: "Processed locally · nothing uploaded", e_try: "Try with sample data →",
    mock_note: "Data stays in your browser. Prices default to the last transaction price until you refresh.",
  },
  fr: {
    nav_overview: "Vue d'ensemble", nav_portfolio: "Portefeuille", nav_performance: "Performance",
    nav_stocks: "Actions", nav_tax: "Fiscalité", nav_settings: "Réglages",
    prices_sample: "Données d'exemple", prices_lasttx: "Cours : dernière transaction",
    prices_manual: "Cours : manuels", refresh: "Actualiser", theme: "Thème", import: "Importer",
    hero_label: "Valeur du portefeuille", all_time: "depuis le début",
    kpi_contrib: "Versements", kpi_contrib_sub: "ton argent investi",
    kpi_saveback: "Saveback reçu", kpi_saveback_sub: "« offert », réinvesti",
    kpi_cost: "Coût total", kpi_cost_sub: "achats + saveback",
    kpi_fees: "Frais", kpi_fees_sub: "sur tes ordres",
    kpi_perf: "Perf marché",
    kpi_savebackworth: "Valeur du saveback", kpi_savebackworth_sub: "valeur des parts « offertes »",
    c_value: "Valeur dans le temps", c_value_sub: "Valeur du portefeuille vs coût investi — l'écart est ta plus-value latente.",
    c_alloc: "Répartition", c_movers: "Mouvements", c_movers_sub: "par plus/moins-value latente",
    c_holdings: "Positions", legend_value: "Valeur", legend_cost: "Coût",
    holdings_count: "positions", stock_picking: "Stock picking", realised: "réalisée",
    th_name: "Nom", th_shares: "Parts", th_cost: "Coût", th_value: "Valeur",
    th_gainloss: "+/- value", total: "Total",
    th_buys: "Achats", th_saveback: "Saveback", th_totalcost: "Coût total", th_price: "Cours",
    sec_etfs: "ETF",
    perf_break: "Décomposition de la performance", perf_basis: "Base", perf_measures: "Ce que ça mesure",
    perf_tr: "Marché (méthode TR)", perf_tr_m: "Rendement de tout l'argent investi",
    perf_sav: "Apport du saveback", perf_sav_m: "Valeur actuelle des parts « offertes »",
    perf_monthly: "Mois par mois", th_month: "Mois", th_gain: "+/- value",
    tax_title: "Récapitulatif fiscal", tax_sub: "Compte-titres ordinaire — PFU 30 % sauf option barème.",
    th_year: "Année", tax_interest: "Intérêts espèces", tax_realised: "Plus-values réalisées",
    tax_base: "Base imposable", tax_estimate: "Est. prélèvement 30 %", tax_contrib: "Versements",
    tax_note1: "Les intérêts espèces sont imposables l'année de perception.",
    tax_note2: "Les ETF capitalisants ne sont imposés qu'à la revente (plus-value réalisée).",
    tax_note3: "Estimation indicative — pas un conseil fiscal.",
    st_title: "Stock picking", st_sub: "Actions individuelles — prix moyen pondéré, +/- values réalisées & latentes.",
    th_company: "Société", th_avgcost: "PMP", th_unrealised: "Latente", th_realised: "Réalisée",
    st_empty: "Aucune opération sur action individuelle dans cet export.",
    pf_sub: "Tout ce que tu détiens, par valeur.",
    e_title: "Ton portefeuille, en privé.",
    e_sub: "Ton CSV Trade Republic est lu entièrement dans ton navigateur — il ne quitte jamais ton appareil.",
    e_drop: "Dépose ton CSV Trade Republic, ou clique pour parcourir",
    e_local: "Traité en local · rien n'est envoyé", e_try: "Essayer avec des données d'exemple →",
    mock_note: "Tes données restent dans le navigateur. Les cours affichés sont ceux de la dernière transaction jusqu'à actualisation.",
  },
} as const;

export type Key = keyof (typeof dict)["en"];

function initialLang(): Lang {
  if (typeof localStorage !== "undefined") {
    const v = localStorage.getItem("lang");
    if (v === "fr" || v === "en") return v;
  }
  return "en";
}

export const lang = writable<Lang>(initialLang());

export function setLang(l: Lang): void {
  lang.set(l);
  if (typeof localStorage !== "undefined") localStorage.setItem("lang", l);
}

/** Reactive translator: `$t('key')`. */
export const t = derived(lang, ($l) => (key: Key): string => dict[$l][key] ?? key);
