# xm-engage-bot

A lightweight test UI for a guided, friendly intake chatbot that calls an AWS API Gateway + Lambda backend (OpenRouter integration).

## Features
- React + Vite + React ChatBotify
- Guided, one-question-at-a-time flow
- Netlify function proxy (optional)
- Config via environment variables

## Getting Started (Local)
```bash
npm install
npm run dev
```
Set API endpoint and key in the top bar input fields during local testing, or use env vars below.

## Build
```bash
npm run build
```
Build output will be in `dist/`.

## Environment Variables
Copy `.env.example` to `.env` and set values:

- `VITE_API_URL` - API endpoint for POST requests. For Netlify, keep `/api/chat`. For direct API Gateway testing, set full URL.
- `VITE_API_KEY` - Optional. API key for direct calls to API Gateway. Not required when using Netlify proxy.

## Netlify
- A Netlify Function is provided at `netlify/functions/chat.js`.
- Set in Netlify site settings (Environment Variables):
  - `API_GATEWAY_URL` - Your API Gateway invoke URL
  - `API_GATEWAY_KEY` - Your API key

## Security Note
Do not commit `.env` or any secrets. This repo includes `.env.example` only.
