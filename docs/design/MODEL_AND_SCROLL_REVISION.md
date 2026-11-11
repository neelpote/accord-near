# Revision after visual feedback

The first procedural five-robot scene and repeating cards did not meet the user's direction. This revision replaces them rather than adding more decorative effects.

## Asset research

- Selected: Robot Expressive by Tomás Laulhé (Quaternius), glTF modifications by Don McCurdy. The [official Three.js example](https://threejs.org/examples/webgl_animation_skinning_morph.html) credits the artist and CC0; the [creator's pack](https://quaternius.com/packs/animatedrobot.html) independently lists CC0. The pinned r187 GLB is 463,988 bytes and includes 14 authored animation clips. Source/hash and modifications are recorded in frontend/public/models/README.md. Only the restrained idle clip is used; the original binary is unchanged, with material colors adjusted at runtime.
- Considered: [Kenney Animated Characters Protagonists](https://kenney.nl/assets/animated-characters-protagonists), CC0. Primarily human/cyborg characters; less relevant to the reference's robot subject.
- Considered: Sketchfab's downloadable robot catalog. License/attribution vary by model, and the [official download API](https://sketchfab.com/developers/download-api/guidelines) requires authentication. No login or download restriction was bypassed. The selected creator-distributed asset needs no account, conversion service or purchase.

## Design changes

One detailed artist-made character, a full-height editorial composition and a native-scroll inspection sequence replace the boxed robot gallery. Observe → Inspect → Limit are real product steps, not invented dashboard activity. Scroll position changes camera angle, draws the evidence path and reveals the bounded-authority plane. Wheel/touch scrolling stays native; header/primary links skip directly to the application. The service directory uses rows and explicit terms instead of repeated avatar cards.

The page uses neutral paper/graphite, restrained orange and direct typography. No fake job counts, incident timestamps or live AI claims are added. The character and diagram are labeled illustrative; operational state remains in the real workspace/reports. Artist credit appears in the footer and the repository.

Motion pause and reduced-motion remain supported. Reduced-motion users can select the workflow chapters without camera motion; no chapter content is removed. The canvas follows its container in CSS while drawing-buffer resizing happens separately, preventing transient mobile overflow. Model/context failures fall back to a static illustration. Character resources, mixer, observers and renderer are disposed on unmount.

Selecting a paid offer now scrolls to its actual terms form. This responds to an explicit user action and does not auto-approve, sign or purchase anything. Billing/authentication/contract code is unchanged.

## Verification

See the revision's evidence and verification appendices for executed results. Aesthetic quality remains subject to the user's review; implementation checks are not independent usability research or a claim that the design will win a competition.
