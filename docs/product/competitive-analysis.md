# Competitive analysis

**Status:** current as of 2026-10-11. Figures taken from vendors' own pages on that date.

Why this file exists: "why build this when Overleaf exists" is the first question an
examiner, an investor or a new engineer asks, and the honest answer has moved. Overleaf
shipped AI in 2025. The old pitch ("they have no AI") is dead. What follows is the
version that survives scrutiny.

---

## The market

Overleaf is the default and is not close to being displaced: Digital Science put it at
**20+ million users** when it launched its AI writing tools in June 2025. Any argument
that starts by predicting users will abandon it is not credible. The opening is a gap in
capability, not in market share.

## The four systems worth comparing

### 1. Overleaf — the incumbent

| | |
|---|---|
| Free | $0, **1 collaborator per project**, basic compile timeout, **5 AI uses per day** |
| Student | $8.25/mo annual, 10 collaborators, **24× basic compile timeout** |
| Standard | $16.75/mo annual, 10 collaborators, 10 AI uses/day |
| Pro | $33.25/mo annual, unlimited collaborators, full AI access |

Strengths: enormous template library, real-time collaboration, Git/Dropbox/reference
manager integrations, institutional accounts.

**AI, precisely.** Overleaf has an AI Assistant, Error Assist, Writefull language
suggestions, TeXGPT, an equation generator and a table generator. This is a real feature
set and it must not be understated. What it does *not* do is stated in Overleaf's own
documentation: Error Assist "explains LaTeX errors and suggests fixes," the assistant
lets you "chat with your document," and the docs instruct users to "always review
suggestions before applying them." The human applies every change, runs every compile,
and reads every resulting error.

**The limits that matter to a thesis writer:**

- **The free compile timeout.** A thesis with a bibliography, TikZ figures and a
  first-run index does not finish in the basic window. The fix is a subscription.
- **AI is metered by the day,** not by the task. Five uses does not survive one real
  debugging session.
- **The assistant is turn-based.** It cannot create a file, wire it in with `\input`,
  compile, read the log and correct itself. That loop is the actual work.

### 2. Prism (OpenAI) — read this one first

**Released January 2026.** Free to anyone with a ChatGPT account. **No compile limit,
no project limit, unlimited collaborators.** Real-time collaboration. An assistant
built into the editor: context-aware proofreading, image-to-LaTeX, zip import, and a
**"Fix with AI"** control that repairs faults such as a figure missing from the output.

**This breaks both of the claims below.** Our position was (1) compilation free and
unlimited, and (2) AI that acts rather than advises. Prism is free and unlimited, is
backed by OpenAI's distribution to every ChatGPT user, and its AI repairs errors rather
than only explaining them. It also ships zip import, which we built as a differentiator.

What is left that is actually defensible, and it is thin:

- **No vendor account required.** Prism needs a ChatGPT account; OpenAI has said more
  capable features may move behind paid plans later, so the free terms are a decision
  and not a guarantee.
- **Provider independence.** LangChain abstracts the model, so ours can be replaced.
  Prism is bound to OpenAI's models by construction.
- **A bounded agent loop with diff review.** Prism's assistance repairs on request.
  Ours is specified to iterate to a working build under a stated ceiling, showing every
  change before it lands. *This distinction is unverified* — nobody here has used Prism.
  Verify before relying on it in print.

Do not write a comparison against Prism that we have not tested. Sign up, run a real
thesis through it, and record what it actually does.

### 3. TeXPage

**30-second compile limit free**, 300–600s paid, entry paid tier **$5/month**. Git on
the free plan. Sells on security: encrypted in transit and at rest. Visual formula
editor and GUI table generation.

Weakness: 30 seconds is below what a long document needs, and the GUI helpers address
symptoms of LaTeX's difficulty rather than the project-scale problem.

### 4. The local toolchain (TeX Live + TeXstudio or VS Code)

Free and unlimited, which the hosted editors are not. The costs are a multi-gigabyte
install, manual package management, and no help when a build breaks. Copilot-style
assistance in VS Code completes the current file; it has no model of the project and no
awareness of whether the document compiles.

---

## Where every one of them stops

All four leave the same loop to the human:

> write → compile → read an error that names a line but not the cause → guess → compile
> again

For a 40-file thesis this loop is most of the work, and it is precisely the loop that
software development automated years ago. Claude Code, Cursor and similar tools edit
many files, run the build, read the failure and iterate. **Prism is the first to come close, and it is three months old.**

## Our position

**Both original claims are now contested by Prism, which is free, unlimited and backed
by OpenAI.** What remains:

1. **Compilation is free and unlimited.** Still true, no longer distinctive. It answers
   Overleaf and TeXPage; it does not answer Prism.
2. **The agent closes the loop rather than advising on it.** Still the strongest claim,
   but it must now be stated against Prism's "Fix with AI" rather than against
   Overleaf's suggest-only assistant, and the difference has not been measured.
3. **No dependence on one model vendor.** New, and the clearest remaining separation:
   no ChatGPT account required, and the provider is swappable behind LangChain.

Supporting, not leading: parsed errors that link to the source line including inside an
`\input`-ed subfile, and a sandboxed compiler (no network, CPU/memory/PID/wall-clock
capped) so untrusted documents cannot reach the host.

## Risks to this position, stated honestly

- **OpenAI already built one.** Prism shipped in January 2026, free, with no compile
  ceiling. This is no longer a hypothetical competitor response; it has happened, and it
  happened before this product reached its own agent.
- **Overleaf can build an agent too.** They have 20M users, the money and the head
  start. Our defence is focus and speed, not a moat.
- **Our agent is not built yet.** The tool loop, compile-fix iteration, multi-file
  editing and diff review are all unbuilt as of this date. Until they ship, the product
  is a competent free editor and the differentiator is a plan.
- **Citation fabrication is an existential risk, not a bug.** One invented reference in
  a submitted thesis ends the product's credibility in academia.
- **No realtime collaboration.** Deliberate for v1, but it is the feature Overleaf users
  name first, and the single-owner model will not survive contact with a research group.

---

## Sources

- Overleaf plans and pricing — https://www.overleaf.com/user/subscription/plans
- Overleaf AI features documentation — https://docs.overleaf.com/integrations-and-add-ons/ai-features
- Overleaf compile timeouts — https://docs.overleaf.com/troubleshooting-and-support/fixing-and-preventing-compile-timeouts
- Digital Science, AI writing tools for 20M+ Overleaf users (June 2025) — https://www.digital-science.com/blog/2025/06/digital-science-launches-new-cutting-edge-ai-writing-tools-for-20-million-overleaf-users/
- Prism (OpenAI) — https://openai.com/prism/ and https://openai.com/index/introducing-prism/
- Prism capability summary, HKUST Library (Jan 2026 release) — https://library.hkust.edu.hk/news-events/news/prism-new-ai-latex-editor-academic-writing
- TeXPage figures via comparison surveys; verify against https://www.texpage.com before citing in print
