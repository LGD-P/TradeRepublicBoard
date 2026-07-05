<script lang="ts">
  import { onMount } from "svelte";

  import type { SeriesPoint } from "@tr/core";

  import { eur, eurSigned, toneClass } from "../format";

  let { series, theme }: { series: SeriesPoint[]; theme: string } = $props();

  let el: HTMLDivElement;
  let printImg: HTMLImageElement;
  // lightweight-charts types are loaded dynamically; keep these loose.
  let chart: any;
  let valueSeries: any;
  let costSeries: any;
  let tip = $state<{ x: number; y: number; date: string; value: number; cost: number } | null>(null);

  function colors() {
    const s = getComputedStyle(document.documentElement);
    const c = (name: string) => s.getPropertyValue(name).trim();
    return { accent: c("--accent"), muted: c("--muted"), grid: c("--grid"), loss: c("--loss") };
  }

  function toData(pts: SeriesPoint[], key: "value" | "cost") {
    return pts.map((p) => ({
      time: `${p.year}-${String(p.month).padStart(2, "0")}-01`,
      value: p[key],
    }));
  }

  onMount(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const lc = await import("lightweight-charts");
      if (disposed) return;
      const col = colors();
      chart = lc.createChart(el, {
        height: 300,
        layout: { background: { color: "transparent" }, textColor: col.muted,
          fontFamily: getComputedStyle(document.body).fontFamily, attributionLogo: false },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
        grid: { horzLines: { color: col.grid }, vertLines: { visible: false } },
        crosshair: {
          horzLine: { visible: false },
          vertLine: { color: col.muted, width: 1, style: 2, labelVisible: false },
        },
        handleScroll: false,
        handleScale: false,
      });
      costSeries = chart.addLineSeries({
        color: col.loss, lineWidth: 1, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      valueSeries = chart.addAreaSeries({
        lineColor: col.accent, lineWidth: 2,
        topColor: col.accent + "22", bottomColor: col.accent + "05",
        priceLineVisible: false, lastValueVisible: false,
      });
      costSeries.setData(toData(series, "cost"));
      valueSeries.setData(toData(series, "value"));
      chart.timeScale().fitContent();

      chart.subscribeCrosshairMove((param: any) => {
        if (!param.time || !param.point) { tip = null; return; }
        const v = param.seriesData.get(valueSeries)?.value;
        const c = param.seriesData.get(costSeries)?.value;
        if (v == null) { tip = null; return; }
        tip = { x: param.point.x, y: param.point.y, date: String(param.time), value: v, cost: c ?? 0 };
      });

      ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
      ro.observe(el);
      chart.applyOptions({ width: el.clientWidth });
    })();

    // Canvas doesn't print reliably — snapshot the chart to a static image just
    // before the print dialog so the value-over-time curve shows on paper/PDF.
    const onBeforePrint = () => {
      try { if (chart && printImg) printImg.src = chart.takeScreenshot().toDataURL("image/png"); }
      catch { /* screenshot unavailable — the chart is simply omitted */ }
    };
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      disposed = true;
      window.removeEventListener("beforeprint", onBeforePrint);
      ro?.disconnect();
      chart?.remove();
    };
  });

  // Re-theme when the theme prop changes.
  $effect(() => {
    theme;
    if (!chart) return;
    const col = colors();
    chart.applyOptions({
      layout: { textColor: col.muted },
      grid: { horzLines: { color: col.grid } },
      crosshair: { vertLine: { color: col.muted } },
    });
    valueSeries?.applyOptions({ lineColor: col.accent, topColor: col.accent + "22", bottomColor: col.accent + "05" });
    costSeries?.applyOptions({ color: col.loss });
  });
</script>

<div class="vc">
  <div bind:this={el} class="vc-canvas"></div>
  <img bind:this={printImg} class="vc-print" alt="" />
  {#if tip}
    <div class="vc-tip" style="left:{tip.x}px; top:{tip.y}px">
      <div class="t-date">{tip.date}</div>
      <div class="t-row"><span>Value</span><b>{eur(tip.value)}</b></div>
      <div class="t-row"><span>Cost</span><b>{eur(tip.cost)}</b></div>
      <div class="t-row"><span>Gain</span><b class={toneClass(tip.value - tip.cost)}>{eurSigned(tip.value - tip.cost)}</b></div>
    </div>
  {/if}
</div>

<style>
  .vc { position: relative; }
  .vc-canvas { width: 100%; }
  .vc-print { display: none; }
  @media print {
    .vc-canvas, .vc-tip { display: none; }
    .vc-print { display: block; width: 100%; max-width: 100%; height: auto; }
  }
  .vc-tip {
    position: absolute; pointer-events: none; transform: translate(-50%, -118%);
    background: var(--surface); border: 1px solid var(--hairline); box-shadow: var(--shadow);
    border-radius: 9px; padding: 9px 11px; font-size: 12px; white-space: nowrap; z-index: 6; min-width: 150px;
  }
  .vc-tip .t-date { font-weight: 600; margin-bottom: 5px; }
  .vc-tip .t-row { display: flex; justify-content: space-between; gap: 16px; color: var(--text-2); line-height: 1.7; }
  .vc-tip .t-row b { color: var(--text); font-weight: 600; }
</style>
