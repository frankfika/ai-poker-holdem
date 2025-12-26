# Texas Hold'em Poker with AI

An 8-player Texas Hold'em poker game with AI opponents powered by DeepSeek-V3 via Silicon Flow.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Set your Silicon Flow API key in `.env.local`:
   ```
   SILICONFLOW_API_KEY=sk-your-key-here
   ```
   Get your key at: https://cloud.siliconflow.cn/

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Features

- 8-player poker table (1 human + 7 AI bots)
- AI decisions powered by DeepSeek-V3
- Full Texas Hold'em rules with blinds, betting rounds, and showdown
- Responsive design with fullscreen support
- Fallback AI when API is unavailable
