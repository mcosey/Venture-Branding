# Site Refresh (Two Variations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the templated SaaS-style site with two static HTML pages — `blog.html` (the blog, unadorned) and a rewritten `index.html` (firm splash anchored by the real founder bio) — sharing one editorial design language, with zero fabricated content.

**Architecture:** One shared stylesheet (`styles.css`) holds design tokens and all components. Two standalone HTML pages consume it. No build system, no JS, no external assets except Google Fonts. The blog article feed is a working template that ships with zero posts.

**Tech Stack:** Static HTML + CSS. Google Fonts: Source Serif 4 (editorial serif), Work Sans (UI/nav). Existing logo assets in `images/`.

**Spec:** `docs/superpowers/specs/2026-07-06-site-refresh-two-variations-design.md`

## Global Constraints

- **No fabricated content.** No invented stats, testimonials, trust badges, certifications, service lists, or placeholder blog posts. If real content doesn't exist for a section, the section is cut — not stubbed.
- No stock photography or avatar services: the strings `unsplash` and `pravatar` must not appear in any HTML file.
- The blog feed ships with **zero articles** — only an empty state.
- Colors: `--ink: #0D1521` (navy), `--brand: #E25160` (coral, used sparingly), neutral light surfaces carry the layout.
- Fonts: Source Serif 4 for headings/body prose, Work Sans for nav/labels/UI.
- Logo: `images/03.png` (lockup) in nav/footer; `images/09.png` as favicon.
- Founder bio text in the current `index.html` About section (4 paragraphs) is real content — carry it over **verbatim**. Founder photo: `images/Cosey_Marion__1994x1058-2.jpg`.
- The hero headline/subhead reuse the current site's existing copy ("Protect Your Brand Before Someone Else Does" / "Register your logo and trademark with legal experts. Fast, secure, and fully managed.") — this is the client's existing approved positioning copy, not new invention.
- **No contact email anywhere.** The `hello@venturelawclub.law` address in `branding.md` is template data. The spec's footer "contact email" is therefore omitted until the client supplies a real address (cut, not faked). Footers carry logo + copyright + (on index) in-page nav links only.
- Copyright line: `© 2026 Venture Branding, Inc. All rights reserved.` (already on the current site).

---

### Task 1: Shared stylesheet

**Files:**
- Create: `styles.css`

**Interfaces:**
- Produces: CSS classes consumed by Tasks 2–3: `.wrap`, `.site-header`, `.header-logo`, `.site-footer`, `.foot-links`, `.foot-copy`, `.feed`, `.feed-empty`, `.hero`, `.hero-mark`, `.btn`, `.about`, `.about-grid`, `.about-photo`, `.about-text`, `.from-blog`, `.eyebrow`, `.rule`.

- [ ] **Step 1: Write `styles.css`**

```css
/* Venture Branding — shared design language
   Editorial, whitespace-driven. Navy ink, restrained coral accent. */

:root{
  --ink:#0D1521;
  --ink-soft:#3A3F47;
  --ink-muted:#6E7680;
  --brand:#E25160;
  --surface:#FFFFFF;
  --surface-muted:#F7F6F3;
  --divider:#E5E3DE;
  --maxw:1040px;
  --serif:"Source Serif 4",Georgia,serif;
  --sans:"Work Sans",Helvetica,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  font-family:var(--serif);
  color:var(--ink);
  background:var(--surface);
  line-height:1.65;
  font-size:18px;
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}

/* Type utilities */
.eyebrow{
  font-family:var(--sans);
  font-size:13px;
  font-weight:600;
  letter-spacing:.14em;
  text-transform:uppercase;
  color:var(--brand);
}
.rule{width:64px;height:2px;background:var(--brand);border:0;margin:28px 0}

/* Header */
.site-header{border-bottom:1px solid var(--divider);background:var(--surface)}
.site-header .wrap{display:flex;align-items:center;justify-content:space-between;height:88px}
.header-logo img{height:44px;width:auto}
.site-nav{display:flex;gap:32px;font-family:var(--sans);font-size:15px;font-weight:500}
.site-nav a{color:var(--ink-soft);transition:color .15s}
.site-nav a:hover{color:var(--brand)}

/* Buttons / links */
.btn{
  display:inline-block;
  font-family:var(--sans);
  font-size:15px;
  font-weight:500;
  padding:14px 32px;
  border:1px solid var(--ink);
  color:var(--ink);
  background:transparent;
  transition:background .15s,color .15s;
}
.btn:hover{background:var(--ink);color:#fff}
.text-link{
  font-family:var(--sans);
  font-size:15px;
  font-weight:500;
  color:var(--brand);
  border-bottom:1px solid currentColor;
  padding-bottom:2px;
}

/* Hero (index) */
.hero{padding:110px 0 100px;text-align:center}
.hero-mark{height:96px;width:auto;margin:0 auto 40px}
.hero h1{
  font-weight:600;
  font-size:clamp(34px,5.5vw,58px);
  line-height:1.2;
  letter-spacing:-.01em;
  max-width:760px;
  margin:0 auto 24px;
}
.hero h1 em{font-style:italic;color:var(--brand)}
.hero p{
  color:var(--ink-muted);
  font-size:19px;
  max-width:560px;
  margin:0 auto 40px;
}

/* Section scaffolding */
.section{padding:90px 0;border-top:1px solid var(--divider)}
.section h2{font-weight:600;font-size:clamp(26px,3.5vw,36px);line-height:1.25;margin:14px 0 0}

/* About (index) */
.about-grid{display:grid;grid-template-columns:0.85fr 1.15fr;gap:64px;align-items:start;margin-top:48px}
.about-photo img{width:100%;border-radius:2px}
.about-text p{color:var(--ink-soft);margin-bottom:22px}
.about-text p:last-child{margin-bottom:0}

/* From the blog (index) */
.from-blog{background:var(--surface-muted)}
.from-blog .wrap{max-width:720px;text-align:center}
.from-blog p{color:var(--ink-soft);margin:20px 0 32px}

/* Article feed (blog) */
.feed{padding:80px 0 120px}
.feed-intro{max-width:640px;margin-bottom:64px}
.feed-intro h1{font-weight:600;font-size:clamp(30px,4.5vw,44px);line-height:1.2;margin:14px 0 0}
.feed-list{list-style:none}
.feed-item{padding:40px 0;border-top:1px solid var(--divider)}
.feed-item .meta{
  font-family:var(--sans);
  font-size:13px;
  color:var(--ink-muted);
  letter-spacing:.06em;
  text-transform:uppercase;
  margin-bottom:10px;
}
.feed-item h2{font-weight:600;font-size:26px;line-height:1.3;margin-bottom:10px}
.feed-item h2 a:hover{color:var(--brand)}
.feed-item .excerpt{color:var(--ink-soft);font-size:17px;max-width:640px}
.feed-empty{
  border-top:1px solid var(--divider);
  padding:72px 0;
  color:var(--ink-muted);
  font-style:italic;
  font-size:19px;
}

/* Footer */
.site-footer{border-top:1px solid var(--divider);background:var(--surface-muted);padding:64px 0;text-align:center}
.site-footer .foot-logo img{height:40px;width:auto;margin:0 auto 28px}
.foot-links{
  display:flex;justify-content:center;gap:36px;
  font-family:var(--sans);font-size:14px;font-weight:500;
  margin-bottom:24px;
}
.foot-links a{color:var(--ink-soft)}
.foot-links a:hover{color:var(--brand)}
.foot-copy{font-family:var(--sans);font-size:13px;color:var(--ink-muted)}

@media(max-width:860px){
  .about-grid{grid-template-columns:1fr;gap:40px}
  .site-header .wrap{height:72px}
  .header-logo img{height:36px}
  .hero{padding:80px 0 70px}
  .section,.feed{padding:64px 0}
}
```

- [ ] **Step 2: Verify the file parses (no obvious syntax errors)**

Run: `grep -c '{' styles.css && grep -c '}' styles.css`
Expected: two equal numbers (balanced braces).

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add shared editorial stylesheet for site refresh"
```

---

### Task 2: Variation A — `blog.html`

**Files:**
- Create: `blog.html`

**Interfaces:**
- Consumes: `styles.css` classes from Task 1.
- Produces: `blog.html` as the link target for Task 3's nav and "From the blog" section.

- [ ] **Step 1: Write `blog.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog — Venture Branding</title>
<meta name="description" content="Essays on trademarks, brand protection, and the goals of the firm.">
<link rel="icon" type="image/png" href="images/09.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Work+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="header-logo" href="index.html"><img src="images/03.png" alt="Venture Branding"></a>
  </div>
</header>

<main class="feed">
  <div class="wrap">
    <div class="feed-intro">
      <span class="eyebrow">The Blog</span>
      <h1>On trademarks, brands, and building things worth protecting.</h1>
    </div>
    <!-- Article feed. Each post is a .feed-item <li>; see the commented
         template below. Ships empty by design — no placeholder posts. -->
    <ul class="feed-list">
      <!--
      <li class="feed-item">
        <div class="meta">Month DD, YYYY</div>
        <h2><a href="posts/slug.html">Post title</a></h2>
        <p class="excerpt">One- or two-sentence excerpt.</p>
      </li>
      -->
    </ul>
    <p class="feed-empty">No articles yet — the first essays are on their way.</p>
  </div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <a class="foot-logo" href="index.html"><img src="images/03.png" alt="Venture Branding"></a>
    <div class="foot-copy">© 2026 Venture Branding, Inc. All rights reserved.</div>
  </div>
</footer>

</body>
</html>
```

- [ ] **Step 2: Verify no fabricated/template content**

Run: `grep -iE 'unsplash|pravatar|testimonial|3\.8K|2\.1K|venturelawclub' blog.html; echo "exit: $?"`
Expected: no matching lines, `exit: 1`.

- [ ] **Step 3: Visual check**

Run: `open blog.html`
Expected: header with logo, blog intro heading, empty-state line, footer. No broken images, no horizontal scroll at narrow widths.

- [ ] **Step 4: Commit**

```bash
git add blog.html
git commit -m "feat: add blog page (variation A) with empty article feed"
```

---

### Task 3: Variation B — rewrite `index.html`

**Files:**
- Modify: `index.html` (full replacement of contents)

**Interfaces:**
- Consumes: `styles.css` (Task 1), `blog.html` (Task 2), founder bio paragraphs copied **verbatim** from the current `index.html` About section (lines 328–331 of the pre-rewrite file — copy them before overwriting).

- [ ] **Step 1: Copy the four founder-bio paragraphs out of the current `index.html`** (the `<p>` elements inside `.about-text`, beginning "My interest in startups began long before law school…"). They are reproduced in Step 2 below; verify they match the old file exactly before overwriting.

- [ ] **Step 2: Replace `index.html` with:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Venture Branding — Protect Your Brand Before Someone Else Does</title>
<meta name="description" content="Register your logo and trademark with legal experts. Fast, secure, and fully managed.">
<link rel="icon" type="image/png" href="images/09.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=Work+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="header-logo" href="index.html"><img src="images/03.png" alt="Venture Branding"></a>
    <nav class="site-nav">
      <a href="blog.html">Blog</a>
      <a href="#about">About</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <img class="hero-mark" src="images/09.png" alt="">
    <h1>Protect your brand <em>before</em> someone else does.</h1>
    <p>Register your logo and trademark with legal experts. Fast, secure, and fully managed.</p>
    <a class="btn" href="blog.html">Read the blog</a>
  </div>
</section>

<section class="section" id="about">
  <div class="wrap">
    <span class="eyebrow">About</span>
    <h2>Helping founders bring their ideas to life.</h2>
    <div class="about-grid">
      <div class="about-photo">
        <img src="images/Cosey_Marion__1994x1058-2.jpg" alt="Founder, Venture Branding">
      </div>
      <div class="about-text">
        <p>My interest in startups began long before law school. During my sophomore year of college, after watching <em>The Social Network</em>, I became fascinated by the idea that a simple idea could grow into a transformative business. I spent countless hours brainstorming startup concepts with friends and roommates, pitching everything from social platforms to technology-enabled services. Most of those ideas never went anywhere, but the process sparked a lasting interest in entrepreneurship, innovation, and the people willing to take the risk of building something from nothing.</p>
        <p>That interest followed me through law school, where I eventually launched a startup of my own and successfully secured federal trademark protection for its brand through an intent-to-use trademark application. Going through that process firsthand gave me an appreciation for the excitement, uncertainty, and optimism that accompany the earliest stages of a new venture.</p>
        <p>Although I built my legal career in corporate law, I found myself most energized by the founders behind the businesses. I enjoyed learning about their ideas, understanding what they were trying to build, and helping them navigate the legal issues that stand between concept and execution. Over time, I realized that my greatest professional interest was not simply practicing law; it was helping founders bring their ideas to life.</p>
        <p>At Venture Branding, that philosophy begins with trademarks. For many founders, selecting and protecting a brand is one of the first major legal milestones in the life of a company. It is also one of the most exciting. A trademark transforms an idea into something tangible: a name, a brand, and an identity that customers can recognize and trust. My goal is to help founders protect that identity while preserving the momentum and excitement that inspired them to start building in the first place.</p>
      </div>
    </div>
  </div>
</section>

<section class="section from-blog">
  <div class="wrap">
    <span class="eyebrow">From the Blog</span>
    <h2>Learn how the trademark process actually works.</h2>
    <p>Essays on trademarks, brand protection, and the goals of the firm — written to help founders understand each step before they take it.</p>
    <a class="text-link" href="blog.html">Visit the blog</a>
  </div>
</section>

<footer class="site-footer">
  <div class="wrap">
    <a class="foot-logo" href="#"><img src="images/03.png" alt="Venture Branding"></a>
    <div class="foot-links">
      <a href="blog.html">Blog</a>
      <a href="#about">About</a>
    </div>
    <div class="foot-copy">© 2026 Venture Branding, Inc. All rights reserved.</div>
  </div>
</footer>

</body>
</html>
```

- [ ] **Step 3: Verify bio carried over verbatim**

Run: `git diff HEAD -- index.html | grep '^-.*The Social Network'; git show HEAD:index.html | grep -o 'momentum and excitement' && grep -o 'momentum and excitement' index.html`
Expected: the two bio phrases appear in both old and new versions (bio preserved).

- [ ] **Step 4: Verify no fabricated/template content**

Run: `grep -iE 'unsplash|pravatar|testimonial|3\.8K|2\.1K|dashboard|venturelawclub|Bonnie Green|Amelia Hart' index.html; echo "exit: $?"`
Expected: no matching lines, `exit: 1`.

- [ ] **Step 5: Visual check**

Run: `open index.html`
Expected: typographic hero with logo mark, About with photo + bio, From-the-Blog band, footer. Nav "Blog" link goes to `blog.html`. No broken images; layout stacks cleanly below 860px.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: rewrite homepage (variation B) — hero, founder bio, blog teaser"
```

---

### Task 4: Final sweep

**Files:**
- Modify: none expected (fix-ups only if checks fail)

- [ ] **Step 1: Repo-wide fabricated-content check on shipped pages**

Run: `grep -riE 'unsplash|pravatar|testimonial|SOC 2|BBB|USPTO Reg|Marks Registered|Brands Protected|venturelawclub|555 01' index.html blog.html styles.css; echo "exit: $?"`
Expected: no matches, `exit: 1`.

- [ ] **Step 2: Asset integrity — every referenced local asset exists**

Run: `grep -hoE '(images/[^"]+)' index.html blog.html | sort -u | while read f; do [ -f "$f" ] || echo "MISSING: $f"; done`
Expected: no output.

- [ ] **Step 3: Cross-browser/responsive spot check**

Run: `open index.html blog.html`
Expected: both pages render with shared header/footer styling; resize to ~375px width — no horizontal scroll, about grid stacks.

- [ ] **Step 4: Commit any fix-ups (skip if none)**

```bash
git add -A && git commit -m "fix: final sweep adjustments for site refresh"
```
