<script lang="ts">
  import { eur } from "$lib/format";
  import { lang, setLang, t } from "$lib/i18n";
  import { clearData, manualPriceMap, resetManualPrices, setManualPrice, usingSample, view } from "$lib/state";
  import { applyTheme, theme } from "$lib/theme";

  const holdings = $derived(
    $view
      ? [
          ...$view.etfs.map((e) => ({ isin: e.isin, name: e.name })),
          ...$view.stocks.map((s) => ({ isin: s.isin, name: s.name })),
        ]
      : [],
  );
  const hasManual = $derived(Object.keys($manualPriceMap).length > 0);

  function onPrice(isin: string, e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(",", ".").trim();
    setManualPrice(isin, raw === "" ? null : Number(raw));
  }
</script>

{#if $view}
  {@const v = $view}
  <p class="set-lead">{$t("set_sub")}</p>

  <!-- Appearance -->
  <section class="card">
    <div class="card-head"><h2 class="card-title">{$t("set_appearance")}</h2></div>
    <div class="set-row">
      <span class="set-k">{$t("set_language")}</span>
      <div class="seg">
        <button class="seg-btn {$lang === 'en' ? 'is-on' : ''}" type="button" onclick={() => setLang("en")}>EN</button>
        <button class="seg-btn {$lang === 'fr' ? 'is-on' : ''}" type="button" onclick={() => setLang("fr")}>FR</button>
      </div>
    </div>
    <div class="set-row">
      <span class="set-k">{$t("theme")}</span>
      <div class="seg">
        <button class="seg-btn {$theme !== 'dark' ? 'is-on' : ''}" type="button" onclick={() => applyTheme("light")}>{$t("set_theme_light")}</button>
        <button class="seg-btn {$theme === 'dark' ? 'is-on' : ''}" type="button" onclick={() => applyTheme("dark")}>{$t("set_theme_dark")}</button>
      </div>
    </div>
  </section>

  <!-- Current prices (manual, no network) -->
  <section class="card">
    <div class="card-head">
      <div><h2 class="card-title">{$t("set_prices")}</h2><p class="card-sub">{$t("set_prices_sub")}</p></div>
      {#if hasManual}
        <button class="btn" type="button" onclick={resetManualPrices}>{$t("set_price_reset")}</button>
      {/if}
    </div>
    <div class="table-scroll">
      <table class="tbl">
        <thead>
          <tr><th>{$t("th_name")}</th><th class="n">{$t("th_price")}</th></tr>
        </thead>
        <tbody>
          {#each holdings as h}
            <tr>
              <td>{h.name}</td>
              <td class="n">
                <input
                  class="px-input num"
                  type="text"
                  inputmode="decimal"
                  value={$manualPriceMap[h.isin] ?? v.prices[h.isin] ?? ""}
                  placeholder={$t("set_price_ph")}
                  aria-label={h.name}
                  onchange={(e) => onPrice(h.isin, e)}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="set-note">{hasManual ? $t("set_price_manual_on") : $t("set_price_fallback_on")}</p>
  </section>

  <!-- Data & privacy -->
  <section class="card">
    <div class="card-head"><div><h2 class="card-title">{$t("set_data")}</h2><p class="card-sub">{$t("set_data_sub")}</p></div></div>
    <div class="set-row">
      <span class="set-k">{$usingSample ? $t("set_status_sample") : $t("set_status_imported")}</span>
      <button class="btn btn-danger" type="button" onclick={clearData}>{$t("set_clear")}</button>
    </div>
    <p class="set-note">{$t("set_clear_sub")}</p>
  </section>
{/if}
