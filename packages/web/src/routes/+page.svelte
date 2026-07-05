<script lang="ts">
  import { onMount } from "svelte";

  import type { EtfRow } from "@tr/core";

  import ValueChart from "$lib/components/ValueChart.svelte";
  import { eur, eurSigned, pct, shares, toneClass } from "$lib/format";
  import { errorMsg, loadCsvText, loadSample, usingSample, view } from "$lib/state";

  let theme = $state("light");
  let dragging = $state(false);
  let range = $state("Max");

  // Our value curve is monthly (mark-to-market at transaction prices), so ranges
  // map to a number of months. True daily 1D/1W needs a historical price series.
  function filterSeries<T>(series: T[], r: string): T[] {
    if (r === "Max") return series;
    const months = r === "1M" ? 1 : r === "6M" ? 6 : 12;
    const n = Math.min(series.length, months + 1);
    return series.slice(series.length - n);
  }

  onMount(() => {
    theme = localStorage.getItem("theme") ?? "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (!$view) loadSample();
  });

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  async function handleFile(file: File) {
    loadCsvText(await file.text(), false);
  }
  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }

  // donut geometry
  const R = 60;
  const C = 2 * Math.PI * R;
  const donutColors = ["var(--c1)", "var(--c2)", "#b9c3ff", "#5566cc", "#aab6ff"];
  function donutArcs(alloc: { pct: number }[]) {
    let off = 0;
    return alloc.map((a, i) => {
      const arc = { color: donutColors[i % donutColors.length], da: `${a.pct * C - 2} ${C - (a.pct * C - 2)}`, off: -off * C };
      off += a.pct;
      return arc;
    });
  }
  const barWidth = (etfs: EtfRow[], g: number) => {
    const max = Math.max(1, ...etfs.map((e) => Math.abs(e.gain)));
    return Math.round((Math.abs(g) / max) * 100) + "%";
  };

  const nav = [
    { ico: "▦", label: "Overview", active: true },
    { ico: "◱", label: "Portfolio" },
    { ico: "◠", label: "Performance" },
    { ico: "⤓", label: "Contributions" },
    { ico: "◈", label: "Stocks" },
    { ico: "▤", label: "Tax" },
  ];
</script>

{#if $view}
  {@const v = $view}
  <div class="app">
    <aside class="sidebar" aria-label="Sections">
      <div class="brand"><span class="brand-mark">◆</span><span class="brand-name">Board</span></div>
      <nav class="nav">
        {#each nav as n}
          <a class="nav-item {n.active ? 'is-active' : ''}" href="#top"><span class="ni-ico">{n.ico}</span>{n.label}</a>
        {/each}
      </nav>
      <div class="nav-foot">
        <a class="nav-item" href="#top"><span class="ni-ico">⚙</span>Settings</a>
      </div>
    </aside>

    <div class="main">
      <header class="topbar" id="top">
        <h1 class="page-title">Overview</h1>
        <div class="top-actions">
          <span class="prices-chip">
            <span class="dot"></span>
            {$usingSample ? "Sample data" : v.pricesAreFallback ? "Prices: last transaction" : "Prices: manual"}
          </span>
          <button class="btn" type="button" title="Fetch live prices (coming soon)">↻ Refresh</button>
          <button class="btn" type="button" onclick={toggleTheme}>◐ Theme</button>
          <div class="seg"><button class="seg-btn is-on" type="button">EN</button><button class="seg-btn" type="button">FR</button></div>
          <label class="btn" style="cursor:pointer">＋ Import<input type="file" accept=".csv" onchange={onInput} hidden /></label>
        </div>
      </header>

      <div class="content">
        <!-- HERO -->
        <section class="hero card">
          <div>
            <div class="hero-label">Portfolio value</div>
            <div class="hero-value num">{eur(v.kpis.currentValue)}</div>
            <div class="hero-delta {toneClass(v.kpis.gain)}">
              <span class="delta-glyph">{v.kpis.gain >= 0 ? "▲" : "▼"}</span>
              {eurSigned(v.kpis.gain)} <span>{pct(v.kpis.gainPct)}</span>
              <span class="delta-since">all time</span>
            </div>
          </div>
        </section>

        <!-- KPIs -->
        <section class="kpis">
          <div class="card kpi"><div class="kpi-label">Contributions</div><div class="kpi-value num">{eur(v.kpis.contributions)}</div><div class="kpi-sub">your money in</div></div>
          <div class="card kpi"><div class="kpi-label">Saveback received</div><div class="kpi-value num">{eur(v.kpis.savebackReceived)}</div><div class="kpi-sub">free, reinvested</div></div>
          <div class="card kpi"><div class="kpi-label">Total cost</div><div class="kpi-value num">{eur(v.kpis.totalCost)}</div><div class="kpi-sub">buys + saveback</div></div>
          <div class="card kpi"><div class="kpi-label">Fees</div><div class="kpi-value num">{eur(v.kpis.fees)}</div><div class="kpi-sub">on your orders</div></div>
          <div class="card kpi"><div class="kpi-label">Market perf</div><div class="kpi-value num {toneClass(v.kpis.gain)}">{eurSigned(v.kpis.gain)}</div><div class="kpi-sub {toneClass(v.kpis.gain)}">{pct(v.kpis.gainPct)}</div></div>
          <div class="card kpi"><div class="kpi-label">Saveback worth</div><div class="kpi-value num gain">{eur(v.kpis.savebackContribution)}</div><div class="kpi-sub">value of free shares</div></div>
        </section>

        <!-- CHART + ALLOCATION -->
        <section class="row-8-4">
          <div class="card">
            <div class="card-head">
              <div>
                <h2 class="card-title">Value over time</h2>
                <p class="card-sub">Portfolio value vs invested cost — the gap is your unrealised gain.</p>
              </div>
              <div class="seg range-seg">
                {#each ["1M", "6M", "1Y", "Max"] as r}
                  <button class="seg-btn {range === r ? 'is-on' : ''}" type="button" onclick={() => (range = r)}>{r}</button>
                {/each}
              </div>
            </div>
            <div class="legend chart-legend">
              <span class="lg"><i class="sw" style="background:var(--accent)"></i>Value</span>
              <span class="lg"><i class="sw" style="background:var(--loss)"></i>Cost</span>
            </div>
            {#key theme + "|" + range}
              <ValueChart series={filterSeries(v.series, range)} {theme} />
            {/key}
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Allocation</h2></div>
            <div class="donut-wrap">
              <svg class="donut" viewBox="0 0 160 160" role="img" aria-label="Portfolio allocation by holding">
                <circle cx="80" cy="80" r="60" fill="none" stroke="var(--track)" stroke-width="20"></circle>
                {#each donutArcs(v.allocation) as a}
                  <circle cx="80" cy="80" r="60" fill="none" stroke={a.color} stroke-width="20" stroke-dasharray={a.da} stroke-dashoffset={a.off}></circle>
                {/each}
              </svg>
              <div class="donut-center">
                <div class="dc-val num">{eur(v.kpis.currentValue)}</div>
                <div class="dc-sub">{v.allocation.length} holdings</div>
              </div>
            </div>
            <ul class="alloc-legend">
              {#each v.allocation as a, i}
                <li>
                  <i class="sw" style="background:{donutColors[i % donutColors.length]}"></i>
                  <span class="al-name">{a.name}</span>
                  <span class="al-pct num">{(a.pct * 100).toFixed(1)}%</span>
                  <span class="al-eur num">{eur(a.value)}</span>
                </li>
              {/each}
            </ul>
          </div>
        </section>

        <!-- MOVERS + HOLDINGS -->
        <section class="row-6-6">
          <div class="card">
            <div class="card-head"><h2 class="card-title">Movers</h2><span class="card-sub">by unrealised gain/loss</span></div>
            <ul class="movers">
              {#each v.etfs as e}
                <li class="mover">
                  <span class="mv-name">{e.name}</span>
                  <span class="mv-bar"><i class="mv-fill" style="width:{barWidth(v.etfs, e.gain)}; background:var({e.gain >= 0 ? '--gain' : '--loss'})"></i></span>
                  <span class="mv-eur {toneClass(e.gain)}">{eurSigned(e.gain)}</span>
                  <span class="mv-pct {toneClass(e.gain)}">{pct(e.gainPct)}</span>
                </li>
              {/each}
            </ul>
            {#if v.stocks.length}
              <div class="stock-note">
                <span class="pill">Stock picking</span>
                {#each v.stocks as s}
                  {s.name} — <span class={toneClass(s.realised)}>realised {eurSigned(s.realised)}</span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="card">
            <div class="card-head"><h2 class="card-title">Holdings</h2></div>
            <div class="table-scroll">
              <table class="tbl">
                <thead>
                  <tr><th>Name</th><th class="n">Shares</th><th class="n">Cost</th><th class="n">Value</th><th class="n">Gain/Loss</th></tr>
                </thead>
                <tbody>
                  {#each v.etfs as e}
                    <tr>
                      <td>{e.name}</td>
                      <td class="n num">{shares(e.shares)}</td>
                      <td class="n num">{eur(e.costBasis)}</td>
                      <td class="n num">{eur(e.value)}</td>
                      <td class="n num {toneClass(e.gain)}">{eurSigned(e.gain)}<span class="cell-pct">{pct(e.gainPct)}</span></td>
                    </tr>
                  {/each}
                  <tr class="tbl-total">
                    <td>Total</td><td class="n">—</td>
                    <td class="n num">{eur(v.kpis.totalCost)}</td>
                    <td class="n num">{eur(v.kpis.currentValue)}</td>
                    <td class="n num {toneClass(v.kpis.gain)}">{eurSigned(v.kpis.gain)}<span class="cell-pct">{pct(v.kpis.gainPct)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <p class="mock-note">Data stays in your browser. Prices default to the last transaction price until you refresh.</p>
      </div>
    </div>
  </div>
{:else}
  <div class="empty">
    <div class="dz">
      <h1>Your portfolio, privately.</h1>
      <p>Your Trade Republic CSV is read entirely in your browser — it never leaves your device.</p>
      <label
        class="drop {dragging ? 'drag' : ''}"
        ondragover={(e) => { e.preventDefault(); dragging = true; }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <div class="ico">⬇</div>
        <div class="t">Drop your Trade Republic CSV, or click to browse</div>
        <div class="s">Processed locally · nothing uploaded</div>
        <input type="file" accept=".csv" onchange={onInput} hidden />
      </label>
      <button class="link-btn" type="button" onclick={loadSample}>Try with sample data →</button>
      {#if $errorMsg}<p class="loss" style="margin-top:14px">{$errorMsg}</p>{/if}
    </div>
  </div>
{/if}
