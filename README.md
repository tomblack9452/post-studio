# Post Studio

Local tool for drafting Instagram carousels for a creepy / unexplained / unknown page.

## Run

```bash
npm install
cp .env.example .env   # then add your keys
npm run dev            # http://localhost:5173
```

## Using your Claude Pro plan instead of the API

Pick **Claude Pro** in the provider menu next to Generate. Calls then go through the
Claude Code CLI on your machine and count against your Pro usage limits, not API credit.

One-time setup (sign in with the Claude account that has Pro):

```bash
claude auth login
```

In Claude Pro mode every current model is available (Fable needs usage credits on Pro), plus an
effort slider from faster (low) to smarter (max). Newer models may need `claude update` first.

Local only: the CLI isn't available on Vercel. Slower than the API, roughly 20 to 60 seconds per post.

## Slide text markup

Wrap words in `*asterisks*` to draw them in the accent colour.

## Look and feel

Open the **Design** tab in the editor (or click the colour dot in the header):

- **Post design** (per post), three independent picks. New posts use your last picks.
  - **Style** (layout): Classic, Poster, Framed, Polaroid, Lens
  - **Variation** (overlay and photo look): None, Clear, Case file, Camcorder, Ghost cam, Newspaper, Film strip
  - **Font**: Condensed, Typewriter, Pixel, Serif, Engraved, Handwritten, Clean

  All three live in `src/config/styles.js`; layouts and overlays are drawn in `src/render/slideRenderer.js`.
- **Colour scheme** (all posts): 8 presets, or tweak the four colours and save your own.
  Presets live in `src/config/themes.js`.

Canvas size, the default photo grade and word limits live in `src/config/brand.js`.
