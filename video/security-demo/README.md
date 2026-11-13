# The signature that never happened

Editable HyperFrames source for the 80-second Accord security film. Output: 1920×1080, 30 fps, H.264/AAC MP4. [Finished film](../../docs/demo/accord-security-demo.mp4), [source evidence](../../docs/SECURITY_WALKTHROUGH.md).

One scene per HTML subcomposition. All text, camera crops, timing, audio clips and automation are authored in readable source. The source is pinned to HyperFrames 0.9.41. GSAP's bundled header preserves its license notice. Browser footage symlinks resolve to the committed originals under `docs/demo/`; the hero excerpt reuses the unchanged November 11 product capture. Native raw capture is 800×450; Ethereum raw is 1920×1080. Enlarged native footage cannot recover missing source detail.

The fully provisioned editing project on the creator's computer is `/Users/neelsubhashpote/Desktop/near/accord-near/.tools/accord-security-film/`. Its retrieved free catalog soundtrack remains there. Audio binaries are deliberately not redistributed as standalone stock assets. `AUDIO_PROVENANCE.json` records provider, track IDs and retrieval descriptions; no credentials or signed download URLs are included. To reproduce the exact mix, obtain the matching tracks through the authenticated HyperFrames/HeyGen media workflow under the applicable catalog terms, or copy the locally provisioned `assets/audio/` folder if you are authorized to reuse those files.

```sh
cd video/security-demo
# Populate assets/audio/bgm/bgm_001.wav and sfx/sfx_001.mp3 through sfx_003.mp3 first.
npm run check
npx hyperframes@0.9.41 preview --background
npm run render -- --quality delivery --fps 30 -o renders/master.mp4
```

The delivery export uses two-pass FFmpeg loudness normalization to -15 LUFS with a -1.5 dBTP ceiling after the HyperFrames render, preserving the encoded video stream. The measured final levels and visual caveats are in [REVIEW.md](REVIEW.md).

No generated voices, generated avatar footage or invented application screens were used. Music and three short effects were retrieved from the free authenticated catalog, without paid generation or top-up. The robot appears in actual Accord browser footage; its original asset notice remains in `frontend/public/models/README.md`.
