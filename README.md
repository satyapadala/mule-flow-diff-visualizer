# MuleFlow Diff Visualizer

Chrome extension for reviewing MuleSoft XML changes on GitHub pull requests and direct XML file views.

It turns Mule XML into a visual flow graph, highlights changed nodes, and now includes an AI reviewer chat that can answer questions using:
- old XML
- new XML
- parsed flow diff summary

## What It Does

- Adds a `Visual Flow` button on GitHub PR XML diffs
- Renders Mule flows as an interactive graph
- Shows added, modified, and removed nodes
- Supports `flow-ref` expansion in the visual graph
- Includes an AI chat panel inside the visual flow view
- Lets users configure their own LLM endpoint, model, API key, and system prompt
- Supports direct XML viewing from GitHub and Sourcegraph

## AI Reviewer

When a user opens `Visual Flow`, they can also open `AI Chat`.

The AI request includes:
- file path
- old XML
- new XML
- parsed graph diff summary
- the user’s question

The extension expects an OpenAI-compatible `chat/completions` endpoint.

Example Gemini-compatible endpoint:

```text
https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

## Project Structure

```text
src/
  background.ts
  content.ts
  parser.ts
  popup.ts
  options.ts
  llm.ts
  components/
  utils/
manifest.json
popup.html
options.html
index.html
```

## Local Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
make lint
npm run build
```

## Load In Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable `Developer mode`
4. Click `Load unpacked`
5. Select this project folder

Chrome will load the built extension assets from `dist/`.

## Configure AI

1. Open the extension popup
2. Click `AI Settings`
3. Enter:
   - endpoint
   - model
   - API key
   - optional system prompt

The settings are stored in `chrome.storage.local`.

## Current Assumptions

- AI integration currently targets OpenAI-style chat APIs
- The extension primarily targets GitHub PR review workflows
- Mule XML parsing is optimized for reviewer context, not full Mule runtime validation

## Known Notes

- `content.js` is fairly large after bundling UI and markdown rendering
- Some Mule XML shapes may still require parser refinement as more real-world files are tested

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
