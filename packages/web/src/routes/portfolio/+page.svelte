<script lang="ts">
  import Donut from "$lib/components/Donut.svelte";
  import { eur, eurSigned, monthLabel, pct, shares, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";

  let selectedYear = $state<number | null>(null);
</script>

{#if $view}
  {@const v = $view}

  <!-- ETFs (Récap par ETF style) -->
  <section class="card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("sec_etfs")}</h2><p class="card-sub">{$t("pf_sub")}</p></div>
    </div>
    <div class="table-scroll">
      <table class="tbl">
        <thead>
          <tr>
            <th>{$t("th_name")}</th>
            <th class="n">{$t("th_shares")}</th>
            <th class="n">{$t("th_buys")}</th>
            <th class="n">{$t("th_saveback")}</th>
            <th class="n">{$t("th_totalcost")}</th>
            <th class="n">{$t("th_price")}</th>
            <th class="n">{$t("th_value")}</th>
            <th class="n">{$t("th_gainloss")}</th>
          </tr>
        </thead>
        <tbody>
          {#each v.etfs as e}
            <tr>
              <td>{e.name}</td>
              <td class="n num">{shares(e.shares)}</td>
              <td class="n num">{eur(e.buys)}</td>
              <td class="n num">{eur(e.saveback)}</td>
              <td class="n num">{eur(e.costBasis)}</td>
              <td class="n num">{eur(e.price)}</td>
              <td class="n num">{eur(e.value)}</td>
              <td class="n num {toneClass(e.gain)}">{eurSigned(e.gain)}<span class="cell-pct">{pct(e.gainPct)}</span></td>
            </tr>
          {/each}
          <tr class="tbl-total">
            <td>{$t("total")}</td>
            <td class="n">—</td>
            <td class="n num">{eur(v.kpis.contributions)}</td>
            <td class="n num">{eur(v.kpis.savebackReceived)}</td>
            <td class="n num">{eur(v.kpis.totalCost)}</td>
            <td class="n">—</td>
            <td class="n num">{eur(v.kpis.currentValue)}</td>
            <td class="n num {toneClass(v.kpis.gain)}">{eurSigned(v.kpis.gain)}<span class="cell-pct">{pct(v.kpis.gainPct)}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Single stocks -->
  {#if v.stocks.length}
    <section class="card">
      <div class="card-head"><h2 class="card-title">{$t("nav_stocks")}</h2></div>
      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_company")}</th>
              <th class="n">{$t("th_shares")}</th>
              <th class="n">{$t("th_avgcost")}</th>
              <th class="n">{$t("th_price")}</th>
              <th class="n">{$t("th_value")}</th>
              <th class="n">{$t("th_unrealised")}</th>
              <th class="n">{$t("th_realised")}</th>
            </tr>
          </thead>
          <tbody>
            {#each v.stocks as s}
              <tr>
                <td>{s.name}</td>
                <td class="n num">{shares(s.shares)}</td>
                <td class="n num">{eur(s.avgCost)}</td>
                <td class="n num">{eur(s.price)}</td>
                <td class="n num">{eur(s.value)}</td>
                <td class="n num {toneClass(s.unrealised)}">{eurSigned(s.unrealised)}<span class="cell-pct">{pct(s.unrealisedPct)}</span></td>
                <td class="n num {toneClass(s.realised)}">{eurSigned(s.realised)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Per-year detail (like "By ETF" > per-year in the workbook) -->
  {#if v.years.length}
    {@const yr = selectedYear ?? v.years[v.years.length - 1]}
    {@const detail = v.byYear[yr]}
    <section class="card">
      <div class="card-head">
        <div><h2 class="card-title">{$t("sec_byyear")}</h2></div>
        <div class="seg range-seg">
          {#each v.years as y}
            <button class="seg-btn {yr === y ? 'is-on' : ''}" type="button" onclick={() => (selectedYear = y)}>{y}</button>
          {/each}
        </div>
      </div>

      <h3 class="sub-title">{$t("by_line")}</h3>
      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_name")}</th>
              <th class="n">{$t("th_sharesacq")}</th>
              <th class="n">{$t("th_cost")}</th>
              <th class="n">{$t("th_valuetoday")}</th>
              <th class="n">{$t("th_gainloss")}</th>
            </tr>
          </thead>
          <tbody>
            {#each detail.etfs as e}
              <tr>
                <td>{e.name}</td>
                <td class="n num">{shares(e.shares)}</td>
                <td class="n num">{eur(e.cost)}</td>
                <td class="n num">{eur(e.value)}</td>
                <td class="n num {toneClass(e.gain)}">{eurSigned(e.gain)}<span class="cell-pct">{pct(e.gainPct)}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <h3 class="sub-title">{$t("perf_monthly")}</h3>
      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_month")}</th>
              <th class="n">{$t("th_buys")}</th>
              <th class="n">{$t("th_saveback")}</th>
              <th class="n">{$t("th_cost")}</th>
              <th class="n">{$t("th_valuetoday")}</th>
              <th class="n">{$t("th_gain")}</th>
            </tr>
          </thead>
          <tbody>
            {#each detail.monthly as m}
              <tr>
                <td>{monthLabel(yr, m.month)}</td>
                <td class="n num">{eur(m.buys)}</td>
                <td class="n num">{eur(m.saveback)}</td>
                <td class="n num">{eur(m.cost)}</td>
                <td class="n num">{eur(m.value)}</td>
                <td class="n num {toneClass(m.gain)}">{eurSigned(m.gain)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Allocation -->
  <section class="card">
    <div class="card-head"><h2 class="card-title">{$t("c_alloc")}</h2></div>
    <Donut allocation={v.allocation} total={v.kpis.currentValue} />
  </section>
{/if}
