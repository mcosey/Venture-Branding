# Venture Branding site refresh — two variations

## Context

The current `index.html` is a single-page site built from a demo template
("Venture Law Club") with the Venture Branding logo swapped in. It carries a
dark-navy/coral SaaS-style aesthetic (stock photography, card grids, stat
counters, a testimonial carousel, trust badges) and fabricated/placeholder
content inherited from the template: invented stats (3.8K+ marks registered),
a single unverified testimonial, and a services list not confirmed to match
what Venture Branding actually offers.

The only genuinely real, polished content on the current site is the founder
bio/about section and the logo assets (`images/03.png` wordmark lockup,
`images/09.png` icon-only mark).

## Goal

Move away from the SaaS-template look toward a "modern, minimal, important,
detailed" law-firm aesthetic, with the blog positioned as the site's main
feature — the place visitors learn about the firm's goals and the trademark
process itself.

Produce two standalone static HTML variations sharing one visual design
language:

- **Variation A (`blog.html`)** — the blog, unadorned. Just the firm's
  identity + an article feed. Not a marketing page.
- **Variation B (`index.html`)** — a firm splash page that sells the firm,
  using the blog as the credibility/proof layer, anchored by the real founder
  bio.

CMS/content-management approach for authoring blog posts going forward is
explicitly **out of scope** for this pass — deferred to a later design cycle.

## Hard constraint: no fabricated content

This is the most important requirement of this redesign and applies to both
variations without exception:

- No invented statistics, counts, or metrics.
- No testimonials (fabricated or template-inherited).
- No trust badges, certifications, or compliance claims (SOC 2, BBB, USPTO
  registration counts, etc.) unless independently confirmed true.
- No services list beyond what's already confirmed on the current site
  (the four generic categories: Logos, Business Names, Slogans, Copyrights).
  The more detailed 6-service breakdown in `branding.md` describes the
  template source ("Venture Law Club") and must NOT be carried over as if it
  describes Venture Branding.
- No placeholder blog posts. The blog is a working template shipped with
  **zero articles** — not stub/lorem content to be replaced later.
- If a section would require inventing or guessing content to fill it, the
  section is cut entirely, not stubbed in "to add later." Sections get added
  in a future pass once real content exists.

## Shared design foundation

**Color:** Keep the existing brand colors, executed more like an editorial
publication than a SaaS product:
- `--ink` `#0D1521` (navy, dark text/surfaces)
- `--brand` `#E25160` (coral accent — used sparingly: links, small accents,
  not large CTA blocks or card fills)
- Neutral surfaces (white/off-white/light gray) carry most of the layout;
  the coral accent stays restrained.

**Typography:** Replace the display serif (Bodoni Moda) with an editorial
serif built for long-form reading, since the blog is now the centerpiece.
Candidate: **Source Serif 4** (Google Fonts) for headings and article body
text, paired with **Work Sans** (already loaded) for nav/labels/UI chrome.

**Logo:** Use the existing lockup (`images/03.png`) in nav and footer on both
variations. Use the icon-only mark (`images/09.png`) as the favicon.

**Layout approach:** Whitespace-driven, typographic hierarchy over card
grids and iconography. No stock photography sourced from Unsplash/placeholder
avatar services (i.e., remove `images.unsplash.com` and `i.pravatar.cc`
references from the current site — those are template filler, not real
brand photography).

**Article feed template (shared component):** A list/grid layout for blog
posts — title, date, short excerpt, tag(s) — that renders correctly with
zero entries (e.g., a simple "No posts yet" state or just an empty feed
container) and will hold real posts once they exist. No placeholder posts
are included in this build.

## Variation A — `blog.html`

Purpose: the blog on its own, presented as a real publication, not a
marketing funnel.

- **Header:** logo + wordmark, linking home. No services/about/contact nav
  links — this page doesn't pitch the firm.
- **Body:** the shared article feed template. Ships empty.
- **Footer:** logo, contact email, copyright line. Nothing else.

## Variation B — `index.html`

Purpose: a firm splash page anchored by real content only.

- **Hero:** short headline + subhead + a single CTA. Typographic — built
  from the logo mark and type, not a stock photo banner.
- **About:** the existing founder bio content, carried over as-is (already
  real and polished).
- **Featured blog section:** a teaser pointing to `blog.html`, pulling from
  the same empty article feed template. When there are no posts yet, this
  section either shows an empty state consistent with the blog page or is
  omitted — it must not show fabricated post previews.
- **Footer:** same as Variation A, plus nav links (Blog, About, Contact).

**Cut entirely from the current site (not carried to either variation):**
services card grid, stats/counter row, testimonial carousel, trust-badge
row, "all in one dashboard" mockup section, "how it works" step section.
These were template/demo content, unverified or fabricated.

## Out of scope

- Blog CMS / content authoring workflow (markdown+static-site-generator vs.
  headless CMS vs. hand-written HTML) — to be decided in a future session.
- Real blog article writing.
- Confirming/expanding the real services list beyond the four existing
  generic categories.
- Contact form functionality (current site's form is non-functional markup;
  no backend exists in this repo).
