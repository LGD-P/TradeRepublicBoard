<script lang="ts">
  import { onMount } from "svelte";

  import { page } from "$app/stores";
  import { get } from "svelte/store";

  import { lang, setLang, t } from "$lib/i18n";
  import { NAV } from "$lib/nav";
  import { errorMsg, loadCsvText, loadSample, restore, usingSample, view } from "$lib/state";
  import { applyTheme, theme, toggleTheme } from "$lib/theme";
  import { exportXlsx } from "$lib/xlsx";

  import "../app.css";

  function onExport() {
    const v = get(view);
    if (!v) return;
    const date = new Date().toISOString().slice(0, 10);
    exportXlsx(v, get(lang), `traderepublic-board-${date}.xlsx`);
  }

  let { children } = $props();
  let dragging = $state(false);

  onMount(() => {
    applyTheme(get(theme)); // sync the <html data-theme> attribute with the stored value
    if (!$view && !restore()) loadSample(); // restore imported data across refreshes
  });

  async function handleFile(f: File) {
    loadCsvText(await f.text(), false);
  }
  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }

  // Match the current section, including sub-routes like /portfolio/<isin>.
  const activeHref = $derived(
    [...NAV].filter((n) => n.href !== "/")
      .sort((a, b) => b.href.length - a.href.length)
      .find((n) => $page.url.pathname === n.href || $page.url.pathname.startsWith(n.href + "/"))?.href
      ?? "/",
  );
  const onSettings = $derived($page.url.pathname.startsWith("/settings"));
  const titleKey = $derived(onSettings ? "nav_settings" : NAV.find((n) => n.href === activeHref)?.key ?? "nav_overview");
  const printDate = $derived(new Date().toLocaleDateString($lang === "fr" ? "fr-FR" : "en-GB"));
</script>

{#if $view}
  <div class="app">
    <aside class="sidebar" aria-label="Sections">
      <div class="brand"><span class="brand-mark">◆</span><span class="brand-name">Board</span></div>
      <nav class="nav">
        {#each NAV as n}
          <a class="nav-item {activeHref === n.href ? 'is-active' : ''}" href={n.href}>
            <span class="ni-ico">{n.ico}</span>{$t(n.key)}
          </a>
        {/each}
      </nav>
      <div class="nav-foot">
        <a class="nav-item {onSettings ? 'is-active' : ''}" href="/settings"><span class="ni-ico">⚙</span>{$t("nav_settings")}</a>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <h1 class="page-title">{$t(titleKey)}</h1>
        <div class="top-actions">
          <span class="prices-chip">
            <span class="dot"></span>
            {$usingSample ? $t("prices_sample") : $view?.pricesAreFallback ? $t("prices_lasttx") : $t("prices_manual")}
          </span>
          <button class="btn" type="button" title="Coming soon">↻ {$t("refresh")}</button>
          <button class="btn" type="button" onclick={() => window.print()}>⎙ {$t("print")}</button>
          <button class="btn" type="button" onclick={onExport}>⭳ {$t("export")}</button>
          <button class="btn" type="button" onclick={toggleTheme}>◐ {$t("theme")}</button>
          <div class="seg">
            <button class="seg-btn {$lang === 'en' ? 'is-on' : ''}" type="button" onclick={() => setLang("en")}>EN</button>
            <button class="seg-btn {$lang === 'fr' ? 'is-on' : ''}" type="button" onclick={() => setLang("fr")}>FR</button>
          </div>
          <label class="btn" style="cursor:pointer">＋ {$t("import")}<input type="file" accept=".csv" onchange={onInput} hidden /></label>
        </div>
      </header>

      <div class="content">
        <div class="print-head">
          <span class="ph-brand">◆ Board</span>
          <span class="ph-title">{$t(titleKey)}</span>
          <span class="ph-date">{printDate}</span>
        </div>
        {@render children()}
      </div>
    </div>
  </div>
{:else}
  <div class="empty">
    <div class="dz">
      <h1>{$t("e_title")}</h1>
      <p>{$t("e_sub")}</p>
      <label
        class="drop {dragging ? 'drag' : ''}"
        ondragover={(e) => { e.preventDefault(); dragging = true; }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <div class="ico">⬇</div>
        <div class="t">{$t("e_drop")}</div>
        <div class="s">{$t("e_local")}</div>
        <input type="file" accept=".csv" onchange={onInput} hidden />
      </label>
      <button class="link-btn" type="button" onclick={loadSample}>{$t("e_try")}</button>
      {#if $errorMsg}<p class="loss" style="margin-top:14px">{$errorMsg}</p>{/if}
    </div>
  </div>
{/if}
