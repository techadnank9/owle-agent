# iMessage YouTube Bot Design

**Date:** 2026-03-28

## Goal

Build a small macOS bot using `@photon-ai/imessage-kit` that watches inbound iMessages, extracts the first YouTube URL from a message, sends that URL to the configured `/process` API endpoint, and replies in the same conversation with the API response.

## Product Scope

The first version is intentionally narrow:

- Run locally on macOS.
- Watch inbound iMessage messages.
- Detect YouTube links in message text.
- POST the detected URL to the remote API as JSON.
- Send the API response back into the same chat on success.
- Send a short failure reply if the API call fails or returns unusable data.

Out of scope for v1:

- Multiple URL processing per message.
- Persistent job history or database storage.
- Web UI or dashboard.
- Rich message formatting beyond plain-text replies.
- Deployment to a remote server.

## Architecture

The app will be a small Node.js + TypeScript project with a few focused modules:

- `src/index.ts`
  Starts the SDK, loads environment variables, registers watcher callbacks, and coordinates shutdown.
- `src/extractYoutubeUrl.ts`
  Detects and returns the first YouTube URL from an inbound message body.
- `src/processVideo.ts`
  Sends `POST` requests to the configured `/process` endpoint with `{ youtubeUrl }`.
- `src/formatResponse.ts`
  Converts API responses into reply-safe text for iMessage.
- `src/handleMessage.ts`
  Contains the orchestration logic for one inbound message: parse, call API, format result, and reply.

## Data Flow

1. A new inbound iMessage arrives.
2. `imessage-kit` watcher emits a message callback.
3. The handler ignores messages without text or without a YouTube URL.
4. The first YouTube URL is extracted from the message body.
5. The app sends:

```json
{ "youtubeUrl": "<detected url>" }
```

to the configured endpoint.

6. If the API returns success, the app formats the response body into a plain-text iMessage reply.
7. The bot sends the reply to the same `chatId`.
8. If an error occurs, the bot sends a short failure message back to the same chat.

## API Expectations

The endpoint is:

- `POST https://unmythological-addyson-follicular.ngrok-free.dev/process`

The app will support these response shapes:

- Plain text response body: send as-is.
- JSON with common text-like fields such as `message`, `result`, `response`, `summary`, or `text`: send the first useful value found.
- JSON without a clear text field: stringify in a compact, readable form.

This keeps the bot resilient even if the API contract shifts slightly.

## Error Handling

The app should fail gently:

- Ignore messages that do not contain a YouTube URL.
- Catch network and parsing failures around the API request.
- Reply with a short error message instead of throwing and stopping the watcher.
- Avoid empty replies if the API returns no usable content.
- Log failures to the console for local debugging.

## Loop Prevention

The watcher will rely on the SDK default of excluding the bot's own messages. The handler will also defensively skip messages that have no sender metadata or no usable chat target if needed.

## Configuration

The app will use environment variables:

- `PROCESS_API_URL`
  Defaults to the provided ngrok endpoint for convenience.

Optional future variables can be added later, but v1 should stay minimal.

## Testing Strategy

The project will use lightweight unit tests for:

- YouTube URL extraction.
- API response formatting.
- Message handling orchestration with mocked dependencies.

The app will also support a manual end-to-end verification path on macOS:

- Grant Full Disk Access to the terminal or editor.
- Start the watcher locally.
- Send an iMessage containing a YouTube URL.
- Confirm the bot posts the URL to the API and replies with the API response.

## Delivery Shape

The finished project should include:

- TypeScript source files.
- A `package.json` with `dev`, `build`, `start`, and `test` scripts.
- A `.env.example` file.
- A README with setup instructions and macOS permission notes.
