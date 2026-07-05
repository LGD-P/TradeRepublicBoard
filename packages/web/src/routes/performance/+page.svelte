<script lang="ts">
  import ValueChart from "$lib/components/ValueChart.svelte";
  import { eur, eurSigned, monthLabel, pct, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";
  import { theme } from "$lib/theme";

  let range = $state("Max");
  function filterSeries<T>(series: T[], r: string): T[] {
    if (r === "Max") return series;
    const months = r === "1M" ? 1 : r === "6M" ? 6 : 12;
    return series.slice(Math.max(0, series.length - (months + 1)));
  }
</script>

{#if $view}
  {@const v = $view}
  {@const savPct = v.kpis.savebackReceived ? (v.kpis.savebackContribution - v.kpis.savebackReceived) / v.kpis.savebackReceived : 0}

  <section class="card chart-card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("c_value")}</h2><p class="card-sub">{$t("c_value_sub")}</p></div>
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
  </section>

  <section class="card">
    <div class="card-head"><h2 class="card-title">{$t("perf_break")}</h2></div>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>—</th><th class="n">{$t("perf_basis")}</th><th class="n">{$t("th_gainloss")}</th><th>{$t("perf_measures")}</th></tr></thead>
        <tbody>
          <tr>
            <td>{$t("perf_tr")}</td>
            <td class="n num">{eur(v.kpis.totalCost)}</td>
            <td class="n num {toneClass(v.kpis.gain)}">{eurSigned(v.kpis.gain)} · {pct(v.kpis.gainPct)}</td>
            <td class="card-sub">{$t("perf_tr_m")}</td>
          </tr>
          <tr>
            <td>{$t("perf_sav")}</td>
            <td class="n num">{eur(v.kpis.savebackReceived)}</td>
            <td class="n num gain">{eur(v.kpis.savebackContribution)} · {pct(savPct)}</td>
            <td class="card-sub">{$t("perf_sav_m")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h2 class="card-title">{$t("perf_monthly")}</h2></div>
    <div class="table-scroll">
      <table class="tbl">
        <thead><tr><th>{$t("th_month")}</th><th class="n">{$t("th_cost")}</th><th class="n">{$t("th_value")}</th><th class="n">{$t("th_gain")}</th></tr></thead>
        <tbody>
          {#each v.series as p}
            {@const g = p.value - p.cost}
            <tr>
              <td>{monthLabel(p.year, p.month)}</td>
              <td class="n num">{eur(p.cost)}</td>
              <td class="n num">{eur(p.value)}</td>
              <td class="n num {toneClass(g)}">{eurSigned(g)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
