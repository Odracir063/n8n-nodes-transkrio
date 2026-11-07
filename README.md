# n8n-nodes-transkrio

[n8n](https://n8n.io) community node for [Transkrio](https://transkrio.com): transcripts of YouTube and
TikTok videos, Instagram Reels and podcast episodes (RSS feeds, Apple Podcasts links, audio file URLs),
metadata, and playlist, channel or podcast episode listings. Failed requests are free, and you get
100 free credits to start.

It can also be used as a tool by n8n's AI Agent node.

## Install

In n8n: **Settings → Community Nodes → Install**, then enter `n8n-nodes-transkrio`.

## Credentials

Get a free API key at [transkrio.com](https://transkrio.com/#signup) and create a
**Transkrio API** credential with it. n8n checks the key against `/v1/usage`.

## Operations

| Resource | Operation                                                                                                       | Cost                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Video    | Get Transcript: full `text` plus timestamped `segments`, optional language. Waits for long audio (up to 15 min) | 1 credit with captions; 1 per minute of transcribed audio |
| Video    | Get Many Transcripts: up to 50 URLs, one output item per video with `ok` and the transcript or an `error`       | same as separate calls                                    |
| Video    | Get Metadata: title, channel or show, duration, views, upload date, caption languages                           | 1 credit                                                  |
| Video    | List Videos: videos of a playlist or channel, or episodes of a podcast (newest first), one item per video       | 1 credit                                                  |
| Account  | Get Usage: plan, credits left, last 30 days                                                                     | free                                                      |

## Example workflow

1. **Transkrio → List Videos** with URL `@veritasium` and Limit `10`. Outputs one item per video
   with `id`, `title`, `duration_seconds` and `url`.
2. **Transkrio → Get Transcript** with URL `{{ $json.url }}`. Outputs `text` and `segments`
   (`start`, `duration`, `text`).
3. An LLM node (OpenAI, Anthropic...) that summarizes `{{ $json.text }}`.
4. Notion, Slack or Google Sheets to store the summaries.

The node also works as a tool for the **AI Agent** node, so an agent can fetch a transcript on its own
when a user pastes a YouTube, TikTok, Reel or podcast link.

Videos and episodes without captions are transcribed from the audio. A long podcast episode can take
a minute or two: Get Transcript waits for it, while Get Many Transcripts returns those items with
error code `processing` so you can send them again later.

Errors (no captions, private video, invalid URL) cost 0 credits. Turn on **Continue On Fail** to keep
the workflow running and get the error in the item instead.

## Compatibility

Works on self-hosted n8n through Community Nodes. The package has no runtime dependencies.

## Develop

```bash
npm install
npm run lint
npm run dev     # starts n8n locally with this node loaded
```

## Release

Releases are published to npm by GitHub Actions with [npm provenance](https://docs.npmjs.com/generating-provenance-statements).
Bump the version, then push a tag:

```bash
npm version patch          # creates the commit and the tag, e.g. 0.1.2
git push --follow-tags
```

## Links

- [Transkrio API docs](https://api.transkrio.com/docs)
- [Get an API key](https://transkrio.com/#signup)

## License

MIT
