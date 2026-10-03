# Venture Branding blog

Give Codex your approved article, title, short summary, author, date, category,
and optional image. Codex prepares the file and local preview. Review the result
before separately approving any commit, push, or publication.

## Article files

Copy `post-template.md.example` into `posts/` with a lowercase, hyphenated `.md`
filename. This name becomes `blog/posts/your-article.html`. Write the article in
Markdown below the second `---` line. Plain paragraphs, headings, lists, links,
quotes, and images are supported. Raw HTML is displayed as text.

The statuses are `draft`, `sample`, and `published`. Missing status defaults to
draft; invalid status fails the build. The sample is demonstration copy only.
Only `published` articles dated today or earlier (UTC) enter the normal build.
Changing a date does not automatically publish a site: rebuild and deployment
are separate actions. Newest dates appear first, with optional numeric `order`
as a tie-breaker (higher first).

Cover images are optional. Store them in `images/blog/`, use a repository-relative
path such as `images/blog/name.jpg`, and supply `imageAlt`. Article-body links
are relative to `blog/posts/`; use `../../v8.html#services` for the Services section.

## Build and preview

An existing Node.js runtime is required; no package installation is needed.
The Markdown parser is a locally bundled copy of Marked 18.0.11 (MIT license
included in `tools/vendor`). No dependency is loaded by the visitor's browser.

```
node tools/build-blog.mjs
node tools/build-blog.mjs --preview
node --test tools/blog.test.mjs
```

The first command generates `blog.html` and published article pages under
`blog/posts/`. The second creates an isolated copy under `work/blog-preview/`
including drafts/samples and a copy of V8. With the existing local server running,
open `/work/blog-preview/blog.html`. All preview blog pages are labeled and marked
noindex. Rebuild the preview after changing V8 or article content.

Generated files should be changed via the generator, article files, or
`blog/assets/`, not edited directly. The builder removes only obsolete generated
article HTML, including articles moved back to draft. Existing unrelated pages
are preserved. Unknown article addresses receive the static server's 404.

## Publication boundary

Draft status keeps content out of generated public pages. It does not make files
in a public GitHub repository confidential. Do not commit confidential drafts.
Before eventual hosting, use a clean publication folder excluding `content/`,
`tools/`, and `work/`; do not upload the local preview or serve the source repository
wholesale. Hosting is intentionally not configured in this phase. RSS, sitemap,
and final-domain sharing metadata are deferred to phase two.
