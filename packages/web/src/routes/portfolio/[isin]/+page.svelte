<script lang="ts">
  import { page } from "$app/stores";

  import ValueChart from "$lib/components/ValueChart.svelte";
  import { eur, eurSigned, monthLabel, pct, shares, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";
  import { theme } from "$lib/theme";

  const isin = $derived(decodeURIComponent($page.params.isin ?? ""));
  const asset = $derived($view ? ($view.byAsset[isin] ?? null) : null);

  let open = $state<Record<number, boolean>>({});
  const toggle = (y: number) => (open[y] = !open[y]);

  // Default the most recent year to expanded whenever the asset changes.
  $effect(() => {
    const a = asset;
    open = a && a.years.length ? { [a.years[a.years.length - 1].year]: true } : {};
  });
</script>

{#if $view}
  <a class="back" href="/portfolio">{$t("back_pf")}</a>

  {#if asset}
    {@const a = asset}
    <!-- Identity + position -->
    <section class="card asset-head">
      <div class="ah-title">
        <h2 class="card-title">{a.name}</h2>
        <span class="badge">{a.type === "etf" ? "ETF" : $t("badge_stock")}</span>
        <span class="ah-isin num">{a.isin}</span>
      </div>
      <p class="card-sub">{$t("a_follow_sub")}</p>
      <div class="asset-kpis">
        <div class="ak"><span class="ak-l">{$t("th_valuetoday")}</span><span class="ak-v">{eur(a.value)}</span></div>
        <div class="ak"><span class="ak-l">{$t("a_invested")}</span><span class="ak-v">{eur(a.invested)}</span></div>
        <div class="ak"><span class="ak-l">{$t("th_gainloss")}</span><span class="ak-v {toneClass(a.gain)}">{eurSigned(a.gain)} <small>{pct(a.gainPct)}</small></span></div>
        <div class="ak"><span class="ak-l">{$t("th_shares")}</span><span class="ak-v">{shares(a.shares)}</span></div>
        <div class="ak"><span class="ak-l">{$t("th_avgcost")}</span><span class="ak-v">{eur(a.avgCost)}</span></div>
      </div>
    </section>

    <!-- Value vs cost over time (reuses the portfolio chart, scoped to this line) -->
    <section class="card">
      <div class="card-head">
        <div><h2 class="card-title">{$t("c_value")}</h2><p class="card-sub">{$t("c_value_sub")}</p></div>
        <div class="legend chart-legend">
          <span class="lg"><i class="sw" style="background:var(--accent)"></i>{$t("legend_value")}</span>
          <span class="lg"><i class="sw" style="background:var(--loss)"></i>{$t("legend_cost")}</span>
        </div>
      </div>
      {#if a.series.length >= 2}
        {#key a.isin}<ValueChart series={a.series} theme={$theme} />{/key}
      {:else}
        <p class="mock-note">{$t("a_nochart")}</p>
      {/if}
    </section>

    <!-- History by year → month (cohort figures) -->
    <section class="card">
      <div class="card-head"><div><h2 class="card-title">{$t("a_hist_year")}</h2><p class="card-sub">{$t("byyear_sub")}</p></div></div>
      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_year")}</th>
              <th class="n">{$t("th_buys")}</th>
              <th class="n">{$t("th_saveback")}</th>
              <th class="n">{$t("th_cost")}</th>
              <th class="n">{$t("th_valuetoday")}</th>
              <th class="n" title={$t("cohort_hint")}>{$t("th_gain")}</th>
            </tr>
          </thead>
          <tbody>
            {#each a.years as y}
              <tr
                class="row-exp"
                role="button"
                tabindex="0"
                aria-expanded={!!open[y.year]}
                onclick={() => toggle(y.year)}
                onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(y.year); } }}
              >
                <td><span class="chev {open[y.year] ? 'is-open' : ''}" aria-hidden="true">▸</span>{y.year}</td>
                <td class="n num">{eur(y.buys)}</td>
                <td class="n num">{eur(y.saveback)}</td>
                <td class="n num">{eur(y.cost)}</td>
                <td class="n num">{eur(y.value)}</td>
                <td class="n num {toneClass(y.gain)}">{eurSigned(y.gain)}<span class="cell-pct">{pct(y.gainPct)}</span></td>
              </tr>
              {#each y.months as m}
                <tr class="sub-row {open[y.year] ? 'is-open' : ''}">
                    <td class="sub-name">{monthLabel(y.year, m.month)}</td>
                    <td class="n num">{eur(m.buys)}</td>
                    <td class="n num">{eur(m.saveback)}</td>
                    <td class="n num">{eur(m.cost)}</td>
                    <td class="n num">{eur(m.value)}</td>
                    <td class="n num {toneClass(m.gain)}">{eurSigned(m.gain)}<span class="cell-pct">{pct(m.gainPct)}</span></td>
                  </tr>
              {/each}
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else}
    <section class="card"><p class="mock-note">{$t("a_notfound")}</p></section>
  {/if}
{/if}
