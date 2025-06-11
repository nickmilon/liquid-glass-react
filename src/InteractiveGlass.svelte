<script lang="ts">
  // Svelte 5 Runes are auto-imported or global in .svelte files.
  import LiquidGlass from './LiquidGlass.svelte'; // This is the already refactored child

  // --- Props ---
  export let displacementScale: number = 70;
  export let blurAmount: number = 0.0625;
  export let saturation: number = 140;
  export let aberrationIntensity: number = 2;
  export let elasticity: number = 0.15;
  export let cornerRadius: number = 999;
  export let globalMousePosExternal: { x: number; y: number } | null = null;
  export let mouseOffsetExternal: { x: number; y: number } | null = null;
  export let mouseContainer: HTMLElement | null = null;
  export let className: string = "";
  export let padding: string = "24px 32px";
  export let overLight: boolean = false;
  export let style: Record<string, string | number> = {}; // User-provided base style
  export let mode: "standard" | "polar" = "standard";
  export let onClick: (() => void) | null = null;
  export let id: string = "interactive-glass-filter-" + Math.random().toString(36).substr(2, 9);

  // --- State ($state) ---
  let glassRefElement = $state<HTMLDivElement | null>(null);
  let isHovered = $state(false);
  let isActive = $state(false);
  let glassSize = $state({ width: 270, height: 69 });
  let internalGlobalMousePos = $state({ x: 0, y: 0 });
  let internalMouseOffset = $state({ x: 0, y: 0 });

  // --- Helper Functions (modify $state variables) ---
  function updateGlassSize() {
    if (glassRefElement) {
      const rect = glassRefElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        glassSize.width = rect.width;
        glassSize.height = rect.height;
      }
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const container = mouseContainer || glassRefElement;
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

  $effect(() => {
    if (typeof window === 'undefined') return;

    updateGlassSize();
    // Ensuring updateGlassSize is called after the DOM has potentially stabilized
    const rafId = requestAnimationFrame(updateGlassSize);

    window.addEventListener("resize", updateGlassSize);

    return () => {
      window.removeEventListener("resize", updateGlassSize);
      cancelAnimationFrame(rafId);
    };
  });

  $effect(() => {
    if (typeof window === 'undefined') return;

    // Rerun this effect if mouseContainer or glassRefElement changes,
    // or if external tracking status changes.
    const currentTarget = mouseContainer || glassRefElement;
    const useExternalTracking = globalMousePosExternal !== null || mouseOffsetExternal !== null;

    let actualListenerTarget: HTMLElement | null = null;

    if (!useExternalTracking && currentTarget) {
      currentTarget.addEventListener('mousemove', handleMouseMove);
      actualListenerTarget = currentTarget;
    }

    return () => {
      if (actualListenerTarget) {
        actualListenerTarget.removeEventListener('mousemove', handleMouseMove);
      }
    };
  });

  // This effect ensures that if glassRefElement itself is updated (e.g. by bind:this),
  // we attempt to update the size.
  $effect(() => {
    if (typeof window !== 'undefined' && glassRefElement) {
      updateGlassSize();
    }
  });

  // --- Derived State ($derived) ---
  const globalMousePos = $derived(globalMousePosExternal || internalGlobalMousePos);
  const mouseOffset = $derived(mouseOffsetExternal || internalMouseOffset);

  // --- Calculation Functions (called by $derived signals) ---
  // These functions now read $state and props directly, and $derived signals will update if those change.
  function calculateFadeInFactor(): number {
    if (!globalMousePos.x || !globalMousePos.y || !glassRefElement) return 0;
    const rect = glassRefElement.getBoundingClientRect();
    const pillWidth = glassSize.width;
    const pillHeight = glassSize.height;

    const edgeDistanceX = Math.max(0, Math.abs(globalMousePos.x - (rect.left + pillWidth / 2)) - pillWidth / 2);
    const edgeDistanceY = Math.max(0, Math.abs(globalMousePos.y - (rect.top + pillHeight / 2)) - pillHeight / 2);
    const edgeDistance = Math.sqrt(edgeDistanceX * edgeDistanceX + edgeDistanceY * edgeDistanceY);
    const activationZone = 200;
    return edgeDistance > activationZone ? 0 : 1 - edgeDistance / activationZone;
  }

  function calculateElasticTranslation(): { x: number; y: number } {
    if (!glassRefElement) return { x: 0, y: 0 };
    const fadeInFactor = calculateFadeInFactor();
    const rect = glassRefElement.getBoundingClientRect();
    return {
      x: (globalMousePos.x - (rect.left + glassSize.width / 2)) * elasticity * 0.1 * fadeInFactor,
      y: (globalMousePos.y - (rect.top + glassSize.height / 2)) * elasticity * 0.1 * fadeInFactor,
    };
  }

  function calculateDirectionalScale(): string {
    if (!globalMousePos.x || !globalMousePos.y || !glassRefElement) return "scale(1)";
    const rect = glassRefElement.getBoundingClientRect();
    const pillWidth = glassSize.width;
    const pillHeight = glassSize.height;
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
    const scaleX_val = 1 + Math.abs(normalizedX) * stretchIntensity * 0.3 - Math.abs(normalizedY) * stretchIntensity * 0.15;
    const scaleY_val = 1 + Math.abs(normalizedY) * stretchIntensity * 0.3 - Math.abs(normalizedX) * stretchIntensity * 0.15;

    return `scaleX(${Math.max(0.8, scaleX_val)}) scaleY(${Math.max(0.8, scaleY_val)})`;
  }

  // --- Reactive Styles ($derived) ---
  const elasticTranslation = $derived(calculateElasticTranslation());
  const directionalScale = $derived(calculateDirectionalScale());

  const transformStyleValue = $derived(
    `translate(calc(-50% + ${elasticTranslation.x}px), calc(-50% + ${elasticTranslation.y}px)) ${isActive && onClick ? "scale(0.96)" : directionalScale}`
  );

  const baseStyleObject = $derived({
    ...style,
    transform: transformStyleValue,
    transition: "all ease-out 0.2s",
    position: style.position || "relative",
    top: style.top || "50%",
    left: style.left || "50%",
  });

  const positionStyles = $derived({
    position: baseStyleObject.position,
    top: baseStyleObject.top,
    left: baseStyleObject.left,
    height: `${glassSize.height}px`,
    width: `${glassSize.width}px`,
    borderRadius: `${cornerRadius}px`,
    transform: transformStyleValue,
    transition: baseStyleObject.transition,
  });

  const positionStyleString = $derived(
    `position: ${positionStyles.position}; top: ${positionStyles.top}; left: ${positionStyles.left}; height: ${positionStyles.height}; width: ${positionStyles.width}; border-radius: ${positionStyles.borderRadius}; transform: ${positionStyles.transform}; transition: ${positionStyles.transition};`
  );

  const borderBg1 = $derived(
    `linear-gradient(${135 + mouseOffset.x * 1.2}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.12 + Math.abs(mouseOffset.x)*0.008}) ${Math.max(10,33+mouseOffset.y*0.3)}%, rgba(255,255,255,${0.4 + Math.abs(mouseOffset.x)*0.012}) ${Math.min(90,66+mouseOffset.y*0.4)}%, rgba(255,255,255,0) 100%)`
  );
  const borderBg2 = $derived(
    `linear-gradient(${135 + mouseOffset.x * 0.5}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${0.05 + Math.abs(mouseOffset.x)*0.002}) ${Math.max(25,40+mouseOffset.y*0.2)}%, rgba(255,255,255,${0.1 + Math.abs(mouseOffset.x)*0.003}) ${Math.min(75,60+mouseOffset.y*0.2)}%, rgba(255,255,255,0) 100%)`
  );
   const borderBg3 = $derived(
    `linear-gradient(${135 + mouseOffset.x * 0.2}deg, rgba(0,0,0,0) 0%, rgba(0,0,0,${0.1 + Math.abs(mouseOffset.x)*0.005}) ${Math.max(35,45+mouseOffset.y*0.1)}%, rgba(0,0,0,${0.2 + Math.abs(mouseOffset.x)*0.008}) ${Math.min(65,55+mouseOffset.y*0.1)}%, rgba(0,0,0,0) 100%)`
  );

  const hoverEffectOpacity1 = $derived(isHovered || isActive ? 0.5 : 0);
  const hoverEffectOpacity2 = $derived(isActive ? 0.5 : 0);
  const hoverEffectOpacity3 = $derived(isHovered ? 0.4 : isActive ? 0.8 : 0);

</script>

<div style="position: relative; display: inline-block;">
  <LiquidGlass
    bind:element={glassRefElement}
    id={id}
    className={className}
    containerStyle={baseStyleObject}
    cornerRadius={cornerRadius}
    displacementScale={overLight ? displacementScale * 0.5 : displacementScale}
    blurAmount={blurAmount}
    saturation={saturation}
    aberrationIntensity={aberrationIntensity}
    glassSize={glassSize}
    padding={padding}
    active={isActive}
    overLight={overLight}
    mode={mode}
    onClick={onClick}
    onGlassMouseEnter={() => isHovered = true}
    onGlassMouseLeave={() => { isHovered = false; isActive = false; }}
    onGlassMouseDown={() => { if(onClick) isActive = true; }}
    onGlassMouseUp={() => { if(onClick) isActive = false; }}
  >
    <slot></slot>
  </LiquidGlass>

  {#if overLight}
    <div
      class="pointer-events-none"
      style="{positionStyleString} background-color: black; opacity: {isHovered || isActive ? 0.25 : 0.2}; transition: {positionStyles.transition}, opacity 0.2s ease-in-out;"
    ></div>
  {/if}

  <div
    class="pointer-events-none"
    style="{positionStyleString} mix-blend-mode: overlay; opacity: {overLight ? 0.3 : 0.15}; background-image: {borderBg3};"
  ></div>

  {#if !overLight}
    <span
      class="pointer-events-none"
      style="{positionStyleString} mix-blend-mode: screen; opacity: 0.2; padding: 1.5px; background-image: {borderBg1};"
    ></span>
    <span
      class="pointer-events-none"
      style="{positionStyleString} mix-blend-mode: screen; opacity: 0.2; padding: 3px; background-image: {borderBg2};"
    ></span>
  {/if}

  {#if overLight}
    <span
      class="pointer-events-none"
      style="{positionStyleString} mix-blend-mode: screen; opacity: {0.15 + Math.abs(mouseOffset.x) * 0.001}; padding: 1.5px; background-image: {borderBg1};"
    ></span>
    <span
      class="pointer-events-none"
      style="{positionStyleString} mix-blend-mode: multiply; opacity: 0.3; padding: 1.5px; background-image: {borderBg3};"
    ></span>
  {/if}

  <div
    class="pointer-events-none"
    style="{positionStyleString} background: radial-gradient(circle at {50 + mouseOffset.x * 0.2}% {50 + mouseOffset.y * 0.3}%, rgba(200,200,255,{hoverEffectOpacity1 * (overLight ? 0.1 : 0.3)}) 0%, rgba(200,200,255,0) 60%); opacity: {hoverEffectOpacity1}; mix-blend-mode: {overLight ? 'soft-light': 'screen'}; transition: {positionStyles.transition}, opacity 0.3s ease-in-out;"
  ></div>
  <div
    class="pointer-events-none"
    style="{positionStyleString} background: radial-gradient(circle at {50 + mouseOffset.x * 0.1}% {50 + mouseOffset.y * 0.1}%, rgba(255,0,255,{hoverEffectOpacity2 * (overLight ? 0.05 : 0.15)}) 0%, rgba(255,0,255,0) 60%); opacity: {hoverEffectOpacity2}; mix-blend-mode: {overLight ? 'soft-light': 'screen'}; transition: {positionStyles.transition}, opacity 0.4s ease-in-out;"
  ></div>
  <div
    class="pointer-events-none"
    style="{positionStyleString} background: radial-gradient(circle at {50 - mouseOffset.x * 0.3}% {50 - mouseOffset.y * 0.2}%, rgba(0,255,255,{hoverEffectOpacity3 * (overLight ? 0.1 : 0.2)}) 0%, rgba(0,255,255,0) 60%); opacity: {hoverEffectOpacity3}; mix-blend-mode: {overLight ? 'soft-light': 'screen'}; transition: {positionStyles.transition}, opacity 0.5s ease-in-out;"
  ></div>

</div>

<style>
  .pointer-events-none {
    pointer-events: none;
  }
</style>
