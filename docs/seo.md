# Search engines (SEO) for the Turjuman website

How turjuman.nl is found in Google, Bing and AI answer engines, in English and Dutch (and Arabic):
what the research found, what the website does about it, and what is left to do off the website.
Checked on 2026-10-09. Every claim has its source; quotes are verbatim.

**In short**

- Lighthouse's SEO score is a low bar: every page already scored 100 before this work, and still
  does (table below). What Google actually uses goes further: crawlable pages, one canonical
  address per page and language, reciprocal hreflang, a sitemap, `noindex` on everything that is
  not the website, unique and descriptive titles and descriptions, honest structured data, and fast
  mobile pages.
- People do not yet search much for "a tool that translates the khutbah", in either language. The
  wording the market uses is **live khutbah translation** (English) and **khutbah** /
  **vrijdagpreek** with **live vertaling** (Dutch). The pages now use those words where they are
  true.
- AI answers (Google AI Overviews and AI Mode, ChatGPT search, Perplexity, Copilot) need nothing
  special: Google says it is "still SEO", and ignores llms.txt.
- What matters most now is off the website: the live turjuman.nl must serve this website
  (today it serves an older app page), then Search Console, Bing Webmaster Tools and a few real
  links from where mosques look.

## 1. What the website does

| What | Where | Why |
|---|---|---|
| `robots.txt` (hosted): `User-agent: *`, `Allow: /`, and `Sitemap: <origin>/sitemap.xml` | `src/server/site.ts` (`robotsTxt`) | Nothing is disallowed, so crawlers can see the app's `noindex`. [Section 3.2](#32-robotstxt) |
| `robots.txt` (self-hosted, local mode): `Disallow: /` | `src/server/site.ts` | A mosque's own server is not for search engines. [Section 3.2](#32-robotstxt) |
| `sitemap.xml` (hosted only): every page in en/nl/ar, each with its `xhtml:link` alternates and English as `x-default`; no `lastmod` | `site/render/seo.ts`, written by `scripts/build-site.ts`, served with the server's origin | [Section 3.3](#33-sitemap) |
| `X-Robots-Tag: noindex, nofollow` on every response that is not the public website: the app (`/app…`, `/login`, `/signup`, `/admin`, `/overlay`, `/control`, `/customize`), caption pages (`/:from/:to`), `/feed/…`, `/s/…`, the API, every error, the 404 page, and everything a self-hosted server sends | `src/server/app.ts` (one `onRequest` line), `isWebsite()` in `src/server/site.ts` | [Section 3.4](#34-noindex-and-x-robots-tag) |
| The 404 page answers with status **404**, `noindex` (meta and header), no canonical | already so; now also the header | [Section 3.5](#35-404) |
| Canonical (self-referencing, absolute) and `hreflang` en/nl/ar/x-default on every page | already so; checked against the sitemap in tests | [Section 3.6](#36-canonical-and-hreflang) |
| A new title and description for every page and language, from the keyword research | `site/content/strings.ts` (home), `site/content/docs/*.ts` | [Section 4](#4-keywords-titles-and-descriptions) |
| JSON-LD on the home pages: `Organization` (name, logo, GitHub), `WebSite` (site name, only on `/`), `WebApplication` (free, MIT, no ratings) | `site/render/seo.ts`, in `<head>` | [Section 3.7](#37-structured-data-json-ld) |
| A 192 px PNG favicon next to the SVG one | `site/og/favicon.png` (drawn by `site/og/render.mjs`), `site/layout.html` | Google Search shows PNG favicons, not SVG. [Section 3.9](#39-favicon) |
| `og:image:alt` describes the picture (the brand and the headline it shows), not the page title | `site/render/page.ts` | Accuracy |

Tests: `test/unit/site-seo.test.ts`. It checks robots.txt, the sitemap (well-formed XML, every
page once per language, reciprocal alternates, the same addresses as the pages' canonical and
hreflang), `X-Robots-Tag` on the app routes and its absence on the website, titles and
descriptions (unique, length, no banned words), and the JSON-LD (valid JSON, schema.org types,
price 0, no ratings). `test/unit/site-browser.test.ts` loads the home pages in headless Chrome
with the real CSP and checks the JSON-LD causes no CSP violation.

## 2. Lighthouse (SEO category)

The current version is **Lighthouse 13.5.0** (2026-09-18):
https://github.com/GoogleChrome/lighthouse/releases/tag/v13.5.0.

The SEO category lists these audits; the weights are from
https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/config/default-config.js:

| Audit | Weight | How a page passes | Turjuman |
|---|---|---|---|
| `is-crawlable` | 93/23 (failing it alone caps the score at about 69) | No `noindex`/`none` in meta robots or `X-Robots-Tag`, and robots.txt does not block the page. It fails only when every checked bot (generic, Googlebot, bingbot, DuckDuckBot, archive.org_bot) is blocked. | Website pages have no robots meta and no header. |
| `document-title` | 1 | A non-empty `<title>` | Yes |
| `meta-description` | 1 | A non-empty `<meta name="description">` (no length check) | Yes |
| `http-status-code` | 1 | The status is not 400–599 | 200 |
| `link-text` | 1 | No link text that is exactly a generic phrase from the page language's list. English: "click here, click this, go, here, information, learn more, more, more info, more information, right here, read more, see more, start, this". There is no Dutch or Arabic list. | No such link texts ("Start free" and "Steps for OBS" are not on the list) |
| `crawlable-anchors` | 1 | Real `href`s (no `javascript:void(0)`, no empty href on clickable `<a>`) | Yes |
| `robots-txt` | 1 | Known directives only, `user-agent` before rules, rules starting with `/` or `*`, an absolute `Sitemap` URL. A 4xx counts as not applicable. | Valid |
| `image-alt` | 1 | Every `<img>` has `alt` | No `<img>` (the pictures are SVG with `role="img"` and `aria-label`): not applicable |
| `hreflang` | 1 | Valid language codes (or `x-default`), absolute URLs | `en`, `nl`, `ar`, `x-default`, absolute |
| `canonical` | 1 | One absolute canonical, not pointing to another hreflang version or to `/` from a deeper page | Self-referencing |
| `structured-data` | 0 (manual) | Not scored: checked by hand | Checked separately ([section 3.7](#37-structured-data-json-ld)) |

Sources: https://github.com/GoogleChrome/lighthouse/tree/v13.5.0/core/audits/seo (one file per
audit).

What changed in recent versions:
- Lighthouse 12.0 (2024-04-22) moved `viewport` and `font-size` to Best practices, removed
  `plugins`, and replaced `tap-targets` with `target-size` in Accessibility
  (https://github.com/GoogleChrome/lighthouse/blob/main/changelog.md).
- Lighthouse 13.0 (2025-10-10) removed `font-size`: "there are no signals that this remains an
  SEO concern today" (https://developer.chrome.com/blog/lighthouse-13-0).
- Lighthouse 13.2 added a separate "Agentic browsing" category (`llms-txt`, `ard-schema`, WebMCP).
  It is not part of SEO. A missing llms.txt or `ai-catalog.json` counts as "not applicable" there
  (https://github.com/GoogleChrome/lighthouse/blob/v13.5.0/core/audits/agentic/llms-txt.js).

### Results

Lighthouse 13.5.0, SEO only, system Chrome headless, against a hosted server built from this
branch (`hosted.publicUrl` set to the server's own address, so the canonical matches), mobile
(default) and desktop (`--preset=desktop`):

| Page (path in English; `/nl/…`, `/ar/…` alike) | EN mobile | EN desktop | NL mobile | NL desktop | AR mobile | AR desktop |
|---|---|---|---|---|---|---|
| Home | 100 | 100 | 100 | 100 | 100 | 100 |
| How it works (`/how-it-works`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Show on a screen (`/show-on-a-screen`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Security (`/security`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Self-host (`/self-host`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Install (`/install`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Phone & network (`/network`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Docker (`/docker`) | 100 | 100 | 100 | 100 | 100 | 100 |
| Commands (`/commands`) | 100 | 100 | 100 | 100 | 100 | 100 |

All 54 runs: 100. Every audit passes; `image-alt` is not applicable (no `<img>`), and
`structured-data` is manual.

The **404 page** cannot score 100, by design. It must answer 404, which fails `http-status-code`;
the Lighthouse CLI does not even produce a report for a 404 document. It must also say
`noindex`, which fails `is-crawlable`. Both are what Google asks for
([section 3.5](#35-404)).

**The app's pages** (`/app`, `/login`, `/signup`, caption pages) would score at most about 69,
also by design: they say `noindex`.

**Other categories**, for information only (home pages, same setup):

| Home | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` mobile | 88 | 96 | 100 | 100 |
| `/` desktop | 100 | 96 | 100 | 100 |
| `/nl` mobile | 87 | 96 | 100 | 100 |
| `/nl` desktop | 100 | 96 | 100 | 100 |
| `/ar` mobile | 88 | 96 | 100 | 100 |
| `/ar` desktop | 100 | 96 | 100 | 100 |

- Accessibility 96: `color-contrast` flags four texts of the home page's demos in their resting
  state: the scrubber's time and chapter while it is still locked, and the verse demo's words
  before they light up. These are animation states of the design; they were left as they are.
- Performance on mobile: the local test server does not compress (`render-blocking-insight`:
  the 53 KB stylesheet; `document-latency-insight`: about 18 KiB to save). Behind a reverse proxy
  that compresses (zstd or gzip), turjuman.nl should score higher. Check it on
  https://pagespeed.web.dev/ once it is live.

## 3. Technical SEO: what Google and Bing say, and what we do

### 3.1 How Google treats the three languages

- "Google uses the visible content of your page to determine its language. We don't use any
  code-level language information such as lang attributes, or the URL."
  https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Separate URLs per language are the recommended setup. Subdirectories (`/nl/…`) are fine.
  Avoid "automatically redirecting users from one language version … to a different language
  version". Same page.
- Turjuman follows this: `/`, `/nl/…` and `/ar/…`, with full content in each language and no
  automatic redirect. `lang` and `dir="rtl"` stay for browsers, screen readers and Bing.
  Bing's language signals are **unverified**: its 2011 post that named `content-language` and
  `<html lang>` is gone.

### 3.2 robots.txt

- "It is not a mechanism for keeping a web page out of Google. To keep a web page out of Google,
  block indexing with noindex or password-protect the page."
  https://developers.google.com/search/docs/crawling-indexing/robots/intro
- "If your web page is blocked with a robots.txt file, its URL can still appear in search
  results, but the search result won't have a description." Same page.
- "For the noindex rule to be effective, the page or resource must not be blocked by a robots.txt
  file." https://developers.google.com/search/docs/crawling-indexing/block-indexing
- The Sitemap line "must be a fully qualified URL". Of the fields, Google supports user-agent,
  allow, disallow and sitemap ("crawl-delay aren't supported").
  https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- Don't block CSS or JavaScript a page needs.
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide

**Hosted (turjuman.nl).** The file allows everything and names the sitemap. The app is kept out
of the index with `noindex`, not with `Disallow`. A `Disallow` would hide that `noindex`, and the
URL could still be listed from links. That matters most for `/feed/<guid>` links: the GUID is the
screen's key, and a disallowed but linked feed URL could show up as a bare URL in results. With
crawling allowed and `noindex`, it never does.

```
# Turjuman. The website may be crawled; the app's pages answer with X-Robots-Tag: noindex.
User-agent: *
Allow: /

Sitemap: https://turjuman.nl/sitemap.xml
```

There are no per-bot groups. A bot with its own group ignores the `*` group, and the project
wants to be found by every search and answer engine ([section 5](#5-ai-search-and-answer-engines)).

**Self-hosted (local mode).** `User-agent: *` / `Disallow: /`, and `noindex` on every response
as a backstop for crawlers that ignore robots.txt. This was a deliberate choice: a mosque's own
server (often on a LAN, sometimes public behind Caddy) should not be crawled at all. That keeps
crawlers and AI bots off its caption pages and its bandwidth.

The trade-off is Google's caveat above: if someone links a public self-hosted server, Google may
list the bare URL without content. An operator who wants it removed fully can allow crawling
(edit the rule) so the `noindex` is seen, or use Search Console's removals tool. There is no
sitemap in local mode.

### 3.3 Sitemap

- "Use fully-qualified, absolute URLs in your sitemaps." "Google ignores `<priority>` and
  `<changefreq>` values." "Google uses the `<lastmod>` value if it's consistently and verifiably
  … accurate."
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- hreflang in a sitemap: one `<url>` per address, each listing every language version including
  itself, with `xmlns:xhtml="http://www.w3.org/1999/xhtml"`.
  https://developers.google.com/search/docs/specialty/international/localized-versions
- Bing: "Avoid setting lastmod to the time your sitemap was generated unless the content on that
  URL was actually updated."
  https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search

`/sitemap.xml` lists the 27 addresses (9 pages × en/nl/ar), never the 404 page. Each address has
four alternates (en, nl, ar, x-default → English). The origin is `hosted.publicUrl`, else the
request's own, like the pages' canonical.

**No `lastmod`.** The build cannot know truthfully when a page last changed. The Docker build has
no `.git`, so commit dates are not available there, and the build time would claim every page
changed on every deploy, which Google and Bing both say not to do. If Bing's crawling of changes
turns out to matter later, the better fix is IndexNow on deploy (see [section 6](#6-what-is-left-to-do)).

### 3.4 noindex and X-Robots-Tag

- `noindex` can be given as `<meta name="robots">` or as the `X-Robots-Tag` header: "They have the
  same effect." https://developers.google.com/search/docs/crawling-indexing/block-indexing
- `X-Robots-Tag: noindex, nofollow` is a valid combined value; rules without a user agent apply to
  all crawlers. https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Bing: "robots.txt controls crawl access, not indexing." Use NOINDEX.
  https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a

In the server, every response gets `X-Robots-Tag: noindex, nofollow` unless it is part of the
public website. The website's routes are marked in their route config (`website: true`); its
files are under `/site-assets/`. Both apply in hosted mode only. That covers new app routes
automatically, and every 401, 404 and redirect of the app.

### 3.5 404

- "Google doesn't index URLs that return a 4xx status code." A 200 page that says "not found" is
  a soft 404. https://developers.google.com/search/docs/crawling-indexing/http-network-errors
- Custom 404 pages are for users: "make sure the server returns a 404 HTTP status code".
  https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
- Bing: "Return a 404 status code" for deleted content (Bing guidelines, above).

The website's 404 page answers 404, in the language of the address. It has `noindex` (meta and
header), no canonical and no hreflang, and links to the home page, How it works and Self-host.

### 3.6 Canonical and hreflang

- "Do include a rel="canonical" link on the canonical page itself." "If you're using hreflang
  elements, make sure to specify a canonical page in the same language." Use absolute URLs.
  https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- "Each language version must list itself as well as all other language versions." "If two pages
  don't both point to each other, the tags will be ignored." x-default is for "language selector
  pages" or a fallback. Codes: ISO 639-1, with an optional region.
  https://developers.google.com/search/docs/specialty/international/localized-versions

Every page has a canonical to itself (absolute), plus `<link rel="alternate" hreflang>` for en, nl,
ar and x-default (English) in its `<head>`. The sitemap repeats the same set. Google says the
methods are equivalent; both are kept because the sitemap also serves Bing. A trailing slash
(`/nl/`) is a 301 to the one address (`/nl`).

### 3.7 Structured data (JSON-LD)

Rules:
- "Don't mark up content that is not visible to readers of the page." "Don't mark up … fake
  reviews." "Your structured data must be a true representation of the page content."
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- **Organization**: "There are no required properties." The logo must be at least 112×112 px,
  crawlable, and in a Google Images format. Place it "on your home page".
  https://developers.google.com/search/docs/appearance/structured-data/organization
- **WebSite** (site name): `name` and `url` are required, `alternateName` is recommended, and it
  goes on the home page at the domain root. "Google Search does not support site names at the
  subdirectory level", so `/nl` and `/ar` cannot have their own.
  https://developers.google.com/search/docs/appearance/site-names
- **SoftwareApplication** rich results require `name`, `offers.price` ("If the app is available
  without payment, set offers.price to 0") and `aggregateRating` or `review`.
  https://developers.google.com/search/docs/appearance/structured-data/software-app

  Turjuman has no genuine ratings, so it gets **no rich result**, and inventing ratings would
  break the rules above. The markup stays valid schema.org, and Google says "it's a good idea to
  continue using" structured data
  (https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- The sitelinks search box is gone (2024-11-21):
  https://developers.google.com/search/blog/2024/10/sitelinks-search-box. So there is no
  `SearchAction`.

What each home page carries, in `<head>`:
- `Organization` on `/`, `/nl` and `/ar`, the same everywhere: name "Turjuman", alternateName
  "ترجمان", url, the 180 px PNG mark as logo, and `sameAs` the GitHub organisation
  https://github.com/turjuman-translator. The organisation and both repositories are public, as
  checked with the GitHub API on 2026-10-09.
- `WebSite` on `/` only: name and alternateName, url, `inLanguage` en/nl/ar, and the organisation
  as publisher.
- `WebApplication` in the page's language: name, url, the page's description,
  `applicationCategory` "MultimediaApplication" (one of Google's listed values), `operatingSystem`,
  `isAccessibleForFree: true`, `offers` price "0" EUR, `license` (the MIT licence on GitHub), and
  the organisation as publisher.

Everything here is visible on the page: the name, free, open source, MIT, GitHub. There are no
ratings, reviews, prices other than 0, or invented features.

**CSP.** The pages forbid inline scripts (`script-src 'self'`). A
`<script type="application/ld+json">` is a data block. In the HTML standard's "prepare the script
element", a type that is not JavaScript ends the algorithm ("Otherwise, return. (No script is
executed …)") before the CSP check. Nothing is run, blocked or reported.
- https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element
- https://w3c.github.io/webappsec-csp/#should-block-inline
- Chromium does the same: `ScriptTypeAtPrepare::kInvalid` returns before `AllowInlineScriptForCSP`
  (https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/script/script_loader.cc).
- Verified in Chrome: `test/unit/site-browser.test.ts` loads `/`, `/nl` and `/ar` with the real
  headers, listens for `securitypolicyviolation`, and finds none. The build still refuses any
  other inline script.

The JSON is written with `<` escaped as `<`, so it can never close its element.

**Validation.** The markup is valid JSON (unit test). The Schema Markup Validator
(https://validator.schema.org/, `POST /validate`) reported 0 errors and 0 warnings for `/`, `/nl`
and `/ar` (2026-10-09). Check it again on the live site with the Rich Results Test
(https://search.google.com/test/rich-results). It will show no rich result for the app, which is
expected without ratings.

A note for other hosted operators: the website and its JSON-LD say "Turjuman" with the GitHub
organisation as `sameAs`, at whatever domain serves them. That is true of the software, but an
operator running their own branded instance would want to change it.

### 3.8 Titles, descriptions and Open Graph

- Titles: "While there's no limit on how long a `<title>` element can be, the title link is
  truncated in Google Search results as needed, typically to fit the device width." Make them
  unique, descriptive and concise, avoid boilerplate and keyword stuffing, and brand them with a
  delimiter. Google also reads `og:title` and the WebSite markup.
  https://developers.google.com/search/docs/appearance/title-link
- Descriptions: "There's no limit on how long a meta description can be, but the snippet is
  truncated … typically to fit the device width." "Create unique descriptions for each page."
  https://developers.google.com/search/docs/appearance/snippet
- Bing: "Missing, duplicate, or overly short title tags and meta descriptions may reduce indexing
  reliability, ranking, and eligibility for grounding results." (Bing guidelines, above)
- The usual practical range (about 50–60 characters for a title and 120–160 for a description)
  is what fits before truncation. It is not a rule. The tests keep titles at 15–60 characters
  and descriptions at 70–160, every one unique across all pages and languages.
- Open Graph: Google uses `og:title` (titles), `og:site_name` (site names) and `og:image`
  (preferred image). The site has all of them, plus `og:locale` and its alternates and
  `twitter:card`.

### 3.9 Favicon

"Google Search supports the following favicon file formats: BMP, GIF, ICO, PNG, JPEG, PPM, and
TIFF." Recommended "larger than 48x48px". "Googlebot-Image must be able to crawl the favicon
file." The URL should be stable.
https://developers.google.com/search/docs/appearance/favicon-in-search

The pages' icon was SVG only, plus a 180 px `apple-touch-icon` (PNG, square), which Google also
accepts. The pages now also link a 192 px PNG of the same rounded tile
(`<link rel="icon" … type="image/png" sizes="192x192">`), so the result looks the same in a tab
and in Google. Its URL changes only when the picture does (content hash).

### 3.10 Speed, mobile, HTTPS, links, images

- Core Web Vitals: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, at the 75th percentile.
  https://web.dev/articles/vitals. "Core Web Vitals are used by our ranking systems."
  https://developers.google.com/search/docs/appearance/page-experience
- Mobile-first: "Google uses the mobile version of a site's content … for indexing and ranking."
  https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing.
  The site is responsive, with the same content on every screen size.
- HTTPS is "only a very lightweight signal"
  (https://developers.google.com/search/blog/2014/08/https-as-ranking-signal). Google prefers
  HTTPS URLs as canonical. Production runs behind Caddy with automatic HTTPS; set
  `hosted.publicUrl` to `https://turjuman.nl`.
- Links: "Google can only crawl your link if it's an `<a>` HTML element … with an href
  attribute." Anchor text should be descriptive.
  https://developers.google.com/search/docs/crawling-indexing/links-crawlable. Every link on the
  website is a real `<a href>` with its own text. The nav, the footer (all pages, in groups), the
  self-host stepper and previous/next link every page from every other.
- Images: Google indexes `<img>`, not CSS images, and alt text matters
  (https://developers.google.com/search/docs/appearance/google-images). The pages' pictures are
  inline SVG with `role="img"` and an `aria-label` in the page's language; there are no `<img>`
  elements without alt.

## 4. Keywords, titles and descriptions

### 4.1 How the research was done, and how strong it is

No paid keyword tool was used. The evidence:

- **Autocomplete** from Google (`suggestqueries.google.com`, en-GB/en-US/nl-NL/nl-BE), YouTube,
  Bing and DuckDuckGo, for about 50 English and 30 Dutch seed phrases. Autocomplete shows that
  people type a phrase; it does not show how many.
- **Google Trends** comparisons (worldwide, GB, US, NL, BE).
- How Dutch mosques and media write it: Diyanet NL, SICN, Rabita Amsterdam, Moskee Geleen, Moskee
  Abi Bakr, the Blue Mosque, nl.wikipedia, NOS and others.
- The titles and descriptions of the competitors' pages.

Findings:

- **Little demand for the tool itself, yet.**
  - English: the only product phrases in autocomplete are "khutbah translation app", "live
    khutbah translation (app)" and "khutbah translator app". Most "khutbah translation" searches
    are about the Makkah/Madinah broadcasts.
  - Dutch: no tool phrase returns anything on any engine. That includes "khutbah vertaling",
    "vrijdagpreek vertaling", "live vertaling moskee" and "live ondertiteling moskee".
  - In Trends, "khutbah translation" scores 1 against "jummah khutbah" 30 (worldwide, 5 years).
  - Evidence: strong for "small", none for exact volume.
- **"Mosque/masjid screen" means prayer-time displays.** Masjidbox and Masjidal own those
  searches, so the pages do not chase them. Evidence: strong.
- **Dutch spelling.** Dutch mosques mostly write **khutbah**, sometimes khutba (Turkish-run
  organisations: khutba/hutbe). **Vrijdagpreek** is the general Dutch word: media, Diyanet's Dutch
  texts, and what people type to find sermons. Nobody writes chutba or chotba. "Vrijdagkhutbah"
  (the old title) has no demand at all. Evidence: medium–strong.
- **Lessons and talks** are **lessen** and **lezingen** in Dutch. "Lezing moskee" + city is a
  common search; "dars" and "halaqa" are not usable. Evidence: strong.
- **"Vertaling" is what people search; "ondertiteling" is what they see.** "Live vertaling" scores
  33 in Trends against "live ondertiteling" 1, and "live ondertiteling" searches are mostly about
  turning device captions off. Both words are kept: vertaling in the main titles, ondertiteling
  where it describes the text on the TV. Evidence: strong.
- **The market's vocabulary**: "live khutba(h) translation (for mosques)", "Friday sermon
  translation", "mosque TV captions". Competitors:

  | Product | Page | Model |
  |---|---|---|
  | Bayaan | https://bayaan.ai, with Dutch pages such as /nl/vrijdagpreek-vertaler | No public price (demo on request); Eindhoven |
  | KhutbaLive | https://khutbalive.com | Free, with donations |
  | Baian | https://baian.ai/khutbah-translation/ | Plans, no public price |
  | Clear Khutbah | https://clearkhutbah.com | $5–30 per month for mosques |
  | RecitID | https://recitid.ai/khutbah-translation | $9.99 per month (phone app) |

  Turjuman is the only one that is **open source and self-hostable**. It shows the translation on
  the mosque's own TV, projector or OBS, and "free" alone does not set it apart from KhutbaLive.

### 4.2 Keyword → page map

**English**

| Page | Primary | Secondary | Search intent |
|---|---|---|---|
| `/` | live khutbah translation | khutbah translation app, Friday khutbah translation, lessons and talks, mosque TV/projector, free and open source | A mosque board comparing tools |
| `/how-it-works` | how live khutbah translation works | real-time Arabic translation, Quran verse references, Athan/Iqama | Evaluating |
| `/show-on-a-screen` | captions on a TV, projector or in OBS | OBS live translation subtitles, OBS browser source | How-to |
| `/security` | (brand) Turjuman security | Soniox key, where the audio goes | Trust |
| `/self-host` | self-hosted / open-source live translation | self-hosted speech translation, open source live captions | Technical evaluation |
| `/install` | install Turjuman | Soniox API key | How-to (brand) |
| `/network` | HTTPS on a local network | microphone needs HTTPS, phone on the network | Technical (the only page with generic demand, mostly not mosques) |
| `/docker` | Turjuman Docker | always on, after a restart | Brand |
| `/commands` | Turjuman commands | make helpers | Navigational |

**Dutch**

| Page | Primary | Secondary | Search intent |
|---|---|---|---|
| `/nl` | live vertaling van de khutbah | vrijdagpreek, lessen en lezingen, tv of beamer in de moskee, gratis, open source | Mosque board (expect brand and referral traffic first) |
| `/nl/how-it-works` | zo werkt de live vertaling van de khutbah | Arabisch, Koranverzen, Athan/Iqama | Evaluating |
| `/nl/show-on-a-screen` | ondertiteling op een tv, beamer of in OBS | OBS ondertiteling (an existing search) | How-to |
| `/nl/security` | Turjuman beveiliging | Soniox-sleutel | Trust |
| `/nl/self-host` | Turjuman zelf hosten, open source | zelf hosten | Technical |
| `/nl/install` | Turjuman installeren | Soniox-sleutel | How-to |
| `/nl/network` | HTTPS op het moskeenetwerk | telefoon | Technical |
| `/nl/docker`, `/nl/commands` | (brand) | none | Navigational |

The doc pages mostly serve brand and long-tail searches; that is normal for documentation. The
home pages carry the head terms.

### 4.3 The titles and descriptions

They follow these rules:
- They state only what the pages show: live translation on the mosque's screens, the khutbah and
  also lessons and talks, 60 languages (How it works: "60 languages"), free and open source (MIT).
- They avoid hype words (the tests refuse "seamless", "empower", "revolutionize", "unlock",
  "cutting-edge" and others).
- The format is "topic · Turjuman", or a title with the brand inside it.

| Page | English | Dutch |
|---|---|---|
| Home title | Live khutbah translation for mosque screens · Turjuman | Live vertaling van de khutbah in je moskee · Turjuman |
| Home description | The Friday khutbah, lessons and talks, translated live on your mosque's TV or projector. 60 languages. Free and open source. | De vrijdagpreek (khutbah), lessen en lezingen, live vertaald op de tv of beamer in je moskee. 60 talen. Gratis en open source. |
| How it works | How live khutbah translation works · Turjuman | Zo werkt de live vertaling van de khutbah · Turjuman |
| Show on a screen | Show captions on a TV, projector or in OBS · Turjuman | Ondertiteling op een tv, beamer of in OBS · Turjuman |
| Security | Security: your keys, audio and data · Turjuman | Beveiliging: je sleutels, geluid en gegevens · Turjuman |
| Self-host | Self-host Turjuman: open source, on your own computer | Turjuman zelf hosten: open source, op je eigen computer |
| Install | Install Turjuman on your computer, step by step | Turjuman installeren op je computer, stap voor stap |
| Phone & network | Phone & network: HTTPS on the mosque's network · Turjuman | Telefoon & netwerk: HTTPS op het moskeenetwerk · Turjuman |
| Docker | Turjuman with Docker: always on, also after a restart | Turjuman met Docker: altijd aan, ook na een herstart |
| Commands | Turjuman commands and make helpers | Opdrachten van Turjuman en make-helpers |

The doc pages keep their descriptions, which already say what each page holds.

Arabic follows the same pattern, for example "ترجمة فورية لخطبة الجمعة على شاشات المسجد · ترجمان".
Arabic remains right to left. The Open Graph picture's alt text now says what the picture shows
(the brand and the headline).

## 5. AI search and answer engines

- **Google** (AI Overviews, AI Mode): "There are no additional requirements to appear in AI
  Overviews or AI Mode, nor other special optimizations necessary." A page must be "indexed and
  eligible to be shown in Google Search with a snippet". "You don't need to create new machine
  readable files, AI text files, or markup."
  https://developers.google.com/search/docs/appearance/ai-features
- "From Google Search's perspective, optimizing for generative AI search is optimizing for the
  search experience, and thus still SEO."
  https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- **llms.txt** is not a Google standard. The same guide says LLMS.txt files "will neither harm
  nor help your site's visibility or rankings in Google Search, as Google Search ignores them."
  John Mueller compared it to the keywords meta tag
  (https://www.searchenginejournal.com/google-says-llms-txt-comparable-to-keywords-meta-tag/544804/).
  The site does not have one, which is fine: Lighthouse counts a missing one as not applicable.
- **Search Console** has a "Search generative AI control"; "Include" is the default
  (https://support.google.com/webmasters/answer/16908024). Leave it.
- **ChatGPT search** shows only sites that allow `OAI-SearchBot`; `GPTBot` is training, and each
  setting is independent (https://developers.openai.com/api/docs/bots).
- **Perplexity**: `PerplexityBot` is for search, not training
  (https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
- **Claude**: `Claude-SearchBot` and `Claude-User` are for search, `ClaudeBot` for training
  (https://support.claude.com/en/articles/8896518).
- **Apple**: `Applebot` is search, `Applebot-Extended` is training
  (https://support.apple.com/en-us/119829).
- **Bing / Copilot** use "the same core crawling, indexing, and ranking foundation as traditional
  search". `NOARCHIVE` and `NOCACHE` limit Copilot (Bing guidelines, above). Bing Webmaster Tools
  has an AI Performance report:
  https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/

Turjuman wants to be found and cited, so robots.txt lets every bot in, including the training
bots. Blocking them would only make models know less about Turjuman. No page uses `nosnippet`,
`max-snippet` or `data-nosnippet`. What makes a page citable is what already helps search: clear
text that answers the questions people ask. For example, How it works answers "what it costs",
"which languages" and "is it free" in plain sentences.

## 6. What is left to do

Off the website. These are recommendations only; none of them is implemented here.

1. **Deploy this website at turjuman.nl.** Today `https://turjuman.nl/` serves an older app page
   (`<title>Turjuman</title>`), and `/nl`, `/robots.txt` and `/sitemap.xml` answer 404. Set
   `hosted.publicUrl: https://turjuman.nl`. Redirect `www.turjuman.nl` (if used) to
   `https://turjuman.nl` with a 301.
2. **Google Search Console** (https://search.google.com/search-console):
   - Add a Domain property; verification is by DNS record only
     (https://support.google.com/webmasters/answer/34592).
   - Submit `https://turjuman.nl/sitemap.xml`
     (https://support.google.com/webmasters/answer/7451001).
   - Use URL Inspection → Request indexing for `/` and `/nl`
     (https://support.google.com/webmasters/answer/9012289).
   - Watch Pages/Indexing for "Excluded by noindex". The app pages belong there.
3. **Bing Webmaster Tools** (https://www.bing.com/webmasters): import the site from Search Console,
   sitemap included
   (https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/).
   Copilot answers come from the same index ([section 5](#5-ai-search-and-answer-engines)).
   **IndexNow** (https://www.indexnow.org/documentation) is optional: a key file plus one request
   per deploy tells Bing, Yandex, Naver, Seznam and Yep what changed. Google does not take part.
4. **GitHub** (both repositories are public):
   - Add a description.
   - Change the homepage to the full `https://turjuman.nl` (and `https://turjuman.nl/self-host`
     for cli).
   - Add topics such as `islamic`, `islamic-app`, `muslim-app`, `mosque`, `khutbah`, `arabic`,
     `translation`, `live-captions`, `self-hosted`.

   Topic rules: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics.
   GitHub's links are `nofollow`, but they help people and crawlers find the site.
5. **Lists that fit:**
   - https://github.com/tarekeldeeb/awesome-islamic-open-source-apps. It is built automatically
     from the topics `islamic`/`islamic-app`/`muslim-app`/`quran` and needs at least 10 stars.
   - https://github.com/choubari/Awesome-Muslims (Web Apps)
   - https://github.com/AhmedKamal/awesome-Islam
   - AlternativeTo next to KhutbaLive and Bayaan.
   - Product Hunt.

   awesome-selfhosted is probably not eligible: it excludes software that depends on a specific
   cloud provider (Soniox) and needs a release older than 4 months.
6. **Real links from where mosques look** (the strongest signal; earned, never bought; see
   https://developers.google.com/search/docs/essentials/spam-policies):
   - Dutch mosque federations under CMO (https://www.cmoweb.nl/partners/, 380+ mosques):
     ISN/Diyanet, UMMON, SICN, Milli Görüş (NIF/MGN), TICF, TFN.
   - SPIOR in Rotterdam.
   - Mosques that use Turjuman, mentioning it on their own site ("khutbah live vertaald met
     Turjuman").

   A "powered by" link in every screen or footer is the kind of widget link Google's spam policy
   names. Keep any credit plain and branded, or `rel="nofollow"`.
7. **Google Business Profile does not apply**: it is for businesses with in-person contact; "online-only
   businesses" are not eligible (https://support.google.com/business/answer/13763036).
8. **Later, for search demand**: one plain page or FAQ answer per real question people ask, only
   when it is true and useful. Examples: "Mag de khutbah in het Nederlands?" ("can khutbah be in
   english" is an autocomplete), what it costs per khutbah (about 9 cents for 30 minutes at
   Soniox's prices), and how it compares with an interpreter. Measure in Search Console before
   writing more.
