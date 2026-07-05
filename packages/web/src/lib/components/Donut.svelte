<script lang="ts">
  import type { View } from "@tr/core";

  import { eur } from "$lib/format";
  import { t } from "$lib/i18n";

  let { allocation, total }: { allocation: View["allocation"]; total: number } = $props();

  const R = 60;
  const C = 2 * Math.PI * R;
  const colors = ["var(--c1)", "var(--c2)", "#b9c3ff", "#5566cc", "#aab6ff"];
  function arcs(alloc: { pct: number }[]) {
    let off = 0;
    return alloc.map((a, i) => {
      const arc = { color: colors[i % colors.length], da: `${a.pct * C - 2} ${C - (a.pct * C - 2)}`, off: -off * C };
      off += a.pct;
      return arc;
    });
  }
</script>

<div class="donut-wrap">
  <svg class="donut" viewBox="0 0 160 160" role="img" aria-label="Allocation">
    <circle cx="80" cy="80" r="60" fill="none" stroke="var(--track)" stroke-width="20"></circle>
    {#each arcs(allocation) as a}
      <circle cx="80" cy="80" r="60" fill="none" stroke={a.color} stroke-width="20" stroke-dasharray={a.da} stroke-dashoffset={a.off}></circle>
    {/each}
  </svg>
  <div class="donut-center">
    <div class="dc-val num">{eur(total)}</div>
    <div class="dc-sub">{allocation.length} {$t("holdings_count")}</div>
  </div>
</div>
<ul class="alloc-legend">
  {#each allocation as a, i}
    <li>
      <i class="sw" style="background:{colors[i % colors.length]}"></i>
      <span class="al-name">{a.name}</span>
      <span class="al-pct num">{(a.pct * 100).toFixed(1)}%</span>
      <span class="al-eur num">{eur(a.value)}</span>
    </li>
  {/each}
</ul>
