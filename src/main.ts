import InteractiveGlass from './InteractiveGlass.svelte';

// Example of how to use the component.
// This would typically target an element in an HTML file.
// For instance, if you have an index.html with <div id="app"></div>:
const targetElement = document.getElementById('app');

let app;

if (targetElement) {
  // Clean out any previous content from the target element
  targetElement.innerHTML = '';

  app = new InteractiveGlass({
    target: targetElement,
    props: {
      // You can pass any props that InteractiveGlass.svelte accepts here.
      // For example:
      // displacementScale: 80,
      // elasticity: 0.2,
      // overLight: true,
      // style: { position: 'absolute', top: '50%', left: '50%' }, // Example style
      onClick: () => { console.log('Svelte Glass Clicked!'); }
    }
  });

  // To demonstrate content projection (slots)
  const demoContent = document.createElement('span');
  demoContent.textContent = 'Hello from Svelte!';
  demoContent.style.color = 'white'; // Ensure it's visible on dark glass

  // Svelte components don't directly accept children like React for slots from imperative code.
  // To set slotted content when instantiating from JS, you'd typically handle it
  // within the Svelte component's structure or pass data that it uses to render a slot.
  // However, if InteractiveGlass.svelte has a <slot></slot>,
  // and it's mounted, content can be projected if it's used declaratively.
  // For imperative instantiation like this, if we want to put something inside the slot,
  // it's often easier to modify the props or have a dedicated prop for simple text content.

  // For now, we'll just log that a slot could be used.
  // Actually, let's try to append to the target element, after the Svelte component,
  // or find a way to project content if the component structure allows for it.
  // The <slot> in InteractiveGlass is passed to LiquidGlass, which also has a <slot>.
  // We can append content to the target element, and it will be placed inside the slot.
  if (app && app.$$.slots.default) { // Check if default slot exists
    targetElement.appendChild(demoContent);
  } else {
     // Fallback or alternative way if direct slot manipulation isn't straightforward
     // For this example, we'll assume the slot in InteractiveGlass will pick up direct children.
     // Svelte's default slot behavior means children of the component instance in the DOM get slotted.
     targetElement.appendChild(demoContent);
     console.log("Demo content appended to target. It should appear in InteractiveGlass's slot.");
  }

} else {
  console.error("Target element #app not found in the DOM.");
}

export default app; // Optional: export the app instance
