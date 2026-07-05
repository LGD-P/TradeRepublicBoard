<script lang="ts">
  import type { EtfRow } from "@tr/core";

  import { eur, eurSigned, pct, shares, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";

  let { etfs, totalCost, currentValue, gain, gainPct }: {
    etfs: EtfRow[]; totalCost: number; currentValue: number; gain: number; gainPct: number;
  } = $props();
</script>

<div class="table-scroll">
  <table class="tbl">
    <thead>
      <tr>
        <th>{$t("th_name")}</th>
        <th class="n">{$t("th_shares")}</th>
        <th class="n">{$t("th_cost")}</th>
        <th class="n">{$t("th_value")}</th>
        <th class="n">{$t("th_gainloss")}</th>
      </tr>
    </thead>
    <tbody>
      {#each etfs as e}
        <tr>
          <td>{e.name}</td>
          <td class="n num">{shares(e.shares)}</td>
          <td class="n num">{eur(e.costBasis)}</td>
          <td class="n num">{eur(e.value)}</td>
          <td class="n num {toneClass(e.gain)}">{eurSigned(e.gain)}<span class="cell-pct">{pct(e.gainPct)}</span></td>
        </tr>
      {/each}
      <tr class="tbl-total">
        <td>{$t("total")}</td>
        <td class="n">—</td>
        <td class="n num">{eur(totalCost)}</td>
        <td class="n num">{eur(currentValue)}</td>
        <td class="n num {toneClass(gain)}">{eurSigned(gain)}<span class="cell-pct">{pct(gainPct)}</span></td>
      </tr>
    </tbody>
  </table>
</div>
