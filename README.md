# Ember Spice Co. · Landing page

Bold packaging-style landing page for a tikka masala simmer sauce. Plain HTML/CSS/JS, no build step.

## Techniques
- `background-clip: text` + `linear-gradient` for the gold headlines
- `repeating-linear-gradient` for the dotted dividers
- `border-radius: 999px` pill buttons
- `z-index` so the jar sits in front of the headline
- `position: sticky` hero with a scroll-driven canvas frame sequence (53 frames) for the jar rotation
- Self-hosted fonts (Anton, DM Sans, DM Mono)

## Run
Open `index.html`, or `npx serve .`

## Deploy
Drag the folder onto Netlify, or connect this repo. `netlify.toml` sets long cache headers on `/assets`.
