<script lang="ts">
  // Svelte 5 Runes are auto-imported or global
  import { displacementMap, polarDisplacementMap } from "./utils"; // Assuming utils.ts is in the same dir or configured path

  // --- Props ---
  export let id: string; // Unique ID for the SVG filter
  export let className: string = ""; // Custom class for the root div of this internal component
  export let containerStyle: Record<string, string | number> = {}; // Style for the root div

  export let displacementScale: number = 25;
  export let aberrationIntensity: number = 2;
  export let mode: "standard" | "polar" = "standard";

  export let blurAmount: number = 12;
  export let saturation: number = 180;

  export let active: boolean = false; // Visual state
  export let overLight: boolean = false; // Visual variant

  export let cornerRadius: number = 999;
  export let padding: string = "24px 32px";
  export let glassSize: { width: number; height: number } = { width: 270, height: 69 };

  export let onClick: (() => void) | null = null; // Click handler for the root element

  // Event callbacks for interactions on the .glass div
  export let onInternalMouseEnter: (() => void) | undefined = undefined;
  export let onInternalMouseLeave: (() => void) | undefined = undefined;
  export let onInternalMouseDown: (() => void) | undefined = undefined;
  export let onInternalMouseUp: (() => void) | undefined = undefined;

  // For bind:this on the root div
  export let element: HTMLDivElement | null = null;

  // --- Internal State ($state) ---
  let isFirefox = $state(false);

  // --- Lifecycle Effect ($effect) ---
  $effect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    }
  });

  // --- Derived Reactive Calculations ($derived) ---

  // For SVG Filter attributes
  const edgeMaskOffset = $derived(Math.max(30, 80 - aberrationIntensity * 2));
  const feImageHref = $derived(mode === "standard" ? displacementMap : polarDisplacementMap);
  const feFuncATableValues = $derived(`0 ${aberrationIntensity * 0.05} 1`);
  const redDisplacedScale = $derived(displacementScale * -1);
  const greenDisplacedScale = $derived(displacementScale * (-1 - aberrationIntensity * 0.05));
  const blueDisplacedScale = $derived(displacementScale * (-1 - aberrationIntensity * 0.1));
  const gaussianBlurStdDeviation = $derived(Math.max(0.1, 0.5 - aberrationIntensity * 0.1));

  // For general styling
  const svgStyle = $derived(`position: absolute; width: ${glassSize.width}px; height: ${glassSize.height}px;`);
  const warpFilterStyle = $derived(isFirefox ? '' : `url(#${id})`);
  const warpBackdropFilterStyle = $derived(`blur(${(overLight ? 12 : 4) + blurAmount * 32}px) saturate(${saturation}%)`);

  const rootDivClass = $derived(`relative ${className} ${active ? "active" : ""} ${onClick ? "cursor-pointer" : ""}`);

  const glassDivStyle = $derived(
    `border-radius: ${cornerRadius}px; ` +
    `position: relative; display: inline-flex; align-items: center; ` +
    `gap: 24px; padding: ${padding}; overflow: hidden; ` +
    `transition: all 0.2s ease-in-out; ` +
    `box-shadow: ${overLight ? "0px 16px 70px rgba(0, 0, 0, 0.75)" : "0px 12px 40px rgba(0, 0, 0, 0.25)"};`
  );

  const childrenDivStyle = $derived(
    `position: relative; z-index: 1; font: 500 20px/1 system-ui; ` +
    `text-shadow: ${overLight ? "0px 2px 12px rgba(0, 0, 0, 0)" : "0px 2px 12px rgba(0, 0, 0, 0.4)"};`
  );

  const effectiveContainerStyle = $derived(
    Object.entries(containerStyle)
      .map(([k, v]) => `${k}:${typeof v === 'number' && k !== 'opacity' && k !== 'zIndex' && k !== 'fontWeight' ? v + 'px' : v}`) // Basic smart px appending
      .join(';')
  );

</script>

<!-- Outermost container div for this component -->
<div
  class="{rootDivClass}"
  style="{effectiveContainerStyle}"
  on:click={onClick}
  bind:this={element}
>
  <!-- SVG Filter Definition -->
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

  <!-- Inner "glass" div where content and primary interactions occur -->
  <div
    class="glass"
    style="{glassDivStyle}"
    on:mouseenter={() => onInternalMouseEnter?.()}
    on:mouseleave={() => onInternalMouseLeave?.()}
    on:mousedown={() => onInternalMouseDown?.()}
    on:mouseup={() => onInternalMouseUp?.()}
  >
    <!-- Backdrop layer that gets the filter effect -->
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
  /* Using Tailwind or global styles is assumed for these classes */
  /* .relative { position: relative; } ... etc. */
  /* Svelte default scoped styles. If utility classes are needed globally, they must be defined elsewhere or use :global() */
  :global(.relative) { position: relative; }
  :global(.cursor-pointer) { cursor: pointer; }
  :global(.transition-all) { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
  :global(.duration-150) { transition-duration: 150ms; }
  :global(.ease-in-out) { transition-timing-function: ease-in-out; } /* Or specific bezier */
  :global(.text-white) { color: white; }

  /* The .glass class itself is styled inline via glassDivStyle */
  /* The .glass__warp class is styled inline */

  /* Ensure the root div can act as a positioning context if needed */
  div {
    /* This is too general, remove if relying on inline styles and props for root div positioning. */
    /* For this component, the root's position is controlled by `effectiveContainerStyle` */
  }
</style>
