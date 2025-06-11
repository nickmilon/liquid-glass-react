import LiquidGlass from './LiquidGlass.svelte'; // Our main Svelte 5 component

const targetElement = document.getElementById('app');

let app;

if (targetElement) {
  // Optional: Clear previous content if any (e.g., during HMR)
  // targetElement.innerHTML = '';

  app = new LiquidGlass({
    target: targetElement,
    props: {
      // Example props to demonstrate the component:
      elasticity: 0.1,
      displacementScale: 60,
      blurAmount: 0.07,
      onClick: () => {
        console.log('Svelte 5 LiquidGlass component clicked!');
      },
      // style: { transform: 'scale(0.8)' } // Example of passing base style
    }
  });

  // Example of adding content to the default slot:
  // Svelte will project child elements of the target into the default slot.
  const content = document.createElement('span');
  content.textContent = 'Hello Svelte 5!';
  content.style.color = 'white';
  content.style.fontSize = '18px';
  content.style.fontWeight = 'bold';
  targetElement.appendChild(content);

} else {
  console.error("Target element #app not found. Please ensure your HTML has <div id='app'></div>.");
}

export default app; // Exporting the app instance can be useful for HMR or debugging
