# NexaSense Demo

Vercel-ready Next.js demo for an iPad-friendly care-home workflow presentation.

## What it does

- Runs fully client-side for a reliable meeting demo
- Simulates tap-triggered care-home scenarios
- Shows a live wing view, active alert panel, incident timeline, and manager summary
- Works well on iPad in landscape mode

## Scenarios included

- Resident fall detected
- Bed exit at night
- Long-lie / no recovery
- False alert dismissal
- Manager next-morning review

## Local run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy to Vercel

1. Put this folder in a Git repository.
2. Import the repo into Vercel.
3. Framework preset: **Next.js**.
4. Build command: `next build`
5. Output settings: default Next.js settings.

## iPad demo setup

Recommended:

1. Deploy to Vercel.
2. Open the site in Safari on iPad.
3. Use **Share → Add to Home Screen**.
4. Launch it from the Home Screen so it behaves like an app.
5. Enable **Guided Access** on iPad to lock the device to the demo during meetings.

## Notes

- This is a workflow demo, not a claim of validated autonomous clinical performance.
- Scenario playback is local and deterministic.
- You can hide or show scenario controls with the top-right button.
