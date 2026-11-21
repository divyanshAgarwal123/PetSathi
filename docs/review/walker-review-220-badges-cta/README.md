# Walker review follow-up — PR #220

Source: `c089ce8bbe3a2d49f8f66b48f0a6777506c51295`. Compared with the previous repair `6b46a10fe5dfb9d5663632aef5d8302ef37c8ec5` and the actual current Cat/Dog Index and homepage. This addresses the new floating-badge, arrow, heading-size and closing-CTA review. Badge copy describes the planned directory, not a live service or verified walker availability.

The two floating badges use the existing Dog hero treatment. The caregiver heading now includes the reference label, 1400px maximum width and a 242px desktop minimum height (the Dog reference measures 242.125px at 1360px). Mobile uses natural height. The closing panel follows the actual homepage eyebrow, two actions, colors, spacing, type and responsive layout. All existing caregiver destinations and booking records/actions remain.

## Validation

- Native functional, filter/search/reset, empty-state, keyboard, navigation and resource checks pass.
- Ten existing Cat component comparisons plus six direct homepage CTA comparisons pass at each of 320/390/768/1024/1360px.
- Both floating badges stay inside every tested viewport; all cards retain equal dimensions; no overflow, page errors or failed resources.
- Header/footer DOM, descendant computed styles and strict whole-pixel component interiors are identical to the separate baseline. The fractional outside footer edge is excluded from the screenshot clip. Booking-card markup is byte-identical.
- The hosted Netlify preview serves the exact CSS SHA256 in `source.json` and passes fresh 1360/390px reference, layout, badges and filters checks. Desktop and mobile screenshots were visually reviewed.
- The formal review remains subject to human re-review; passing these checks does not mean the PR is approved or merged.

## Reproduce

Check out c089ce8bbe3a2d49f8f66b48f0a6777506c51295. Serve that tree on localhost:5430 and a separate checkout of comparisonHead on localhost:5431 (Python's `http.server` is sufficient). Install Playwright outside the repository and point `PLAYWRIGHT_MODULE` to its importable entry point. Set `CHROME_PATH` if needed. Create the output directory first:

```sh
mkdir -p /tmp/walker-proof
PET_ROOT=/absolute/path/to/source PET_URL=http://127.0.0.1:5430/frontend/pages/walker/index.html BEFORE_URL=http://127.0.0.1:5431/frontend/pages/walker/index.html EVIDENCE_DIR=/tmp/walker-proof PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node browser-check.mjs
```

The script uses actual browser rendering and actual reference pages, not mocked style values. External fonts/icons/images require network access. Timing and screenshots describe the recorded local Chrome/macOS environment.
