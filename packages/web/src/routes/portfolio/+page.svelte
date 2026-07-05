<script lang="ts">
  import Donut from "$lib/components/Donut.svelte";
  import HoldingsTable from "$lib/components/HoldingsTable.svelte";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";
</script>

{#if $view}
  {@const v = $view}
  <section class="row-8-4">
    <div class="card">
      <div class="card-head">
        <div><h2 class="card-title">{$t("nav_portfolio")}</h2><p class="card-sub">{$t("pf_sub")}</p></div>
      </div>
      <HoldingsTable etfs={v.etfs} totalCost={v.kpis.totalCost} currentValue={v.kpis.currentValue} gain={v.kpis.gain} gainPct={v.kpis.gainPct} />
    </div>
    <div class="card">
      <div class="card-head"><h2 class="card-title">{$t("c_alloc")}</h2></div>
      <Donut allocation={v.allocation} total={v.kpis.currentValue} />
    </div>
  </section>
{/if}
