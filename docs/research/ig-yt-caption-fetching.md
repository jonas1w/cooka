# Fetching Instagram & YouTube Shorts captions without login

Research for [#19](https://github.com/jonas1w/cooka/issues/19) (part of the map, #1). Context: [ADR 0009](../adr/0009-recipe-import-chain-ai-fallback.md) — one plain Go HTTP fetch, honest User-Agent, no TLS impersonation, no login; fallbacks are paste, Android PWA share target, desktop bookmarklet.

Findings only, no decision.

**Method.** Live probes with `curl` on 2026-11-12 from a residential IP in Germany (EU consent rules apply). No login, no cookies except those noted, no impersonation of crawlers or TLS fingerprints. Two User-Agent families were tried: a desktop Chrome UA string, and honest non-browser UAs (`Go-http-client/2.0`, `curl/8.7.1`, `cooka/0.1 (+https://github.com/jonas1w/cooka)`). Samples: YouTube Shorts `3I4IE9pesJ8`, `94uLhchAsVc`, `AVPXLzWXPOk`, `bjORJxg-v7w`, `6gjsxIEvFeU`; Instagram reels `C_y9HUQyh9d` (chacekitchen, recipe caption), `CncWK8GBfmC` (busyinbrooklyn, recipe caption), post `fA9uwTtkSN` (Meta's own oEmbed doc example). Small sample — treat as indicative, not statistical.

## Summary

| | Caption / description text | Thumbnail | Login wall / blocks seen |
|---|---|---|---|
| **YouTube oEmbed** | Title only (no description) | Yes (`hq2.jpg`, 480×360) | None; no key needed |
| **YouTube `/watch?v=ID` HTML** | **Full description** in `ytInitialPlayerResponse.videoDetails.shortDescription`; `<meta name=description>` is truncated (~160 chars) | Yes, `og:image` maxres 1280×720 | None from this IP, any UA |
| **YouTube `/shorts/ID` HTML** | — | — | **EU consent redirect** (302 → `consent.youtube.com`) |
| **Instagram page HTML, browser UA** | Nothing — JS app shell, no `og:` tags | No | Effectively a wall |
| **Instagram page HTML, honest non-browser UA** | **Full caption** in `og:title` / `og:description` / `description` | Yes, `og:image` 640×640, signed URL expiring in ~5 days | None in 8 back-to-back fetches |
| **Instagram oEmbed (Graph API)** | None — only `html` blockquote (no caption text) | No (field removed) | No token needed since 2026-06-15; fails for posts with embedding off |

## YouTube Shorts

### oEmbed — title and thumbnail, no description
`GET https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/ID&format=json` → 200, no API key. Fields: `title, author_name, author_url, type, height, width, version, provider_name, provider_url, thumbnail_height, thumbnail_width, thumbnail_url, html`. `thumbnail_url` was `https://i.ytimg.com/vi/ID/hq2.jpg` (480×360). There is **no description field**, so oEmbed alone gives only the title (often just hashtags, e.g. "Chilly Garlic cheese burst Maggi #shorts #cooking …").

### Watch page — full description
`GET https://www.youtube.com/watch?v=ID` → 200, ~1.4 MB, for both the Chrome UA and `cooka/0.1`. The page embeds `var ytInitialPlayerResponse = {...};`; `videoDetails.shortDescription` holds the **complete** description (883, 960, 360, 401 chars on the samples; one Short had an empty description), and `playabilityStatus.status` was `OK`. `ytInitialData` is also present. Head tags: `og:title`, `og:image` (`maxresdefault.jpg`, 1280×720), `og:url` (points back at `/shorts/ID`), and `<meta name="description">`, which is cut at ~160 chars with "..." — so the meta tag is not enough for a recipe.

Static thumbnails fetched directly with no cookies: `https://i.ytimg.com/vi/ID/{maxresdefault,oardefault,hqdefault,hq2}.jpg` all 200 `image/jpeg`.

### `/shorts/ID` is consent-walled in the EU; `/watch?v=ID` is not
`GET https://www.youtube.com/shorts/ID` (no cookies) → `302 Location: https://consent.youtube.com/m?continue=…&gl=DE…`. Following the redirect lands on the consent page, which has no video data. Sending back the `SOCS` cookie YouTube itself set in that 302 still redirects. The same video at `/watch?v=ID` returned the full page without a consent redirect. So a server that turns `youtube.com/shorts/ID`, `youtu.be/ID` (which 303s to `/watch?v=ID&…`) and `m.youtube.com` into `www.youtube.com/watch?v=ID` gets the description from an EU IP. (Behaviour may differ by region and can change; not documented by Google.)

### Rate limits / bot checks
Not hit in these ~10 requests. Datacenter IPs were not tested; YouTube is known to show "Sign in to confirm you're not a bot" to some datacenter ranges, but cooka runs on a home LAN, so a residential IP is the expected case.

## Instagram posts and reels

### oEmbed: no token needed any more, but no caption and no thumbnail
- Endpoint: `GET https://graph.facebook.com/v{N}/instagram_oembed?url=…` ([Meta: Embed an Instagram Post](https://developers.facebook.com/docs/instagram-platform/oembed); 1,000 requests/hour).
- **Token:** Meta's reference says "On June 15, 2026, we lifted the access token requirement from all Meta oEmbed APIs" ([oEmbed Video reference](https://developers.facebook.com/docs/graph-api/reference/oembed-video)). Confirmed live: no `access_token` → 200 for `fA9uwTtkSN`. A bogus token → 400 "Cannot parse access token". Asking for extra `fields=` without a token → `(#200) Provide valid app ID`. Before that date it required the "Meta oEmbed Read" feature, which needs App Review ([feature reference](https://developers.facebook.com/docs/features-reference/meta-oembed-read)).
- **Fields:** since 2025-11-03 the endpoint no longer returns `thumbnail_url`, `thumbnail_width`, `thumbnail_height` or `author_name`; Meta says to "generate their own thumbnails by accessing the HTML metadata directly from the Instagram post" ([oEmbed Updates blog, 2025-04-08, updated 2025-10-08](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/)). The live response held only `version, provider_name, provider_url, type, width, html`, and the `html` blockquote's visible text was just "View this post on Instagram" — **no caption text**.
- **Fails for some public posts:** `C_y9HUQyh9d` is public (its page serves the caption, below) but oEmbed answered `400 "Private Media" (subcode 2207046)`. Instagram lets owners turn embedding off for their posts; that is the likely cause. `CncWK8GBfmC` returned the normal minimal response.
- Legacy `https://api.instagram.com/oembed/?url=…` → 302 to `www.instagram.com/oembed/…`, which serves the HTML app shell, not JSON.

**Net: oEmbed is useless for cooka's import** — at most a "this post exists and is embeddable" check.

### Post/reel page HTML — depends on the User-Agent
- **Desktop Chrome UA** (no cookies): `/reel/ID/`, `/p/ID/` and `/…/embed/captioned/` all return 200, ~514 KB, `<title>Instagram</title>`, a client-rendered app shell with **no `og:` tags and no post data**. The same shell was served for a profile page. A plain client cannot get past this without running the JS (and extra browser headers were not tried, as that drifts into impersonation).
- **Honest non-browser UA** (`Go-http-client/2.0`, `curl/…`, `cooka/0.1 (+url)` — all behaved the same): 200, ~565 KB, with server-rendered meta tags:
  - `og:title` = `"<Display Name> on Instagram: \"<full caption>\""`
  - `og:description` and `<meta name="description">` = `"<N> likes, <M> comments - <username> on <date>: \"<full caption>\". "`
  - `og:image` / `twitter:image` = 640×640 JPEG on `scontent-*.cdninstagram.com`, signed with an `oe=` expiry (the sample expired ~5 days after fetching); downloading it with no cookies returned 200 `image/jpeg`.
  - `og:url` = canonical `https://www.instagram.com/<username>/reel/<ID>/`, `og:type` `video`/`article`, plus `og:video` MP4 URLs for older posts.
- **The caption was complete**, not truncated: on `C_y9HUQyh9d` the 2,262-char `og:description` ran through the full ingredient list and method to the closing hashtags; on `CncWK8GBfmC` 1,578 chars with yield and ingredients. Newlines are preserved; HTML entities (`&#064;`, `&quot;`, `&#x2022;`) need decoding, and the "likes, comments - user on date:" prefix / "Name on Instagram:" wrapper plus the surrounding quotes need stripping.
- No JSON caption blob (`edge_media_to_caption`, `xdt_api…`) is in either variant — the meta tags are the only source.
- **Rate limits:** 8 back-to-back fetches of the same reel with `cooka/0.1` all returned 200 with the caption. No throttling seen at this volume. Meta documents none of this: it is undocumented server-side UA sniffing (it looks like the link-preview path for unfamiliar clients) and could change without notice. Private accounts, age-gated or region-blocked posts were not tested and would be expected to fail.

## What an Android share hands a Web Share Target
- **Platform mapping:** Chrome's docs say that on Android "the `url` field will be empty" because "it's not supported in Android's share system. Instead, URLs will often appear in the `text` field, or occasionally in the `title` field" ([Chrome: Web Share Target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)). Android's `EXTRA_TEXT` maps to the manifest's `text` param and `EXTRA_SUBJECT` to `title`. The PWA must be installed (WebAPK) and meet installability criteria. Only one `share_target` per manifest; GET by default, POST + `enctype` for files.
- **YouTube app:** shares a link in `text`, with an `si=` tracking param — e.g. `https://youtube.com/watch?v=ID&si=…` in a receiver's log ([asilichenko/android-youtube-shared](https://github.com/asilichenko/android-youtube-shared)); Shorts share as `https://youtube.com/shorts/ID?si=…`. Community receivers read the subject as the video title. **Not verified on a device here**; no official Google spec exists. The description is not part of the share.
- **Instagram app:** the share sheet / "Share to…" hands out the post link (`https://www.instagram.com/reel/ID/?igsh=…`) in `text`. **Not verified on a device here** and no Meta documentation was found. The caption is not part of the share; users can copy it in the app ("…more" → long-press) and paste it instead.
- So for both apps, assume the share target receives a **URL (in `text`, maybe a title)**, not the caption. The caption has to come from the server fetch above, or from the user pasting it.

## Open points (not tested)
- Shares captured on a real Android device for both apps (log the exact `title`/`text`/`url` the share target receives).
- Instagram behaviour from datacenter / VPN IPs, at sustained volume, and for carousel posts.
- YouTube from non-EU IPs (whether `/shorts/` is walled there) and from datacenter IPs.
