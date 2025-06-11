<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { displacementMap, polarDisplacementMap } from "./utils";

  const dispatch = createEventDispatcher();

  // Props for the combined component
  export let id: string; // Unique ID for the SVG filter, will be passed by parent LiquidGlass
  export let className: string = ""; // Custom class for the root div
  export let containerStyle: Record<string, string | number> = {}; // Custom style for the root div

  export let displacementScale: number = 25; // Controls filter's displacement
  export let aberrationIntensity: number = 2; // Controls filter's aberration
  export let mode: "standard" | "polar" = "standard"; // Filter mode

  export let blurAmount: number = 12; // For backdrop blur
  export let saturation: number = 180; // For backdrop saturation

  export let active: boolean = false; // Visual state, will be controlled by parent LiquidGlass
  export let overLight: boolean = false; // Visual variant, will be controlled by parent LiquidGlass

  export let cornerRadius: number = 999; // Border radius
  export let padding: string = "24px 32px"; // Padding for the glass content area

  // This prop is crucial: it's the size of the glass effect area itself,
  // and also the dimensions for the SVG filter.
  export let glassSize: { width: number; height: number } = { width: 270, height: 69 };

  export let onClick: (() => void) | null = null; // Click handler, passed from parent LiquidGlass

  export let element: HTMLDivElement | null = null; // For bind:this

  // Internal State and Lifecycle
  let isFirefox = false;
  onMount(() => {
    isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
  });

  // Reactive Calculations (Derived from Props)
  // For SVG Filter
  $: edgeMaskOffset = Math.max(30, 80 - aberrationIntensity * 2);
  $: feImageHref = mode === "standard" ? displacementMap : polarDisplacementMap;
  $: feFuncATableValues = `0 ${aberrationIntensity * 0.05} 1`;
  $: redDisplacedScale = displacementScale * -1;
  $: greenDisplacedScale = displacementScale * (-1 - aberrationIntensity * 0.05);
  $: blueDisplacedScale = displacementScale * (-1 - aberrationIntensity * 0.1);
  $: gaussianBlurStdDeviation = Math.max(0.1, 0.5 - aberrationIntensity * 0.1);

  // For Styling
  $: svgStyle = `position: absolute; width: ${glassSize.width}px; height: ${glassSize.height}px;`;
  $: warpFilterStyle = isFirefox ? null : `url(#${id})`; // 'id' is the filterId
  $: warpBackdropFilterStyle = `blur(${(overLight ? 12 : 4) + blurAmount * 32}px) saturate(${saturation}%)`;
  $: mainDivClass = `relative ${className} ${active ? "active" : ""} ${onClick ? "cursor-pointer" : ""}`;
  $: glassDivStyle = `border-radius: ${cornerRadius}px; position: relative; display: inline-flex; align-items: center; gap: 24px; padding: ${padding}; overflow: hidden; transition: all 0.2s ease-in-out; box-shadow: ${overLight ? "0px 16px 70px rgba(0, 0, 0, 0.75)" : "0px 12px 40px rgba(0, 0, 0, 0.25)"};`;
  $: childrenDivStyle = `position: relative; z-index: 1; font: 500 20px/1 system-ui; text-shadow: ${overLight ? "0px 2px 12px rgba(0, 0, 0, 0)" : "0px 2px 12px rgba(0, 0, 0, 0.4)"};`;
  $: effectiveContainerStyle = Object.entries(containerStyle).map(([k, v]) => `${k}:${typeof v === 'number' ? v + 'px' : v}`).join(';');
</script>

<!-- Outermost container div -->
<div
  class="{mainDivClass}"
  style="{effectiveContainerStyle}"
  on:click={onClick}
  bind:this={element}
>
  <!-- SVG Filter (GlassFilter part) -->
  <svg style="{svgStyle}" aria-hidden="true">
    <defs>
      <radialGradient id="{`${id}-edge-mask`}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="black" stop-opacity="0" />
        <stop offset="{`${edgeMaskOffset}%`}" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="white" stop-opacity="1" />
      </radialGradient>
      <filter id="{id}" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB">
        <feImage id="feimage" x="0" y="0" width="100%" height="100%" result="DISPLACEMENT_MAP" href="{feImageHref}" preserveAspectRatio="xMidYMid slice" />
        <feColorMatrix
          in="DISPLACEMENT_MAP"
          type="matrix"
          values="0.3 0.3 0.3 0 0
                 0.3 0.3 0.3 0 0
                 0.3 0.3 0.3 0 0
                 0 0 0 1 0"
          result="EDGE_INTENSITY"
        />
        <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
          <feFuncA type="discrete" tableValues="{feFuncATableValues}" />
        </feComponentTransfer>
        <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale="{redDisplacedScale}" xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED" />
        <feColorMatrix
          in="RED_DISPLACED"
          type="matrix"
          values="1 0 0 0 0
                 0 0 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="RED_CHANNEL"
        />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale="{greenDisplacedScale}" xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED" />
        <feColorMatrix
          in="GREEN_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 1 0 0 0
                 0 0 0 0 0
                 0 0 0 1 0"
          result="GREEN_CHANNEL"
        />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale="{blueDisplacedScale}" xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED" />
        <feColorMatrix
          in="BLUE_DISPLACED"
          type="matrix"
          values="0 0 0 0 0
                 0 0 0 0 0
                 0 0 1 0 0
                 0 0 0 1 0"
          result="BLUE_CHANNEL"
        />
        <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
        <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
        <feGaussianBlur in="RGB_COMBINED" stdDeviation="{gaussianBlurStdDeviation}" result="ABERRATED_BLURRED" />
        <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
        <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
        <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
      </filter>
    </defs>
  </svg>

  <!-- Inner "glass" div -->
  <div
    class="glass"
    style="{glassDivStyle}"
    on:mouseenter={() => dispatch('mouseenter')}
    on:mouseleave={() => dispatch('mouseleave')}
    on:mousedown={() => dispatch('mousedown')}
    on:mouseup={() => dispatch('mouseup')}
  >
    <!-- Backdrop layer -->
    <span
      class="glass__warp"
      style="position: absolute; inset: 0; filter: {warpFilterStyle}; backdrop-filter: {warpBackdropFilterStyle};"
    ></span>

    <!-- User content slot -->
    <div
      class="transition-all duration-150 ease-in-out text-white"
      style="{childrenDivStyle}"
    >
      <slot></slot>
    </div>
  </div>
</div>

<style>
  .relative { position: relative; }
  .cursor-pointer { cursor: pointer; }
  /* Basic transition utilities - consider if a global CSS/Tailwind is used */
  .transition-all { transition-property: all; }
  .duration-150 { transition-duration: 150ms; }
  .ease-in-out { transition-timing-function: ease-in-out; }
  .text-white { color: white; }

  /* If 'active' or other classes are globally defined (e.g., by Tailwind),
     they might work. Otherwise, define them or use :global if needed.
     For scoped styles, Svelte handles it. */
</style>
