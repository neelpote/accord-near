# Accord visual direction

Brief: combine the supplied robot/platform image with the supplied Axon-style motion reference, without copying their branding or embedding their media. Audience remains a NEAR application developer or maintainer. Primary action: open the application workspace; secondary action: inspect agent-service terms.

## Design decisions

- Ivory `#f3f3eb`, graphite `#272e29`, warm orange `#ef743e`, sage `#7d886e`, quiet dividers `#d9ddd1`. Orange carries the action/lighting accent; it is not a fabricated warning or success state.
- Self-hosted Sora for display type, Avenir/system sans for reading, system monospace for compact labels and evidence. Sora's font license ships alongside its local WOFF2.
- The page uses the video's restrained grid, large typography and animated diagrams. The right-hand hero stage uses the image's warm lighting and expressive robots. The product workspace stays calm and readable.
- Signature element: five original procedural Three.js robot models on a manufactured platform. Eyes blink, heads move, the selected specialist is highlighted and the platform responds subtly to the pointer. Roles are manually selectable with real buttons. They illustrate existing product roles, not five independent LLM processes or live completion telemetry.
- Scroll reveals, diagram pulses, restrained hover transforms and disclosure transitions use native CSS/IntersectionObserver. No scroll hijacking, autoplay audio or background video. Payment approval copy, prices, report provenance and wallet permissions are unchanged.

## Performance and access

Three.js is dynamically imported only by the decorative scene. No external models, textures, fonts, trackers or inspiration media are fetched at runtime. Pixel ratio is capped at 1.5, offscreen/hidden scenes stop rendering, and resources/observers are disposed on unmount. WebGL failure/context loss shows a static original SVG illustration and does not block the application.

A visible pause/resume control stops decorative animation. The OS reduced-motion preference disables animation and smooth scrolling; selection and product controls remain functional. The decorative canvas is hidden from assistive technology; specialist names/descriptions are real DOM text. Focus outlines, skip navigation, wrapping evidence and existing mobile controls remain available.

## Verification boundaries

Five presentation/browser checks cover selection, pause/resume, reduced motion, 320/390 px overflow, WebGL fallback, existing agent inputs and baseline/incident forms. Separate real-data browser and wallet/testnet checks verify that the redesigned interface still delivers the existing application flow. These are implementation checks, not customer preference validation or independent usability research. No benchmark score or production FPS guarantee is claimed.
