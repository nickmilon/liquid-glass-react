<script lang="ts">
  // Svelte 5 Runes are auto-imported or global
  import LiquidGlassInternal from './LiquidGlassInternal.svelte';
  // utils.ts is used by LiquidGlassInternal, not directly here.

  // --- Props ---
  export let displacementScale: number = 70;
  export let blurAmount: number = 0.0625; // This will be passed to LiquidGlassInternal
  export let saturation: number = 140; // This will be passed to LiquidGlassInternal
  export let aberrationIntensity: number = 2; // This will be passed to LiquidGlassInternal
  export let elasticity: number = 0.15;
  export let cornerRadius: number = 999; // This will be passed to LiquidGlassInternal

  export let globalMousePosExternal: { x: number; y: number } | null = null;
  export let mouseOffsetExternal: { x: number; y: number } | null = null;
  export let mouseContainer: HTMLElement | null = null; // Optional external element for mouse tracking

  export let className: string = ""; // Passed to LiquidGlassInternal's className for its root
  export let padding: string = "24px 32px"; // Passed to LiquidGlassInternal
  export let overLight: boolean = false; // Passed to LiquidGlassInternal & used for decorative elements
  export let style: Record<string, string | number> = {}; // Base style for LiquidGlassInternal
  export let mode: "standard" | "polar" = "standard"; // Passed to LiquidGlassInternal
  export let onClick: (() => void) | null = null; // Passed to LiquidGlassInternal

  // Unique ID for the filter, can be overridden by prop if needed
  export let filterId: string = "lg-filter-" + Math.random().toString(36).substr(2, 9);

  // --- State ($state) ---
  let internalElementRef = $state<HTMLDivElement | null>(null); // Ref to LiquidGlassInternal's root div
  let isHovered = $state(false);
  let isActive = $state(false);
  let currentGlassSize = $state({ width: 270, height: 69 }); // Actual size of LiquidGlassInternal
  let internalGlobalMousePos = $state({ x: 0, y: 0 });
  let internalMouseOffset = $state({ x: 0, y: 0 });

  // --- Helper Functions ---
  function updateCurrentGlassSize() {
    if (internalElementRef) {
      const rect = internalElementRef.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        currentGlassSize.width = rect.width;
        currentGlassSize.height = rect.height;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const container = mouseContainer || internalElementRef;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    internalMouseOffset.x = ((e.clientX - centerX) / rect.width) * 100;
    internalMouseOffset.y = ((e.clientY - centerY) / rect.height) * 100;
    internalGlobalMousePos.x = e.clientX;
    internalGlobalMousePos.y = e.clientY;
  }

  // --- Lifecycle Effects ($effect) ---
  $effect(() => { // Initial size and resize listener
    if (typeof window === 'undefined') return;
    updateCurrentGlassSize();
    const rafId = requestAnimationFrame(updateCurrentGlassSize); // For initial layout shifts
    window.addEventListener('resize', updateCurrentGlassSize);
    return () => {
      window.removeEventListener('resize', updateCurrentGlassSize);
      cancelAnimationFrame(rafId);
    }
  });

  $effect(() => { // Mouse move listener
    if (typeof window === 'undefined') return;
    const targetElement = mouseContainer || internalElementRef;
    const useExternalTracking = globalMousePosExternal !== null || mouseOffsetExternal !== null;

    let actualListenerTarget: HTMLElement | null = null;
    if (!useExternalTracking && targetElement) {
      targetElement.addEventListener('mousemove', handleMouseMove);
      actualListenerTarget = targetElement;
    }
    return () => {
      if (actualListenerTarget) {
        actualListenerTarget.removeEventListener('mousemove', handleMouseMove);
      }
    };
  });

  $effect(() => { // Update size if element ref changes
      if(internalElementRef && typeof window !== 'undefined') {
          updateCurrentGlassSize();
      }
  });


  // --- Derived State ($derived) ---
  const globalMousePos = $derived(globalMousePosExternal || internalGlobalMousePos);
  const mouseOffset = $derived(mouseOffsetExternal || internalMouseOffset);

  // --- Calculation Functions (called within $derived) ---
  function calculateFadeInFactor(): number {
    if (!globalMousePos.x || !globalMousePos.y || !internalElementRef) return 0;
    const rect = internalElementRef.getBoundingClientRect();
    const pillWidth = currentGlassSize.width;
    const pillHeight = currentGlassSize.height;
    const edgeDistanceX = Math.max(0, Math.abs(globalMousePos.x - (rect.left + pillWidth / 2)) - pillWidth / 2);
    const edgeDistanceY = Math.max(0, Math.abs(globalMousePos.y - (rect.top + pillHeight / 2)) - pillHeight / 2);
    const edgeDistance = Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY);
    const activationZone = 200;
    return edgeDistance > activationZone ? 0 : 1 - edgeDistance / activationZone;
  }

  function calculateElasticTranslation(): { x: number; y: number } {
    if (!internalElementRef) return { x: 0, y: 0 };
    const fadeInFactor = calculateFadeInFactor();
    const rect = internalElementRef.getBoundingClientRect();
    return {
      x: (globalMousePos.x - (rect.left + currentGlassSize.width / 2)) * elasticity * 0.1 * fadeInFactor,
      y: (globalMousePos.y - (rect.top + currentGlassSize.height / 2)) * elasticity * 0.1 * fadeInFactor,
    };
  }

  function calculateDirectionalScale(): string {
    if (!globalMousePos.x || !globalMousePos.y || !internalElementRef) return "scale(1)";
    const rect = internalElementRef.getBoundingClientRect();
    const pillWidth = currentGlassSize.width;
    const pillHeight = currentGlassSize.height;
    const pillCenterX = rect.left + pillWidth / 2;
    const pillCenterY = rect.top + pillHeight / 2;
    const deltaX = globalMousePos.x - pillCenterX;
    const deltaY = globalMousePos.y - pillCenterY;
    const edgeDistanceX = Math.max(0, Math.abs(deltaX) - pillWidth / 2);
    const edgeDistanceY = Math.max(0, Math.abs(deltaY) - pillHeight / 2);
    const edgeDistance = Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY);
    const activationZone = 200;
    if (edgeDistance > activationZone) return "scale(1)";
    const fadeInFactor = 1 - edgeDistance / activationZone;
    const centerDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (centerDistance === 0) return "scale(1)";
    const normalizedX = deltaX / centerDistance;
    const normalizedY = deltaY / centerDistance;
    const stretchIntensity = Math.min(centerDistance / 300, 1) * elasticity * fadeInFactor;
    const scaleXVal = 1 + Math.abs(normalizedX) * stretchIntensity * 0.3 - Math.abs(normalizedY) * stretchIntensity * 0.15;
    const scaleYVal = 1 + Math.abs(normalizedY) * stretchIntensity * 0.3 - Math.abs(normalizedX) * stretchIntensity * 0.15;
    return `scaleX(${Math.max(0.8, scaleXVal)}) scaleY(${Math.max(0.8, scaleYVal)})`;
  }

  // --- Derived Styles for LiquidGlassInternal and Decorative Elements ---
  const elasticTranslation = $derived(calculateElasticTranslation());
  const directionalScale = $derived(calculateDirectionalScale());
  const currentTransformStyle = $derived(
    `translate(calc(-50% + ${elasticTranslation.x}px), calc(-50% + ${elasticTranslation.y}px)) ${isActive && onClick ? "scale(0.96)" : directionalScale}`
  );

  const internalContainerStyle = $derived({
    ...style, // User-provided base style object
    transform: currentTransformStyle,
    transition: "all ease-out 0.2s",
    position: style.position || "relative", // Default to relative if not specified
    top: style.top || "50%",
    left: style.left || "50%",
  });

  const decorativePositionStyles = $derived({
    position: internalContainerStyle.position,
    top: internalContainerStyle.top,
    left: internalContainerStyle.left,
    height: `${currentGlassSize.height}px`,
    width: `${currentGlassSize.width}px`,
    borderRadius: `${cornerRadius}px`,
    transform: currentTransformStyle,
    transition: internalContainerStyle.transition,
  });

  const decorativePositionStyleString = $derived(
    Object.entries(decorativePositionStyles).map(([k, v]) => `${k}:${v}`).join(';') + ';' // Ensure trailing semicolon
  );

  const borderBg1 = $derived(`linear-gradient(${135 + mouseOffset.x * 1.2}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.12 + Math.abs(mouseOffset.x)*0.008}) ${Math.max(10,33+mouseOffset.y*0.3)}%, rgba(255,255,255,${0.4 + Math.abs(mouseOffset.x)*0.012}) ${Math.min(90,66+mouseOffset.y*0.4)}%, rgba(255,255,255,0) 100%)`);
  const borderBg2 = $derived(`linear-gradient(${135 + mouseOffset.x * 1.2}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.32 + Math.abs(mouseOffset.x)*0.008}) ${Math.max(10,33+mouseOffset.y*0.3)}%, rgba(255,255,255,${0.6 + Math.abs(mouseOffset.x)*0.012}) ${Math.min(90,66+mouseOffset.y*0.4)}%, rgba(255,255,255,0) 100%)`);

  const hoverOpacity1 = $derived(isHovered || isActive ? 0.5 : 0);
  const hoverOpacity2 = $derived(isActive ? 0.5 : 0);
  const hoverOpacity3 = $derived(isHovered ? 0.4 : isActive ? 0.8 : 0);

</script>

<!-- Wrapper div to establish positioning context for all elements -->
<div style="position: relative; display: inline-block; line-height: 0;">
  <LiquidGlassInternal
    bind:element={internalElementRef}
    id={filterId}
    className={className}
    containerStyle={internalContainerStyle}
    displacementScale={overLight ? displacementScale * 0.5 : displacementScale}
    aberrationIntensity={aberrationIntensity}
    mode={mode}
    blurAmount={blurAmount}
    saturation={saturation}
    active={isActive}
    overLight={overLight}
    cornerRadius={cornerRadius}
    padding={padding}
    glassSize={currentGlassSize}
    onClick={onClick}
    onInternalMouseEnter={() => isHovered = true}
    onInternalMouseLeave={() => { isHovered = false; isActive = false; }}
    onInternalMouseDown={() => { if (onClick) isActive = true; }}
    onInternalMouseUp={() => { if (onClick) isActive = false; }}
  >
    <slot></slot> <!-- Pass down the slot -->
  </LiquidGlassInternal>

  <!-- Decorative Overlays, positioned relative to the main component via decorativePositionStyles -->
  {#if overLight}
    <div
      class="pointer-events-none"
      style="{decorativePositionStyleString}background-color: black; opacity: {isHovered || isActive ? 0.25 : 0.2}; transition: {decorativePositionStyles.transition}, opacity 0.2s ease-in-out;"
    ></div>
    <div
      class="pointer-events-none"
      style="{decorativePositionStyleString}mix-blend-mode: overlay; opacity: {isHovered || isActive ? 1.0 : 0.0}; transition: {decorativePositionStyles.transition}, opacity 0.2s ease-in-out;"
    ></div>
  {/if}

  <!-- Borders -->
  <span
    class="pointer-events-none"
    style="{decorativePositionStyleString}mix-blend-mode: screen; opacity: 0.2; padding: 1.5px;
           -webkit-mask-image: linear-gradient(black 0 0) content-box, linear-gradient(black 0 0);
           -webkit-mask-composite: xor; mask-composite: exclude;
           box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35);
           background-image: {borderBg1};"
  ></span>
  <span
    class="pointer-events-none"
    style="{decorativePositionStyleString}mix-blend-mode: overlay; padding: 1.5px;
           -webkit-mask-image: linear-gradient(black 0 0) content-box, linear-gradient(black 0 0);
           -webkit-mask-composite: xor; mask-composite: exclude;
           box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.5) inset, 0 1px 3px rgba(255, 255, 255, 0.25) inset, 0 1px 4px rgba(0, 0, 0, 0.35);
           background-image: {borderBg2};"
  ></span>

  <!-- Hover Effects -->
  {#if onClick}
    <div
      class="pointer-events-none"
      style="{decorativePositionStyleString}width: {currentGlassSize.width + 1}px;
             opacity: {hoverOpacity1};
             background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%);
             mix-blend-mode: overlay;"
    ></div>
    <div
      class="pointer-events-none"
      style="{decorativePositionStyleString}width: {currentGlassSize.width + 1}px;
             opacity: {hoverOpacity2};
             background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 80%);
             mix-blend-mode: overlay;"
    ></div>
    <div
      class="pointer-events-none"
      style="{decorativePositionStyleString}width: {currentGlassSize.width + 1}px;
             opacity: {hoverOpacity3};
             background-image: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
             mix-blend-mode: overlay;"
    ></div>
  {/if}

</div>

<style>
  .pointer-events-none {
    pointer-events: none;
  }
  /* The main wrapper div has inline styles. No other component-specific styles needed here. */
</style>
