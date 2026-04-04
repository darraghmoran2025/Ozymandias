# Ozymandias

An interactive poetry experience for *Ozymandias* by Percy Bysshe Shelley (1818).

---

## The Main Page

### Poem reveal
Lines appear one by one, staggered, as if surfacing from sand. The boast inscription — *"My name is Ozymandias, King of Kings"* — arrives with a brief white flash before settling. The aftermath lines (*"Nothing beside remains…"*) fade in quietly and are rendered in a dimmer tone.

### Mouse repel
Move the cursor across the page and the poem lines push away from it, bending out of the path of your hand.

### Word scatter
Click any word and its letters explode outward — each letter launched at a different velocity, spinning and fading. After a few seconds the word reforms, but decayed: slightly blurred and hushed, as if worn by time.

### Day / Night toggle
Click the moon (top right) to toggle between night and day. The transition is not a clean cut — the poem lines are caught by a wind that breaks them into particles and blows them off screen (powered by Matter.js physics). Once they've gone, the sky shifts and the poem is revealed again from the beginning, with a full fresh stagger as if you've just arrived.

**Night sky** — Deep cosmic blue, animated nebula glow blobs, 320 twinkling stars, and a softly pulsing moon. A pharaoh face floats in the upper-right corner drawn in dark blue tones. His square eyes blink on a slow, natural interval and occasionally wink — one eye closing a beat before the other. Click either eye to make him wince.

**Day sky** — The sky becomes an Egyptian desert. A pyramid sits in the distance with warm light/shadow faces and faint horizontal stone-course lines. The desert floor has 220 sand particles drifting rightward in height-stratified bands, and three dust-devil swirlers that rise and dissipate on their own cycles. A tumbleweed rolls across the screen once per day cycle — it bounces slightly as it rolls, kicks up a dust trail, and shies away from the cursor. When it reaches the far edge it stops; switching back to night and then day sends it rolling again from the start.

### Hidden interactions

| Element | Interaction |
|---------|-------------|
| **OZYMANDIAS** (title) | Click → opens the crumbling pillar page |
| **1818** (year in attribution) | Click → the digits scramble character by character into Roman numerals: **MDCCCXVIII**. Click again to watch them convert back. |

---

## The Pillar Page

Reached by clicking the title. A stone pillar stands alone against the night sky, the boast carved into its face:

```
MY NAME IS
OZYMANDIAS,
KING OF KINGS;
LOOK ON MY WORKS,
YE MIGHTY,
AND DESPAIR!
```

### Animation sequence

| Phase | When | What happens |
|-------|------|--------------|
| **Arrive** | 0 – 1.5 s | Pillar fades in out of a dust haze |
| **Still** | 1.5 – 3.5 s | Ambient particles drift; a faint tremor begins |
| **Crack** | ~4 s | Six crack lines grow across the shaft face |
| **Crumble** | ~10 s | Chunks break away top-to-bottom, each with its own trajectory, rotation, and gravity |
| **Collapse** | ~16 s | A dust burst erupts from the base; a fast horizontal gust sweeps the screen |
| **Settle** | ~19 s | Rubble settles; the aftermath lines of the poem appear one by one |
| **Reset** | ~28 s | Fades out and loops |

The pillar is built from rectangular chunks (capital, 12 shaft courses split asymmetrically, base). Each chunk carries procedural stone texture — a colour gradient and small noise lines — and any chunk that contains inscription text renders the carved letters as it falls.

Click the moon to return to the main page at any point.

---

## Stack

Vanilla JS + CSS, no framework. Uses [`@chenglou/pretext`](https://github.com/chenglou/pretext) for pixel-perfect text layout and line positioning without DOM reflow. The day/night blowaway uses [Matter.js](https://brm.io/matter-js/) for particle physics.

## Run locally

```bash
npx serve .
```

Then open `http://localhost:3000`.
