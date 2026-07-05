<script lang="ts">
  import { eur, eurSigned, toneClass } from "$lib/format";
  import { t } from "$lib/i18n";
  import { view } from "$lib/state";

  const n = (s: string | null) => (s == null ? 0 : Number(s));
</script>

{#if $view}
  {@const v = $view}
  <section class="card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("tax_title")}</h2><p class="card-sub">{$t("tax_sub")}</p></div>
    </div>
    <div class="table-scroll">
      <table class="tbl">
        <thead>
          <tr>
            <th>{$t("th_year")}</th>
            <th class="n">{$t("tax_interest")}</th>
            <th class="n">{$t("tax_realised")}</th>
            <th class="n">{$t("tax_base")}</th>
            <th class="n">{$t("tax_estimate")}</th>
            <th class="n">{$t("tax_contrib")}</th>
          </tr>
        </thead>
        <tbody>
          {#each v.tax as row}
            {@const interest = n(row.interest)}
            {@const realised = n(row.realised_gain)}
            {@const base = interest + realised}
            {@const est = Math.max(realised, 0) * 0.3 + interest * 0.3}
            <tr>
              <td>{row.year}</td>
              <td class="n num">{eur(interest)}</td>
              <td class="n num {toneClass(realised)}">{eurSigned(realised)}</td>
              <td class="n num">{eur(base)}</td>
              <td class="n num">{eur(est)}</td>
              <td class="n num">{eur(n(row.contributions))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <ul class="tax-notes">
      <li>{$t("tax_note1")}</li>
      <li>{$t("tax_note2")}</li>
      <li>{$t("tax_note3")}</li>
    </ul>
  </section>
{/if}
