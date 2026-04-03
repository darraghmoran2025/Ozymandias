# Ozymandias

An interactive poetry experience for *Ozymandias* by Percy Bysshe Shelley (1818).

## Features

- Lines of the poem are revealed one by one, as if uncovered from sand
- The boast inscription pulses bright before settling, the aftermath lines fade in quietly
- Click any word to scatter its letters — they drift apart and slowly reassemble, decayed
- Mouse repels the poem lines as you move across the page
- Click the moon to toggle between night and day
- **Night:** deep cosmic sky, nebula blobs, star field, animated pharaoh with blinking square eyes — click his eyes to make them wince
- **Day:** Egyptian desert, pyramid, blowing sand particles and dust devils, a tumbleweed that rolls across once and flees the cursor — switches back to night and returns to day to send it rolling again

## Stack

Vanilla JS + CSS, no framework. Uses [`@chenglou/pretext`](https://github.com/chenglou/pretext) for pixel-perfect text layout and line positioning without DOM reflow.

## Run locally

```bash
npx serve .
```

Then open `http://localhost:3000`.
