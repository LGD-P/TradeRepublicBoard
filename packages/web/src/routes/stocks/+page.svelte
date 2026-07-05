<script lang="ts">
  import { eur, eurSigned, pct, shares, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";
</script>

{#if $view}
  {@const v = $view}
  <section class="card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("st_title")}</h2><p class="card-sub">{$t("st_sub")}</p></div>
    </div>
    {#if v.stocks.length}
      <div class="table-scroll">
        <table class="tbl">
          <thead>
            <tr>
              <th>{$t("th_company")}</th>
              <th class="n">{$t("th_shares")}</th>
              <th class="n">{$t("th_avgcost")}</th>
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
                <td class="n num">{eur(s.value)}</td>
                <td class="n num {toneClass(s.unrealised)}">{eurSigned(s.unrealised)}<span class="cell-pct">{pct(s.unrealisedPct)}</span></td>
                <td class="n num {toneClass(s.realised)}">{eurSigned(s.realised)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="card-sub">{$t("st_empty")}</p>
    {/if}
  </section>
{/if}
