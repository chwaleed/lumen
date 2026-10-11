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

**Weaknesses:**

- **One vendor's models, permanently.** Prism is an OpenAI product and runs OpenAI
  models. The user does not choose and cannot change. No single lab has held the lead
  on every task for long, and the model that is best at long-document reasoning this
  quarter may not be the one Prism is built on. A user who finds another model better
  for their work has no route to it short of leaving.
- **A ChatGPT account is the entry condition.** Access is tied to an account with one
  company, which also decides the terms. OpenAI has said stronger features may move
  behind paid plans later, so "free and unlimited" describes today's policy, not a
  property of the product.
- **Everything goes to one provider.** For unpublished research, a supervisor or an
  institution may have a view about which company sees the draft, and Prism offers no
  alternative.
- **Repair is on request.** The assistant fixes a fault when asked. Whether it will
  drive a build-and-fix cycle to completion under a stated ceiling is not documented.

**Where we differ:** the model is configuration, not architecture. LangChain sits
between the agent and the provider, so the model is chosen per deployment and can be
replaced as better ones appear, including self-hosted and non-OpenAI models. No account
with any particular vendor is required to use the editor.

*Unverified:* nobody here has used Prism. Sign up, run a real thesis through it, and
record what it actually does before relying on the last point in print.

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

Three claims, in the order they should be made:

1. **Any model, chosen per deployment.** The agent talks to the provider through
   LangChain, so the model is a setting rather than a design decision. As the frontier
   moves, the system follows it. Prism cannot: it is OpenAI's product running OpenAI's
   models, and the user has no say. This is the clearest separation and should lead.
2. **The agent closes the loop rather than advising on it.** It lists and reads files,
   writes changes, starts a compile, reads the parsed log, and iterates under a stated
   ceiling until the document builds, showing every change as a diff first. State this
   against Prism's repair-on-request, not against Overleaf's suggest-only assistant.
3. **Compilation is free and unlimited.** Answers Overleaf and TeXPage squarely.
   Against Prism it is parity, not advantage, so do not lead with it.

Supporting, not leading: parsed errors that link to the source line including inside an
`\input`-ed subfile, and a sandboxed compiler (no network, CPU/memory/PID/wall-clock
capped) so untrusted documents cannot reach the host.

## Risks to this position, stated honestly

- **OpenAI is in this market.** Prism shipped January 2026 with no compile ceiling and
  ChatGPT's distribution behind it. Competing on free compilation alone will not work;
  model independence and the agent loop are what the argument has to rest on.
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
