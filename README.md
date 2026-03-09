# SoulChat — AI Voice Characters

Talk to AI anime characters using your voice. A PWA optimized for iPhone.

**Live demo:** [abyzanna.github.io/soulchat-ai](https://abyzanna.github.io/soulchat-ai/)

## Characters

| Character | Personality | Mode |
|-----------|------------|------|
| **Kuro** — The Shadow | Dangerous, mysterious, protective. Dark humor, short sharp sentences. | Chat + Call |
| **Yuki** — The Crimson Night | Cheerful vampire girl. Playful, chaotic, sweet with a dark edge. | Chat + Call |
| **Aria** — Your Safe Space | Mental health support. Warm, empathetic, therapeutic. No flirting. | Call (default) |

## Features

- **Voice chat** — Tap the mic to speak, characters respond with voice
- **Call mode** — Full phone call experience with auto-listen loop
- **Natural speech** — Sentence-by-sentence TTS with emotional pitch/rate modulation
- **ElevenLabs** — Optional ultra-realistic human voice (free tier: 10k chars/month)
- **Mental health support** — Aria uses therapeutic techniques: grounding, breathing, validation
- **Crisis safety** — Detects crisis language and provides 988 Lifeline info
- **PWA** — Add to iPhone home screen, works offline
- **No backend** — 100% client-side, zero dependencies

## Project Structure

```
soulchat-ai/
├── docs/              # Deployment-ready files (served by GitHub Pages)
│   ├── index.html       # Main HTML
│   ├── css/style.css    # Styles
│   ├── js/              # Built JS (copied from src/)
│   ├── img/             # Icons and character images
│   ├── manifest.json    # PWA manifest
│   └── sw.js            # Service worker
├── src/                 # Source code
│   ├── ai-engine.js     # Character AI + topic detection + API integration
│   ├── voice-engine.js  # TTS: ElevenLabs + enhanced Web Speech
│   └── app.js           # Main app: screens, chat, call mode, settings
├── scripts/
│   ├── build.js         # Copies src/ → docs/js/
│   └── dev.js           # Dev server with file watching
├── package.json
└── README.md
```

## Quick Start

```bash
git clone https://github.com/AbyzAnna/soulchat-ai.git
cd soulchat-ai
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Add Character Images

Drop your images into `docs/img/`:
- `docs/img/kuro.jpg`
- `docs/img/yuki.jpg`
- `docs/img/aria.jpg`

## Enable Real AI (Optional)

The built-in AI engine works instantly with no setup. For LLM-powered responses:

1. Get a free API key from [Groq](https://console.groq.com) or [OpenRouter](https://openrouter.ai)
2. In the app, tap Settings → select provider → paste key → Save

## Enable Realistic Voice (Optional)

1. Sign up at [elevenlabs.io](https://elevenlabs.io) (free, 30 seconds)
2. Copy your API key
3. In Settings → Voice Engine → ElevenLabs → paste key → Save

## Build

```bash
npm run build    # Copy src/ → docs/js/
npm run dev      # Dev server with auto-rebuild
npm run preview  # Serve docs/ with npx serve
```

## Deploy

GitHub Pages serves from `docs/`. To deploy:

```bash
npm run build
git add -A && git commit -m "Deploy"
git push
```

## License

MIT
