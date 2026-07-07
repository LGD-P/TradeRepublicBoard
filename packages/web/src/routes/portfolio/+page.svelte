<script lang="ts">
  import { goto } from "$app/navigation";

  import Donut from "$lib/components/Donut.svelte";
  import { eur, eurSigned, monthLabel, pct, shares, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { providerOf } from "$lib/instrument";
  import { view } from "$lib/state";

  let selectedYear = $state<number | null>(null);
  let open = $state<Record<string, boolean>>({});

  function go(isin: string) {
    goto(`/portfolio/${encodeURIComponent(isin)}`);
  }
  function rowKey(e: KeyboardEvent, isin: string) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(isin); }
  }
  const toggle = (k: string) => (open[k] = !open[k]);
</script>

{#if $view}
  {@const v = $view}

  <!-- Allocation (orientation card, on top) -->
  <section class="card">
    <div class="card-head"><h2 class="card-title">{$t("c_alloc")}</h2></div>
    <Donut allocation={v.allocation} total={v.kpis.currentValue} />
  </section>

  <!-- ETFs (Récap par ETF style) — rows drill into the asset -->
  <section class="card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("sec_etfs")}</h2><p class="card-sub">{$t("pf_click_hint")}</p></div>
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
            {@const prov = providerOf(e.name)}
            <tr class="row-link" role="link" tabindex="0" onclick={() => go(e.isin)} onkeydown={(ev) => rowKey(ev, e.isin)}>
              <td>{e.name}<span class="go">›</span>
                <span class="row-meta">{prov ? `${prov} · ${e.isin}` : e.isin}</span>
              </td>
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

  <!-- Single stocks — rows drill into the asset -->
  {#if v.stocks.length}
    <section class="card">
      <div class="card-head">
        <div><h2 class="card-title">{$t("nav_stocks")}</h2><p class="card-sub">{$t("pf_click_hint")}</p></div>
      </div>
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
              <tr class="row-link" role="link" tabindex="0" onclick={() => go(s.isin)} onkeydown={(ev) => rowKey(ev, s.isin)}>
                <td>{s.name}<span class="go">›</span></td>
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

  <!-- Portfolio-wide per-year recap: monthly, with per-instrument disclosure -->
  {#if v.years.length}
    {@const yr = selectedYear ?? v.years[v.years.length - 1]}
    {@const detail = v.byYear[yr]}
    {@const ytot = detail.monthly.reduce((a, m) => ({ buys: a.buys + m.buys, saveback: a.saveback + m.saveback, cost: a.cost + m.cost, value: a.value + m.value, gain: a.gain + m.gain }), { buys: 0, saveback: 0, cost: 0, value: 0, gain: 0 })}
    <section class="card">
      <div class="card-head">
        <div><h2 class="card-title">{$t("sec_byyear")}</h2><p class="card-sub">{$t("byyear_sub")}</p></div>
        <div class="seg range-seg">
          {#each v.years as y}
            <button class="seg-btn {yr === y ? 'is-on' : ''}" type="button" onclick={() => (selectedYear = y)}>{y}</button>
          {/each}
        </div>
      </div>

      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_month")}</th>
              <th class="n">{$t("th_buys")}</th>
              <th class="n">{$t("th_saveback")}</th>
              <th class="n">{$t("th_cost")}</th>
              <th class="n">{$t("th_valuetoday")}</th>
              <th class="n" title={$t("cohort_hint")}>{$t("th_gain")}</th>
            </tr>
          </thead>
          <tbody>
            {#each detail.monthly as m}
              {@const multi = m.instruments.length > 1}
              {@const key = `${yr}-${m.month}`}
              <tr
                class={multi ? "row-exp" : ""}
                role={multi ? "button" : undefined}
                tabindex={multi ? 0 : undefined}
                aria-expanded={multi ? !!open[key] : undefined}
                onclick={multi ? () => toggle(key) : undefined}
                onkeydown={multi ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(key); } } : undefined}
              >
                <td>
                  {#if multi}<span class="chev {open[key] ? 'is-open' : ''}" aria-hidden="true">▸</span>{/if}
                  {monthLabel(yr, m.month)}
                  {#if !multi && m.instruments[0]}<span class="mono-instr">· {m.instruments[0].name}</span>{/if}
                </td>
                <td class="n num">{eur(m.buys)}</td>
                <td class="n num">{eur(m.saveback)}</td>
                <td class="n num">{eur(m.cost)}</td>
                <td class="n num">{eur(m.value)}</td>
                <td class="n num {toneClass(m.gain)}">{eurSigned(m.gain)}</td>
              </tr>
              {#if multi}
                {#each m.instruments as i}
                  <tr class="sub-row {open[key] ? 'is-open' : ''}">
                    <td class="sub-name">{i.name}</td>
                    <td class="n num">{eur(i.buys)}</td>
                    <td class="n num">{eur(i.saveback)}</td>
                    <td class="n num">{eur(i.cost)}</td>
                    <td class="n num">{eur(i.value)}</td>
                    <td class="n num {toneClass(i.gain)}">{eurSigned(i.gain)}<span class="cell-pct">{pct(i.gainPct)}</span></td>
                  </tr>
                {/each}
              {/if}
            {/each}
            <tr class="tbl-total">
              <td>{$t("total")} {yr}</td>
              <td class="n num">{eur(ytot.buys)}</td>
              <td class="n num">{eur(ytot.saveback)}</td>
              <td class="n num">{eur(ytot.cost)}</td>
              <td class="n num">{eur(ytot.value)}</td>
              <td class="n num {toneClass(ytot.gain)}">{eurSigned(ytot.gain)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  {/if}
{/if}
