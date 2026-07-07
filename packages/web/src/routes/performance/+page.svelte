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

  // Month-by-month table: click a header to sort. Chronological by default;
  // numeric columns default to descending (biggest first) on first click.
  type SortKey = "date" | "cost" | "value" | "gain";
  let sortKey = $state<SortKey>("date");
  let sortDir = $state(1); // 1 = ascending, -1 = descending
  function sortBy(k: SortKey) {
    if (sortKey === k) sortDir = -sortDir;
    else { sortKey = k; sortDir = k === "date" ? 1 : -1; }
  }
  const monthlyRows = $derived.by(() => {
    const v = $view;
    if (!v) return [];
    const rows = v.series.map((p) => ({ year: p.year, month: p.month, cost: p.cost, value: p.value, gain: p.value - p.cost }));
    rows.sort((a, b) => {
      const d = sortKey === "date" ? (a.year - b.year) || (a.month - b.month)
        : sortKey === "cost" ? a.cost - b.cost
        : sortKey === "value" ? a.value - b.value
        : a.gain - b.gain;
      return d * sortDir;
    });
    return rows;
  });
</script>

{#snippet sortTh(key: SortKey, label: string, numeric: boolean)}
  <th
    class={numeric ? "n th-sortable" : "th-sortable"}
    aria-sort={sortKey === key ? (sortDir === 1 ? "ascending" : "descending") : "none"}
  >
    <button type="button" class="th-sort" onclick={() => sortBy(key)}>
      {label}<span class="sort-caret {sortKey === key ? 'on' : ''}">{sortKey === key && sortDir === -1 ? "▾" : "▴"}</span>
    </button>
  </th>
{/snippet}

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
    <div class="table-scroll tall">
      <table class="tbl">
        <thead>
          <tr>
            {@render sortTh("date", $t("th_month"), false)}
            {@render sortTh("cost", $t("th_cost"), true)}
            {@render sortTh("value", $t("th_value"), true)}
            {@render sortTh("gain", $t("th_gain"), true)}
          </tr>
        </thead>
        <tbody>
          {#each monthlyRows as p (p.year * 12 + p.month)}
            <tr>
              <td>{monthLabel(p.year, p.month)}</td>
              <td class="n num">{eur(p.cost)}</td>
              <td class="n num">{eur(p.value)}</td>
              <td class="n num {toneClass(p.gain)}">{eurSigned(p.gain)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
