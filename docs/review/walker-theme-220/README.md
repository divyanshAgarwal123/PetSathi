# Walker theme review fix

The exact source head and parent are recorded in source.json. This fixes maintainer feedback on PR #220 using only the walker stylesheet and one booking-heading class. The shared main-section white-background rule used !important, so the page-specific heading background had been lost. Two scoped overrides restore the Cat Index title treatment and give the closing CTA an explicit sage/cream background. Booking status badges now use the same green palette.

No header/footer source or shared stylesheet changes are included. All existing caregiver/booking content and destinations remain. The browser report checks exact rendered header/footer DOM, all descendant computed theme/layout styles, and identical shell screenshot pixels at a common component origin. The common origin removes vertical subpixel rasterization differences caused by the intended main-content height changes; it does not change production styles.

Native browser acceptance passes trimmed/case-insensitive search, combined pet filters, empty/reset/keyboard states, all main-page destinations (HTTP 200), caregiver and handover navigation, real hero/icon resources, computed heading/CTA/status colors, equal card dimensions, reduced motion and 320/390/768/1024/1360px without overflow. No page errors or failed resources were observed. Fresh desktop/mobile screenshots were visually inspected. JS syntax and diff checks pass; this static page has no package build command.

## Reproduce

Serve the exact parent from one checkout on port 5410 and the source head from another on 5411 with Python http.server bound to 127.0.0.1. Install Playwright separately, set PLAYWRIGHT_MODULE to its ESM module, EVIDENCE_DIR to an existing output directory and PET_ROOT to the source checkout. Run browser-check.mjs. BEFORE_URL and PET_URL can override the two walker URLs. screenshots.mjs generates fresh desktop/mobile captures; set PLAYWRIGHT_MODULE and adjust its output directory if reproducing outside this local layout. Both use local Chrome at its default macOS path. No login or production data is used.
