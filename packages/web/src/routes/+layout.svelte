<script lang="ts">
  import { onMount } from "svelte";

  import { page } from "$app/stores";
  import { get } from "svelte/store";

  import { lang, setLang, t } from "$lib/i18n";
  import { NAV } from "$lib/nav";
  import { autoRefresh, clearData, errorMsg, loadCsvText, loadSample, refreshedAt, refreshing, refreshPrices, restore, usingSample, view } from "$lib/state";
  import { applyTheme, theme, toggleTheme } from "$lib/theme";
  import { exportXlsx } from "$lib/xlsx";

  import "../app.css";

  // On narrow screens the action buttons collapse into a compact ⋯ menu.
  let menuOpen = $state(false);

  let refreshMsg = $state("");
  async function onRefresh() {
    menuOpen = false;
    refreshMsg = "";
    const { ok, fail } = await refreshPrices();
    if (ok === 0 && fail > 0) refreshMsg = $t("refresh_fail");
    else if (fail > 0) refreshMsg = `${ok} ✓ · ${fail} ✗`;
  }

  function onExport() {
    menuOpen = false;
    const v = get(view);
    if (!v) return;
    const date = new Date().toISOString().slice(0, 10);
    exportXlsx(v, get(lang), `traderepublic-board-${date}.xlsx`);
  }

  let { children } = $props();
  let dragging = $state(false);

  // Privacy blur: hide sensitive figures in one click / keypress (a colleague walks by).
  let privacy = $state(false);

  onMount(() => {
    // ?theme=dark|light and ?privacy=1 let you deep-link a specific look (also used for docs).
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get("theme");
    applyTheme(urlTheme === "dark" || urlTheme === "light" ? urlTheme : get(theme));
    if (params.get("privacy") === "1") privacy = true;
    if (!$view && !restore()) loadSample(); // restore imported data across refreshes

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "h" || e.key === "H") privacy = !privacy;
      if (e.key === "Escape") menuOpen = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Close the mobile action menu when clicking anywhere outside it.
  $effect(() => {
    if (!menuOpen) return;
    const onDown = (e: Event) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".top-actions") && !el.closest(".menu-toggle")) menuOpen = false;
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  });

  // Opt-in auto-refresh: poll the proxy every minute, only while the tab is visible.
  $effect(() => {
    if (!$autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshPrices();
    }, 60_000);
    return () => clearInterval(id);
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
  const titleKey = $derived(NAV.find((n) => n.href === activeHref)?.key ?? "nav_overview");
  const printDate = $derived(new Date().toLocaleDateString($lang === "fr" ? "fr-FR" : "en-GB"));
</script>

{#if $view}
  <div class="app {privacy ? 'is-private' : ''}">
    <aside class="sidebar" aria-label="Sections">
      <div class="brand"><span class="brand-mark">◆</span><span class="brand-name">Board</span></div>
      <nav class="nav">
        {#each NAV.filter((n) => n.href !== "/tax" || $lang === "fr") as n}
          <a class="nav-item {activeHref === n.href ? 'is-active' : ''}" href={n.href} title={$t(n.key)}>
            <span class="ni-ico">{n.ico}</span><span class="nav-label">{$t(n.key)}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <div class="main">
      <header class="topbar">
        <h1 class="page-title">{$t(titleKey)}</h1>
        <button class="btn menu-toggle" type="button" onclick={() => (menuOpen = !menuOpen)} aria-expanded={menuOpen} aria-label="Menu">⋯</button>
        <div class="top-actions {menuOpen ? 'is-open' : ''}">
          <span class="prices-chip" title={$usingSample ? $t("import_hint") : ""}>
            <span class="dot {$usingSample ? '' : 'on'}"></span>
            {#if $usingSample}{$t("prices_sample")}
            {:else if $refreshedAt}{$t("prices_online")} · {$refreshedAt}
            {:else if $view?.pricesAreFallback}{$t("prices_lasttx")}
            {:else}{$t("prices_manual")}{/if}
          </span>
          <button class="chip-x" type="button" onclick={() => { menuOpen = false; clearData(); }} title={$t("set_clear")} aria-label={$t("set_clear")}>✕</button>
          {#if refreshMsg}<span class="prices-chip loss">{refreshMsg}</span>{/if}
          <button class="btn" type="button" onclick={onRefresh} disabled={$refreshing} title={$t("refresh_hint")}>↻ {$refreshing ? $t("refreshing") : $t("refresh")}</button>
          <button class="btn" type="button" onclick={() => { menuOpen = false; window.print(); }}>⎙ {$t("print")}</button>
          <button class="btn" type="button" onclick={onExport}>⭳ {$t("export")}</button>
          <button class="btn" type="button" onclick={() => (privacy = !privacy)} aria-pressed={privacy} title={$t("privacy_hint")}>{privacy ? "🙈" : "👁"}</button>
          <button class="btn" type="button" onclick={toggleTheme}>◐ {$t("theme")}</button>
          <div class="seg">
            <button class="seg-btn {$lang === 'en' ? 'is-on' : ''}" type="button" onclick={() => setLang("en")}>EN</button>
            <button class="seg-btn {$lang === 'fr' ? 'is-on' : ''}" type="button" onclick={() => setLang("fr")}>FR</button>
          </div>
          <label class="btn" style="cursor:pointer">＋ {$t("import")}<input type="file" accept=".csv" onchange={(e) => { menuOpen = false; onInput(e); }} hidden /></label>
        </div>
      </header>

      <div class="content">
        <div class="print-head">
          <span class="ph-brand">◆ Board</span>
          <span class="ph-title">{$t(titleKey)}</span>
          <span class="ph-date">{printDate}</span>
        </div>
        {@render children()}
        <footer class="app-foot">
          <span>{$t("foot_oss")}</span>
          <span class="foot-sep">·</span>
          <a href="https://github.com/LGD-P/TradeRepublicBoard" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          <a href="https://github.com/LGD-P/TradeRepublicBoard/issues" target="_blank" rel="noopener noreferrer">{$t("foot_issues")}</a>
        </footer>
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
