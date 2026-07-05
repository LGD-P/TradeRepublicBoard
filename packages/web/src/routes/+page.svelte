<script lang="ts">
  import type { EtfRow } from "@tr/core";

  import Donut from "$lib/components/Donut.svelte";
  import HoldingsTable from "$lib/components/HoldingsTable.svelte";
  import ValueChart from "$lib/components/ValueChart.svelte";
  import { eur, eurSigned, pct, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";
  import { theme } from "$lib/theme";

  let range = $state("Max");
  function filterSeries<T>(series: T[], r: string): T[] {
    if (r === "Max") return series;
    const months = r === "1M" ? 1 : r === "6M" ? 6 : 12;
    return series.slice(Math.max(0, series.length - (months + 1)));
  }
  const barWidth = (etfs: EtfRow[], g: number) =>
    Math.round((Math.abs(g) / Math.max(1, ...etfs.map((e) => Math.abs(e.gain)))) * 100) + "%";
</script>

{#if $view}
  {@const v = $view}
  <!-- HERO -->
  <section class="hero card">
    <div>
      <div class="hero-label">{$t("hero_label")}</div>
      <div class="hero-value num">{eur(v.kpis.currentValue)}</div>
      <div class="hero-delta {toneClass(v.kpis.gain)}">
        <span class="delta-glyph">{v.kpis.gain >= 0 ? "▲" : "▼"}</span>
        {eurSigned(v.kpis.gain)} <span>{pct(v.kpis.gainPct)}</span>
        <span class="delta-since">{$t("all_time")}</span>
      </div>
    </div>
  </section>

  <!-- KPIs -->
  <section class="kpis">
    <div class="card kpi"><div class="kpi-label">{$t("kpi_contrib")}</div><div class="kpi-value num">{eur(v.kpis.contributions)}</div><div class="kpi-sub">{$t("kpi_contrib_sub")}</div></div>
    <div class="card kpi"><div class="kpi-label">{$t("kpi_saveback")}</div><div class="kpi-value num">{eur(v.kpis.savebackReceived)}</div><div class="kpi-sub">{$t("kpi_saveback_sub")}</div></div>
    <div class="card kpi"><div class="kpi-label">{$t("kpi_cost")}</div><div class="kpi-value num">{eur(v.kpis.totalCost)}</div><div class="kpi-sub">{$t("kpi_cost_sub")}</div></div>
    <div class="card kpi"><div class="kpi-label">{$t("kpi_fees")}</div><div class="kpi-value num">{eur(v.kpis.fees)}</div><div class="kpi-sub">{$t("kpi_fees_sub")}</div></div>
    <div class="card kpi"><div class="kpi-label">{$t("kpi_perf")}</div><div class="kpi-value num {toneClass(v.kpis.gain)}">{eurSigned(v.kpis.gain)}</div><div class="kpi-sub {toneClass(v.kpis.gain)}">{pct(v.kpis.gainPct)}</div></div>
    <div class="card kpi"><div class="kpi-label">{$t("kpi_savebackworth")}</div><div class="kpi-value num gain">{eur(v.kpis.savebackContribution)}</div><div class="kpi-sub">{$t("kpi_savebackworth_sub")}</div></div>
  </section>

  <!-- CHART + ALLOCATION -->
  <section class="row-8-4">
    <div class="card chart-card">
      <div class="card-head">
        <div>
          <h2 class="card-title">{$t("c_value")}</h2>
          <p class="card-sub">{$t("c_value_sub")}</p>
        </div>
        <div class="seg range-seg">
          {#each ["1M", "6M", "1Y", "Max"] as r}
            <button class="seg-btn {range === r ? 'is-on' : ''}" type="button" onclick={() => (range = r)}>{r}</button>
          {/each}
        </div>
      </div>
      <div class="legend chart-legend">
        <span class="lg"><i class="sw" style="background:var(--accent)"></i>{$t("legend_value")}</span>
        <span class="lg"><i class="sw" style="background:var(--loss)"></i>{$t("legend_cost")}</span>
      </div>
      {#key $theme + "|" + range}
        <ValueChart series={filterSeries(v.series, range)} theme={$theme} />
      {/key}
    </div>

    <div class="card">
      <div class="card-head"><h2 class="card-title">{$t("c_alloc")}</h2></div>
      <Donut allocation={v.allocation} total={v.kpis.currentValue} />
    </div>
  </section>

  <!-- MOVERS + HOLDINGS -->
  <section class="row-6-6">
    <div class="card">
      <div class="card-head"><h2 class="card-title">{$t("c_movers")}</h2><span class="card-sub">{$t("c_movers_sub")}</span></div>
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
          <span class="pill">{$t("stock_picking")}</span>
          {#each v.stocks as s}
            {s.name} — <span class={toneClass(s.realised)}>{$t("realised")} {eurSigned(s.realised)}</span>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="card-head"><h2 class="card-title">{$t("c_holdings")}</h2></div>
      <HoldingsTable etfs={v.etfs} totalCost={v.kpis.totalCost} currentValue={v.kpis.currentValue} gain={v.kpis.gain} gainPct={v.kpis.gainPct} />
    </div>
  </section>

  <p class="mock-note">{$t("mock_note")}</p>
{/if}
