# Transcribing spoken-only short-video recipes in a Go container

Research for [#24](https://github.com/jonas1w/cooka/issues/24) (map: #1). Feeds the AI fallback in [ADR 0009](../adr/0009-recipe-import-chain-ai-fallback.md); builds on [ig-yt-caption-fetching.md](ig-yt-caption-fetching.md), which covers captions and descriptions and is not repeated here. Findings only, no decision. Researched 2026-11-22.

**Question.** Can cooka turn an Instagram reel or YouTube Short whose recipe is only spoken (or shown on screen) into recipe text, from inside one Go container, and at what cost?

**Method.** Live probes with `curl` on 2026-11-22 from a residential IP in Germany. Same rules and samples as the caption research: no login, no cookies, honest UA `cooka/0.1 (+https://github.com/jonas1w/cooka)`, YouTube `3I4IE9pesJ8` and `94uLhchAsVc`, Instagram reels `C_y9HUQyh9d` and `CncWK8GBfmC`. The rest comes from official docs, the Whisper paper, upstream repos and their release notes. No local whisper runs were done (no N100 or Pi 5 at hand), so the latency figures below are estimates and are marked as such.

## Summary

| Question | Short answer |
|---|---|
| Audio via a plain Go fetch, no login? | **No, for both.** YouTube's watch page lists audio formats but gives them **no URL**, only a SABR streaming URL. Instagram's page has **no video URL** at all for these reels. Getting the media means yt-dlp-style reverse engineering (JS challenges, PO tokens, TLS impersonation), which ADR 0009 already rules out, and both sites' terms forbid it. |
| Local whisper.cpp? | Technically fine (MIT, Go bindings, quantized models 60–574 MB). For German you want at least **small** (FLEURS WER 10.2 %) and ideally medium or large-v3-turbo. On an N100 or Pi 5 that is **roughly 1–3 min per 60 s clip (estimate, not measured)**. It also brings cgo or a second binary plus ffmpeg into what is now a static `CGO_ENABLED=0` image. And it doesn't help, because cooka can't get the audio in the first place. |
| Providers? | **Gemini**: takes audio, video files, and **public YouTube URLs directly** (Google fetches the video). It reads frames at 1 fps, so on-screen text is visible to it. A 60 s clip costs about **$0.003–0.01**. **OpenAI**: audio only (`gpt-transcribe`, $0.0045/min); its chat models take no video. **Anthropic**: no audio or video input at all, only images. The same key works only for the provider it belongs to. |
| v1 vs. later | v1: caption or description fetch (already researched), plus paste, plus an optional "**send this YouTube link to Gemini**" path when the instance has a Gemini key. Instagram spoken-only reels stay manual in v1 (the user pastes or types the recipe). Later: let the user upload a video file through the share target or an upload field, then send it to Gemini, or to OpenAI after an ffmpeg audio extract. Local whisper only if there is demand for offline use. |

## 1. Getting the audio without login

### YouTube: formats are listed, but there are no URLs (SABR only)

The `/watch?v=ID` page that the caption research already fetches embeds `ytInitialPlayerResponse`. On 2026-11-22, for both sample Shorts:

- `playabilityStatus.status` = `OK`
- `streamingData` keys: `expiresInSeconds`, `adaptiveFormats`, `serverAbrStreamingUrl`
- the audio formats (itag 140 `audio/mp4; mp4a.40.2`, 249/250/251 `audio/webm; opus`, roughly 135–430 KB each for a Short) have **neither `url` nor `signatureCipher`**
- `captions`: absent (these Shorts have no caption tracks, so there is no auto-caption shortcut either)

So the only playback path is `serverAbrStreamingUrl`, which is YouTube's SABR protocol. That matches what the yt-dlp maintainers report. On 2025-04-29 they wrote: "the web client has removed all https formats (adaptiveFormats) and only has SABR protocol streaming url" ([yt-dlp#12482](https://github.com/yt-dlp/yt-dlp/issues/12482)). Downloaders now work around this with other Innertube clients, and those come with three costs:

- **PO tokens.** "Proof of Origin (PO) Token is a parameter that YouTube requires to be sent with requests from some clients." Without one, format URLs "may return HTTP Error 403", and "YouTube now binds PO Tokens to the video ID, so a new token needs to be generated for each video." Most clients (`web`, `mweb`, `android`, `ios`, …) need one for media (GVS) requests ([yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)).
- **JavaScript challenges.** yt-dlp "needs to solve JavaScript challenges presented by YouTube" using "an external JavaScript runtime" (Deno ≥ 2.3.0 recommended, Node ≥ 22, QuickJS) ([yt-dlp EJS wiki](https://github.com/yt-dlp/yt-dlp/wiki/EJS)). A Go client would need to embed a JS engine or shell out to one.
- **Churn.** The maintained Go port, [kkdai/youtube](https://github.com/kkdai/youtube), shipped v2.10.7 (2026-11-04: "report YouTube's bot check and rate limits") and v2.10.8 (2026-11-08: "Fix n-parameter transformation in media URLs") four days apart. v2.10.5 (2025-11) switched the default client "to solve youtube 403 error". yt-dlp has published 12 stable releases in 2026 so far (GitHub releases API). Expect breakage every few weeks.

**Terms.** YouTube's Terms of Service prohibit you to "access, reproduce, download, distribute, …" content except as the Service expressly allows or with written approval, and to "access the Service using any automated means (such as robots, botnets or scrapers)" except public search engines following robots.txt ([YouTube Terms](https://www.youtube.com/static?template=terms&hl=en&gl=US)). Fetching the watch page for its description is already a grey area. Downloading the media stream breaks the terms outright.

### Instagram: no media URL for a logged-out client

With the honest-UA fetch that returns the full caption (see the caption research), both sample reels now return `og:type` = `article` and the meta tags `og:title, og:description, og:image, og:url, og:site_name`, plus app-link tags. There is **no `og:video`** and no `*.mp4` URL anywhere in the 590 KB page. (The caption research saw `og:video` only on older posts.) The desktop-browser UA gets the JS app shell, which has no post data at all.

Downloaders get Instagram video through private GraphQL and web endpoints. yt-dlp's Instagram extractor regularly fails with "Requested content is not available, rate-limit reached or login required", even on public reels ([yt-dlp#11166](https://github.com/yt-dlp/yt-dlp/issues/11166), [#14241](https://github.com/yt-dlp/yt-dlp/issues/14241), [#16311](https://github.com/yt-dlp/yt-dlp/issues/16311)). The workarounds in those threads are browser cookies (a logged-in account, with ban risk) or `curl-cffi` TLS impersonation. ADR 0009 rejected both. Instagram's Terms of Use forbid collecting information "in an automated way without our express permission" ([Instagram Terms of Use](https://help.instagram.com/581066165581870); the page is JS-rendered and was not re-fetched, so the wording is from the published terms).

### What would work without breaking ADR 0009

1. **Let Google fetch YouTube.** Gemini accepts a public YouTube URL as video input (section 3). cooka never touches the media.
2. **The user brings the file.** A PWA share target can accept files via `POST` + `multipart/form-data` ([Chrome: Web Share Target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)), and a plain upload field works on desktop. The Instagram and YouTube apps share a *link* by default (caption research). A file only comes in if the user first saves the video to their phone, where the app allows that. So this path has more friction and works only for some reels.

## 2. Local transcription (whisper.cpp)

### Integration from Go

- whisper.cpp ships Go bindings in `bindings/go`: "Compile `libwhisper.a` (you can use `make whisper` …)" and "Link your go binary against whisper by setting the environment variables `C_INCLUDE_PATH` and `LIBRARY_PATH`". The API is `whisper.New(modelpath)` → `model.NewContext()` → `context.Process(samples []float32, …)` → `NextSegment()` ([bindings/go](https://github.com/ggml-org/whisper.cpp/tree/master/bindings/go)). That is **cgo**. cooka's foundation research chose a CGO-free static build (`CGO_ENABLED=0`, modernc SQLite, `FROM scratch`-able; [backend-foundation.md §9, §12](backend-foundation.md)). Linking whisper breaks that and needs a C toolchain for both arm64 and amd64 builds.
- The alternative is shipping the `whisper-cli` binary in the image and calling it as a subprocess. That avoids cgo but puts two binaries in one image. Upstream already publishes `ghcr.io/ggml-org/whisper.cpp:main` for linux/amd64 and linux/arm64, "includes `curl` and `ffmpeg`" ([README](https://github.com/ggml-org/whisper.cpp)).
- **Input format.** "`whisper-cli` example currently runs only with 16-bit WAV files". Anything else has to be converted to 16 kHz mono `pcm_s16le` first, e.g. with ffmpeg (README). Reels and Shorts audio is AAC or Opus, and pure-Go decoders for those are not mature, so in practice this means **ffmpeg in the image** as well.
- **VAD.** `--vad` with a Silero-VAD model skips non-speech, which helps with music-heavy reels (README).
- Releases are frequent (latest tag `b5907`, 2026-11-20). Licence MIT.

### Model sizes (ggml files)

From [ggerganov/whisper.cpp on Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main). The RAM column is whisper.cpp's README figure for the unquantized model; quantized models need less.

| Model | Params | File (f16) | File (quantized) | RAM (f16, README) |
|---|---|---|---|---|
| base | 74 M | 148 MB | 60 MB (q5_1), 82 MB (q8_0) | ~388 MB |
| small | 244 M | 488 MB | 190 MB (q5_1), 264 MB (q8_0) | ~852 MB |
| medium | 769 M | 1.5 GB | 539 MB (q5_0) | ~2.1 GB |
| large-v3-turbo | 809 M | 1.62 GB | 574 MB (q5_0), 874 MB (q8_0) | between medium and large (~3.9 GB for large) |

large-v3-turbo is large-v3 with "the number of decoding layers … reduced from 32 to 4", so it is much faster to decode "at the expense of a minor quality degradation" ([model card](https://huggingface.co/openai/whisper-large-v3-turbo)).

Image impact: the model (60–574 MB quantized) plus ffmpeg plus the whisper library or binary. Today the whole image is about 10–25 MB, so even `base` would be the largest thing in it. Downloading the model on first use into `/data` keeps the image small.

### German quality

WER (%) for German, from the Whisper paper's appendix tables ([Radford et al. 2022, Tables 10–12 and D.2.4](https://arxiv.org/abs/2212.04356)):

| Model | FLEURS (read speech) | Common Voice 9 | MLS | VoxPopuli |
|---|---|---|---|---|
| tiny | 27.8 | 34.5 | 24.9 | 27.4 |
| base | 17.9 | 24.5 | 17.7 | 20.6 |
| small | 10.2 | 13.0 | 10.5 | 14.8 |
| medium | 6.5 | 8.5 | 7.4 | 12.4 |
| large-v2 | 4.5 | 6.4 | 5.5 | 11.2 |

These are clean or read-speech datasets. Cooking reels add music, kitchen noise, fast speech and English loanwords, so real error rates will be higher. tiny and base drop or mangle roughly every 4th–5th word in German, too many for ingredient amounts. **small is the realistic floor; medium or large-v3-turbo is where German gets good.** Whisper-style errors on numbers ("zwei Esslöffel" vs. "zwölf Esslöffel") matter more for recipes than WER suggests, and the AI fallback that structures the transcript cannot fix a wrong number.

### Latency on N100 / Raspberry Pi 5: estimate only

I found **no primary benchmark with stated methodology** for whisper.cpp on an Intel N100 or a Pi 5:

- whisper.cpp's benchmark thread ([#89](https://github.com/ggml-org/whisper.cpp/issues/89)) has only Pi 4 rows from 2022: encoder for one 30 s window, 4 threads, tiny 13.8 s and base 30.6 s. whisper.cpp has had many speed-ups since then.
- The one Pi 5 data point in the issue tracker ([#1127](https://github.com/ggml-org/whisper.cpp/issues/1127), 2024-04-01) is the JFK sample at 1.7 s (default build) vs. 6.2 s (OpenBLAS). The model is not stated.
- OpenBenchmarking's `pts/whisper-cpp` results and the GOESB leaderboard (which lists N100 and Pi 5) were behind a bot or login gate and could not be read.
- Secondary sources (not verified, no methodology) put base at about real time and small at about 0.5× real time on a Pi 5 with 4 threads.

From that, a **rough expectation for a 60 s clip (two 30 s windows) with 4 threads**: base about 30–60 s, small about 1–3 min, medium or large-v3-turbo several minutes, on either box. An N100 (4 E-cores, AVX2) is in the same class as a Pi 5, perhaps somewhat faster. whisper.cpp 1.8.3's Vulkan iGPU path is said to speed up Intel iGPUs a lot ([Phoronix](https://phoronix.com/news/whisper-cpp-1.8.3-12x-perf)), but that is unverified for the N100 and needs a Vulkan build and `/dev/dri` passed into the container. **Measure before deciding:** `whisper-bench -m ggml-small-q5_1.bin -t 4` plus one real 60 s German reel on the target box takes about 10 minutes.

## 3. Provider transcription

All three providers are already candidates for the ADR 0009 AI fallback, so the question is what the *same key* can do.

| | Audio in | Video in | On-screen text | Same key as AI fallback? |
|---|---|---|---|---|
| **Gemini API** | Yes: WAV, MP3, AAC, OGG, FLAC, M4A, Opus, WebM…; 32 tokens/s; inline requests ≤ 20 MB total ([audio docs](https://aistudio.google.com/docs/audio)) | **Yes**: inline (< 20 MB request), Files API, or **public YouTube URL** (preview) ([video docs](https://aistudio.google.com/docs/video-understanding)) | Yes. Frames sampled at 1 fps by default (66 tokens/frame at low res, 258 otherwise); higher resolution helps the model "read fine text" | Yes, one Gemini API key |
| **OpenAI** | Yes: `/v1/audio/transcriptions`, formats include **mp4**, m4a, webm, ≤ 25 MB; `gpt-transcribe` recommended; `whisper-1` and `gpt-4o(-mini)-transcribe` shut down 2027-02-26 ([speech-to-text guide](https://developers.openai.com/api/docs/guides/speech-to-text)) | **No.** E.g. the GPT-6.2 Sol model page lists "Unsupported modalities: audio, video" ([model page](https://developers.openai.com/api/docs/models/gpt-6.2-sol)). OpenAI's own cookbook samples frames and sends them as images ([cookbook](https://developers.openai.com/cookbook/examples/gpt_with_vision_for_video_understanding)) | Only by extracting frames yourself (ffmpeg) | Yes, one OpenAI key covers transcription and chat |
| **Anthropic** | **No.** "All current models support text and image input, text output" ([models overview](https://platform.claude.com/docs/en/about-claude/models/overview)); the OpenAI-compat layer returns 400 for `input_audio` ([compat docs](https://platform.claude.com/docs/en/api/openai-sdk)) | **No** (images only, up to 600 per request, [vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)) | Only by extracting frames yourself | Key can't transcribe; an Anthropic-only instance would need a second provider for audio |

Notes:

- **Gemini YouTube URL.** "The YouTube URL feature is in preview and is available at no charge. Pricing and rate limits are likely to change." Only "public videos (not private or unlisted videos)". The free tier allows up to 8 h of YouTube video per day; paid has no length limit. The docs don't say whether the video's tokens are billed while in preview. This is the **only path that needs no media download by cooka** and it covers both audio and on-screen text. It was not tested live here (no key used). Whether `/shorts/ID` URLs are accepted as-is or need normalising to `watch?v=ID` is untested.
- **Gemini on Instagram.** There is no URL ingestion for Instagram. A file is needed (section 1, option 2).
- **Data use.** On Gemini's free tier, content may be "used to improve our products" ([pricing](https://aistudio.google.com/docs/pricing)). That is worth a line in the AI-fallback settings text.
- **Model churn.** `gemini-2.5-flash` routes to 3.5 Flash-Lite from 2026-12-01; OpenAI's older transcribe models end 2027-02-26. Make the model ID configurable rather than hard-coded.

### Cost per clip

Prices from [Gemini pricing](https://aistudio.google.com/docs/pricing) and [OpenAI pricing](https://developers.openai.com/api/docs/pricing), paid tier, USD. Assumptions (mine): a 60 s clip, ~1,000 prompt tokens (instructions and schema), ~1,000 output tokens (structured recipe), no thinking budget. Gemini video ≈ 100 tokens/s at default (low) resolution, audio 32 tokens/s.

| Path | Input tokens | Price (in / out per 1M) | ≈ cost per 60 s clip |
|---|---|---|---|
| Gemini 3.5 Flash-Lite, video (frames + audio) | ~7,000 | $0.30 / $2.50 | **~$0.005** |
| Gemini 3.6 Flash, video | ~7,000 | $0.75 / $3.75 until 2026-12-31, then $1.50 / $7.50 | ~$0.009, from 2027 ~$0.018 |
| Gemini 2.5 Flash-Lite, video | ~7,000 | $0.10 (video) / $0.30 (audio) / $0.40 out | < $0.003 |
| Gemini 3.5 Flash-Lite, audio only | ~2,900 | $0.30 / $2.50 | ~$0.003 |
| OpenAI `gpt-transcribe` + the existing text fallback call | per minute | $0.0045/min | $0.0045 + the text call (~$0.001–0.01) |
| Gemini via YouTube URL | as video | "no charge" in preview | $0, but may change |

A 30–90 s clip costs **well under 2 cents** on any of these. Cost is not the constraint. Getting the media is.

## 4. Verdict input: v1 vs. later

**Realistic for v1**

- Keep the chain as ADR 0009 has it: caption or description fetch, then paste.
- Optional, and only when the instance's AI fallback is **Gemini**: for a YouTube link whose description has no recipe, send the YouTube URL to Gemini with the same structured-output prompt, asking it to use the speech *and* on-screen text. No download, no ffmpeg, no cgo, no new dependency beyond the Gemini client cooka already needs. Caveats: preview feature, public videos only, untested on Shorts URLs.
- Instagram spoken-only reels: show a hint ("This reel has no recipe in its caption. Paste or type it.").

**Later**

- **Video file upload** (share target `POST multipart` plus a desktop upload field). Send the file to Gemini directly (inline < 20 MB, else Files API). For OpenAI, extract audio with ffmpeg and use `gpt-transcribe`, plus frames for on-screen text. The mp4 container is accepted as-is by the OpenAI transcription endpoint, so ffmpeg is needed only for frames or for files over 25 MB. This covers Instagram, at the cost of the user saving the video first.
- **Local whisper** (offline, no provider): only if users ask for it. It needs ffmpeg and either cgo or a `whisper-cli` subprocess, a ≥ small model (190 MB q5_1) for usable German, and 1–3 min per clip on N100 or Pi 5 class hardware (to be measured). It still doesn't solve getting the audio, so it only helps the upload path.
- **Not recommended:** in-process YouTube or Instagram media download (yt-dlp, kkdai/youtube). It needs PO tokens, a JS runtime, TLS impersonation or cookies, breaks every few weeks, violates both sites' terms, and contradicts ADR 0009's "no arms race" rule.

## Open points (not tested)

- Gemini with a YouTube Shorts URL, live, with a German spoken-only recipe: quality, whether on-screen text is picked up, and whether YouTube-URL tokens are billed.
- whisper.cpp `small`/`large-v3-turbo` q5 on a real N100 and Pi 5 with a 60 s German reel: wall time, RAM, and the Vulkan iGPU path on the N100.
- Whether the Instagram and YouTube Android apps can share the *video file* (not the link) to a PWA share target, and for which reels.
