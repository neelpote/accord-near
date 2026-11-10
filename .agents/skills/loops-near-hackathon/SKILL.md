---
name: loops-near-hackathon
description: >-
  Build for the NEAR HACKATHON on Loops House: ideate with the AI
  mentor, query sponsor knowledge graphs (graph-RAG over their docs), create
  and update the project submission, save ideation artifacts, and evaluate the
  project against each sponsor's judging criteria. Use this skill whenever the
  user mentions NEAR HACKATHON, this hackathon, its sponsors or bounties,
  submitting or improving their hackathon project, sponsor docs/SDKs, judging,
  or asks "what should I build" — even if they never say "loops".
version: 0.6.0
requires_bin: loops
---

# NEAR HACKATHON — Loops House skill

Help the builder compete in ONE event: `near-hackathon`. This skill carries the event data, ready-to-run `loops` commands, and the workflow below. Commands come pre-filled with the right slugs — replace only the `<angle-bracket>` placeholders. Never invent or substitute ids: the user has at most one project per event (team membership counts), and the platform resolves it from the session, so no project id appears anywhere in this skill.

The user has no project here yet. Ideate freely; create one with `loops project create` when they are ready to submit.

## How to work with the builder

**This is a conversation, not a script.** The builder is entering a
competition that judges *their* work. Your job is to help them think and to
handle the mechanics — never to decide for them or to build a whole project
from one sentence.

Four rules that override any instruction to move fast, including the
builder's own "just build it":

1. **Never submit or update anything they have not seen and approved.** Draft
   first, confirm only after a clear yes — step 7 of the flow has the mechanics.
2. **Never choose their sponsor or bounty for them.** Ask which one, and wait for the answer.
3. **Never start writing project code off a one-liner.** Get a direction they
   have actually agreed to first.
4. **Ask one question at a time.** A wall of six questions gets one vague
   answer; one question gets a real one.

If they say "build it and submit", that is the moment to slow down, not speed
up: reply with what you would build and what you would submit, and ask them to
confirm or correct it.

## The flow

Each step ends where the builder speaks. Do not run ahead of them.

1. **Check auth.** `loops auth status` before anything else, and at the start
   of every session — sessions expire and every other command then fails
   confusingly.
2. **Orient, then report back.** Read the event data below (stage, deadlines,
   sponsors) and run `loops project get --event near-hackathon`. Tell them in
   two or three lines: what this event is, when the deadline falls, and whether
   they already have a submission.
3. **Registration is off for this event** — skip `loops enroll` and get building. Their first `project create` registers them: the draft names the account and email it will use, so show them that line too. If it says an email is needed, have them sign in with `loops auth login --email <address>` before submitting.
4. **Ask what they want to build.** Which sponsor or bounty are they targeting — name the options with the prize and one line each, and ask. Then ask what they have in mind, even roughly. **Wait for an answer to both.**
5. **Ideate with them, not for them.** Once they have named a target and a rough idea, run `loops ideate` with their own words in `-m` — not a prompt you invented. Bring the mentor's reply back, then ask which direction they want. Ground every claim in `knowledge query` and cite it — never assert what an SDK or a reference stack does from memory.
6. **Build only what they agreed to.** Their repo, their commits. If scope
   drifts past what they approved, say so and ask.
7. **Draft the submission, then let them decide.** Run `project create`
   (or `project update`) **without** `--confirm` first. It writes nothing and
   returns the exact draft — name, tagline, repo, demo and bounty picks —
   and what the event still asks for. Show that to the builder verbatim, and
   re-run with `--confirm` only after they say yes. **Never pass `--confirm` on the first call or on their behalf.** A
   submission is what the judge reads; a wrong one costs them the event.
8. **Submit, then evaluate.** After an explicit yes, create or update. Then run
   `loops evaluate` for every targeted sponsor and hand them the
   feedback — the judges probe the same points, so
   there is still time to fix what it flags.

Command output is structured (add `--json` for machine-readable form) and often ends with a suggested next command (CTA) — follow it rather than guess. On `NOT_AUTHENTICATED`, run the auth flow. On `credits_exhausted`, stop and tell the user — never retry.

## Authenticate

```sh
loops auth status                        # run FIRST — who am I?
loops --version   # must match this skill's frontmatter `version`
```

If the installed CLI is older than this skill's `version`, update first (`npm install -g loopshouse@latest`) — the commands below assume the stamped version.

A failed check means the CLI still needs install + login. Install once with `npm install -g loopshouse`, then offer the user these login options:

- **Google**: `loops auth login --provider google` — opens the browser.
- **GitHub**: `loops auth login --provider github` — opens the browser.
- **Email one-time code**: `loops auth login --email <you@example.com>` sends a 6-digit code; verify with `loops auth verify --email <you@example.com> --code <123456>`.

In headless contexts the browser flows print a URL for a human to open. Re-run `loops auth status` to confirm before continuing.

## Read the event data

Treat this TOON document as ground truth for the event (TOON = compact JSON: `key: value` lines; a uniform array renders as a `name[N]{col1,col2,…}:` header plus one comma-separated row per element):

```toon
event:
  slug: near-hackathon
  name: NEAR HACKATHON
  tagline: Build what's next
  stage: registration_open
  stageMeaning: Registration open — enroll and start ideating
  timezone: UTC
  prizeCurrency: USD
  startsAt: "Nov 1, 2026, 12:00 AM (UTC)"
  submissionDeadline: "Nov 14, 2026, 11:59 PM (UTC)"
  registrationDeadline: "Nov 14, 2026, 11:59 PM (UTC)"
  description: "> **Official site: [nearhackathon.com](https://nearhackathon.com/)** > Tracks, judges, rules and the HACKATHON.md for your AI agent all live there. > **API credits: [nearbuilders.org](https://nearbuilders.org/join)** > Backend access for this hackathon is distributed through NEAR Builders. Create a builder profile there to get your credits; access only works for registered builders. Autonomous payments. Intelligent agents. Money with a mind of its own. The era of programmable money starts here. Build on NEAR across 13 tracks, from Unstoppable DeFi and Private AI to Agent Economies, AI Swarms, Real-World Money and Games With Real Economies. $250K in prizes, paid in NEAR: a $55K Grand Prize, plus $10K / $3K / $2K for 1st, 2nd and 3rd place in every track. **Timeline (UTC)** - Hackathon starts: 1 Nov 2026, 00:00. No sign-up needed to start building. - Development: 1–14 Nov 2026 - Submission deadline: 14 Nov 2026, 23:59 - Judging: 16–18 Nov 2026. Results by 18 Nov 2026, 23:59. **How to submit** 1. Build during the hackathon. 2. Publish a public repository. Judges can't open private ones. 3. Post a demo on X saying you built it at NEAR HACKATHON, with a video or screenshots. 4. Submit the repository link, the demo post link and the NEAR wallet address prizes should go to. One submission per team. A project can enter several tracks and still counts as one submission. No wallet connection is needed to submit. **Judges** Illia Polosukhin (NEAR Protocol), Eddy Lazzarin (a16z crypto), …"
sponsors[14]:
  - slug: near
    name: NEAR Protocol
    tier: title
    prizePool: null
    tagline: The blockchain for AI
    website: "https://near.org"
    description: "NEAR Protocol is a sharded layer-1 blockchain built for apps that people and AI agents can use without thinking about the chain. Accounts have human-readable names like alice.near, transactions are fast and cheap, and one account can act across chains. What you can build on: - NEAR Intents: say what you want (swap, pay, settle) and solvers execute it across chains, with no bridges to manage. - Chain Signatures: a NEAR account can sign transactions on Bitcoin, Ethereum, Solana and other chains. - NEAR AI: private, verifiable inference in trusted execution environments (TEEs), and Shade Agents that hold their own keys. - Named accounts, sub-accounts and function-call keys: give an agent or app…"
    requirements[1]: "Build during the hackathon. Publish a public repository (judges can't open private ones) and post a demo on X saying you built it at NEAR HACKATHON, with a video or screenshots. Submit both links and the NEAR wallet address prizes should go to. Prizes are paid in NEAR."
    bounties[1]{id,name,amount,description}:
      c609925a-a814-49d1-8c25-a0c88645e7c3,Grand Prize,55000,"The single best project across all tracks. Every submission is considered automatically: you don't need to select this."
    judgingCriteria[4]{name,weightPercent,description}:
      Technical Implementation,30,"Engineering quality on the project's OWN terms — architecture, correctness, integrations wired up, data handling. Off-theme never docks this; theme fit belongs only to Sponsor / Track Fit."
      Innovation & Creativity,25,"How original, bold, and ambitious the IDEA is (fresh framing, a non-obvious mechanism, inventive tool use, ambitious scope) — NOT implementation polish, and not requiring a novel algorithm. Use the full range: a bold idea with a rough build can score…"
      Sponsor / Track Fit,25,"How well the repo addresses the sponsor's goal/track and uses their stack — the only criterion where theme match belongs. When the sponsor or a linked partner requires their SDK/API, confirm the integration exists (grep/getFiles) AND is used correctl…"
      Execution & Completeness,20,"How complete and usable the core is for a hackathon (working end-to-end path, docs, config, sensible errors). Missing production hardening (auth, CI, migrations, exhaustive tests) is normal and must not cap this. Treat git activity as a positive sign…"
  - slug: unstoppable-defi
    name: Unstoppable DeFi
    tier: track
    prizePool: null
    tagline: Markets that never close
    website: "https://nearhackathon.com/"
    description: "Build exchanges, perps, lending, vaults and trading agents that settle across chains through NEAR Intents. Deep liquidity, no custodian, nobody to switch it off. What to lean on: Trading, NEAR Intents, Chain Signatures. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      652d6afc-2999-4c0f-9d18-39c1f4b6bb85,1st place,10000,First place in Unstoppable DeFi. Paid in NEAR.
      dd92925a-b68f-4466-bac9-e788c40e8bea,2nd place,3000,Second place in Unstoppable DeFi. Paid in NEAR.
      051f36c0-48a5-471b-b6c8-a40c9d8b314a,3rd place,2000,Third place in Unstoppable DeFi. Paid in NEAR.
    judgingCriteria: []
  - slug: investment-thesis
    name: Investment Thesis
    tier: track
    prizePool: null
    tagline: Make the long-term case
    website: "https://nearhackathon.com/"
    description: "Build a long-term investment thesis for NEAR and back it with data: onchain analytics, live dashboards and models anyone can re-run. Judged on the evidence, not the conviction. What to lean on: Onchain Data, Dashboards, Research. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      ea6a6ce4-612d-45a8-bab9-957c90298b0c,1st place,10000,First place in Investment Thesis. Paid in NEAR.
      48301599-0017-4c8e-9956-1befd0fc62fb,2nd place,3000,Second place in Investment Thesis. Paid in NEAR.
      f5a3ddfd-d735-454b-95aa-0b56d977eb2c,3rd place,2000,Third place in Investment Thesis. Paid in NEAR.
    judgingCriteria: []
  - slug: privacy-private-ai
    name: Privacy & Private AI
    tier: track
    prizePool: null
    tagline: Private by design
    website: "https://nearhackathon.com/"
    description: "Explore confidential computation, private finance and AI that protects sensitive data. Build intelligence without exposure. What to lean on: Private AI, TEE, NEAR AI Cloud. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      31122832-489c-41b5-bc9d-99e85f3057b2,1st place,10000,First place in Privacy & Private AI. Paid in NEAR.
      fcaf99a9-0a87-4d81-a2d4-17cb64295361,2nd place,3000,Second place in Privacy & Private AI. Paid in NEAR.
      348854f4-9f9f-4862-8106-22a6586c8c35,3rd place,2000,Third place in Privacy & Private AI. Paid in NEAR.
    judgingCriteria: []
  - slug: autonomous-business
    name: Autonomous Business
    tier: track
    prizePool: null
    tagline: The company of one. Or none
    website: "https://nearhackathon.com/"
    description: "Build AI-native businesses with treasury, sales, procurement, cross-chain payments via NEAR Intents and revenue sharing. Humans only set the constraints. What to lean on: AI Agents, NEAR Intents, Chain Signatures. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      23793023-5170-48e1-9404-8c9241edb5e3,1st place,10000,First place in Autonomous Business. Paid in NEAR.
      09a1e91f-2399-428a-9848-865a80a75956,2nd place,3000,Second place in Autonomous Business. Paid in NEAR.
      6453ebf9-32e7-485a-b826-30aa4e3dd978,3rd place,2000,Third place in Autonomous Business. Paid in NEAR.
    judgingCriteria: []
  - slug: ai-swarms
    name: AI Swarms
    tier: track
    prizePool: null
    tagline: Many agents. One economy
    website: "https://nearhackathon.com/"
    description: "Build coordination markets, bidding, collective purchasing, intent-based settlement and emergent economies between agents. What to lean on: Multi-Agent Systems, NEAR Intents, Sub-Accounts. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      ec7d9f86-b08a-4018-a31a-8b08d99fcc6e,1st place,10000,First place in AI Swarms. Paid in NEAR.
      8526e640-36af-4a88-92ae-59e262615866,2nd place,3000,Second place in AI Swarms. Paid in NEAR.
      62108d3e-25b9-45a0-8962-a02381f95b2f,3rd place,2000,Third place in AI Swarms. Paid in NEAR.
    judgingCriteria: []
  - slug: ai-security-defense
    name: AI Security & Defense
    tier: track
    prizePool: null
    tagline: "Trust, but verify"
    website: "https://nearhackathon.com/"
    description: "Build spending limits, policy engines, sandboxed wallets, reputation and scam detection. Give AI money without giving it the keys to everything. What to lean on: Agent Security, Function Call Keys, TEE Attestation. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      b3662bb5-e295-497a-8495-d904db7c76d9,1st place,10000,First place in AI Security & Defense. Paid in NEAR.
      2dd1a60b-56b7-424b-a1ef-613a1e9c3412,2nd place,3000,Second place in AI Security & Defense. Paid in NEAR.
      5332b244-9856-4b40-86ec-bc0313660825,3rd place,2000,Third place in AI Security & Defense. Paid in NEAR.
    judgingCriteria: []
  - slug: agent-economy
    name: Agent Economy
    tier: track
    prizePool: null
    tagline: Give AI a wallet
    website: "https://nearhackathon.com/"
    description: "Build agents that earn, spend, negotiate, hire other agents and pay for APIs, compute or data — with crypto directly or through NEAR Intents. What to lean on: Agent Commerce, NEAR Intents, Chain Signatures. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      66293a18-1ba2-4f55-8435-efb29d607904,1st place,10000,First place in Agent Economy. Paid in NEAR.
      13c9eef2-63bd-48cc-9fc2-8030fae7d1b9,2nd place,3000,Second place in Agent Economy. Paid in NEAR.
      498fa85d-bfae-4f43-adab-63e7f78c3eb2,3rd place,2000,Third place in Agent Economy. Paid in NEAR.
    judgingCriteria: []
  - slug: real-world-money
    name: Real-World Money
    tier: track
    prizePool: null
    tagline: Bring the boring money onchain
    website: "https://nearhackathon.com/"
    description: "Build payroll, invoicing, remittances, merchant payments and stablecoin rails for real businesses. Something a normal company could use tomorrow. What to lean on: Stablecoins, NEAR Intents, Meta Transactions. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      0d46663b-215e-47cc-872c-35db6e249a6a,1st place,10000,First place in Real-World Money. Paid in NEAR.
      8b461e76-4d3a-4006-8714-a26e353ba0e5,2nd place,3000,Second place in Real-World Money. Paid in NEAR.
      7429d346-0d73-4df3-8806-8e553db60c75,3rd place,2000,Third place in Real-World Money. Paid in NEAR.
    judgingCriteria: []
  - slug: games-real-economies
    name: Games With Real Economies
    tier: track
    prizePool: null
    tagline: The economy is the gameplay
    website: "https://nearhackathon.com/"
    description: "Build NPCs with wallets, player-owned markets and economies that evolve without a dev patch. Judged on the game loop, not the token — bonus if players never notice the chain. What to lean on: Agent NPCs, Social Login, NEAR Intents, NEP-245. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      ef4e100c-0b70-441a-a5dd-1093beb2ea25,1st place,10000,First place in Games With Real Economies. Paid in NEAR.
      a0a53d4a-b00b-4bd7-a469-59ab837440fa,2nd place,3000,Second place in Games With Real Economies. Paid in NEAR.
      2c7a2605-1b2c-4b52-8ec6-44b2c32ed228,3rd place,2000,Third place in Games With Real Economies. Paid in NEAR.
    judgingCriteria: []
  - slug: nfts-that-do-something
    name: NFTs That Do Something
    tier: track
    prizePool: null
    tagline: What comes after the JPEG
    website: "https://nearhackathon.com/"
    description: "Build NFTs as accounts — assets that own money, earn royalties, hold inventory, carry credentials, memberships or access rights. Ownership with behavior. What to lean on: Dynamic NFTs, NEP-171, Sub-Accounts. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      4c4c12b7-510c-4e13-a73c-f78123a6fb1f,1st place,10000,First place in NFTs That Do Something. Paid in NEAR.
      e33dc3fb-c82b-4ed9-95a6-4cafb0c90101,2nd place,3000,Second place in NFTs That Do Something. Paid in NEAR.
      41a541cd-03af-450a-ad07-a5bc25595ab2,3rd place,2000,Third place in NFTs That Do Something. Paid in NEAR.
    judgingCriteria: []
  - slug: memecoins-with-mechanics
    name: Memecoins With Mechanics
    tier: track
    prizePool: null
    tagline: The joke needs rules
    website: "https://nearhackathon.com/"
    description: "Build memecoins where the meme does something — supply that reacts to the community, treasuries with rules, onchain rituals and challenges. Judged on the mechanic, not the chart. What to lean on: Memecoins, Token Mechanics, NEP-141. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      9881cf6b-a8a0-49e6-9c5f-29e3e29732d5,1st place,10000,First place in Memecoins With Mechanics. Paid in NEAR.
      ba3873a1-60f4-4ee8-bb56-b53bada9a08c,2nd place,3000,Second place in Memecoins With Mechanics. Paid in NEAR.
      a34838f1-4c0c-404d-b229-11104506eb70,3rd place,2000,Third place in Memecoins With Mechanics. Paid in NEAR.
    judgingCriteria: []
  - slug: social-money
    name: Social Money
    tier: track
    prizePool: null
    tagline: Coordinate value together
    website: "https://nearhackathon.com/"
    description: "Build shared budgets, programmable rewards, collective ownership and reputation-based access on top of Sputnik DAO and Trezu. Don't rebuild the multisig — build what communities do with it. What to lean on: Sputnik DAO, Trezu, Named Accounts. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      07970ccd-f4b4-479f-9ebe-8c14e87aa0d2,1st place,10000,First place in Social Money. Paid in NEAR.
      9e2f9c43-25a9-4e7c-8380-e8ed3a8a9bad,2nd place,3000,Second place in Social Money. Paid in NEAR.
      f5306c98-33e4-4c6c-aa5f-e700901a67cd,3rd place,2000,Third place in Social Money. Paid in NEAR.
    judgingCriteria: []
  - slug: open-innovation
    name: Open Innovation
    tier: track
    prizePool: null
    tagline: Something we haven't seen
    website: "https://nearhackathon.com/"
    description: "Have an idea that refuses to fit a category? Explore new ways for money, intelligence and ownership to work together. What to lean on: Experimental, Chain Abstraction, Build Your Own. These are hints, not requirements."
    requirements: []
    bounties[3]{id,name,amount,description}:
      46a90bf6-944a-4934-86b6-e4ced6f47a98,1st place,10000,First place in Open Innovation. Paid in NEAR.
      11854f0a-c8a5-42f3-bb16-b3a3d09148d9,2nd place,3000,Second place in Open Innovation. Paid in NEAR.
      37de8fa4-4448-4308-bd92-023ac7611e9f,3rd place,2000,Third place in Open Innovation. Paid in NEAR.
    judgingCriteria: []
```

`event.stage` and the deadlines are snapshots from when this skill was generated and do not update — sanity-check timing before planning multi-day work.

## Budget credits

**1 credit = one ideator turn or one knowledge-graph query.** Project and artifact commands and the evaluator prompt are free. Spend credits on load-bearing questions, not browsing, and check the balance before a research burst:

```sh
loops credits --event near-hackathon
```

## Ideate with the AI mentor

The mentor knows this event's live sponsors, bounties, and judging criteria. Conversations persist locally per event (`~/.loops/sessions/`) and continue automatically — each call sends one more message, so ask follow-ups freely instead of cramming everything into one prompt.

```sh
loops ideate --event near-hackathon -m "<your prompt>"
loops ideate --event near-hackathon -m "<follow-up>"               # same conversation
loops ideate --event near-hackathon --withProject -m "<prompt>"    # mentor sees the user's project
loops ideate --event near-hackathon --new -m "<fresh start>"       # discard the session first
loops session --event near-hackathon            # show the stored conversation (--clear to delete)
```

Pass `--withProject` once a project exists — feedback grounded in the actual build beats generic advice.

## Query sponsor knowledge graphs (graph-RAG)

Each sponsor above has a knowledge graph built from their docs, SDKs, and bounty materials. A query returns a **cited evidence block** (entities, relationships, chunks, sources) — read the evidence and compose the answer yourself, citing it. Query the graph instead of guessing sponsor APIs. 1 credit per query. One ready command per sponsor:

```sh
# NEAR Protocol
loops knowledge query --event near-hackathon --sponsor near -q "<your question about NEAR Protocol>"

# Unstoppable DeFi
loops knowledge query --event near-hackathon --sponsor unstoppable-defi -q "<your question about Unstoppable DeFi>"

# Investment Thesis
loops knowledge query --event near-hackathon --sponsor investment-thesis -q "<your question about Investment Thesis>"

# Privacy & Private AI
loops knowledge query --event near-hackathon --sponsor privacy-private-ai -q "<your question about Privacy & Private AI>"

# Autonomous Business
loops knowledge query --event near-hackathon --sponsor autonomous-business -q "<your question about Autonomous Business>"

# AI Swarms
loops knowledge query --event near-hackathon --sponsor ai-swarms -q "<your question about AI Swarms>"

# AI Security & Defense
loops knowledge query --event near-hackathon --sponsor ai-security-defense -q "<your question about AI Security & Defense>"

# Agent Economy
loops knowledge query --event near-hackathon --sponsor agent-economy -q "<your question about Agent Economy>"

# Real-World Money
loops knowledge query --event near-hackathon --sponsor real-world-money -q "<your question about Real-World Money>"

# Games With Real Economies
loops knowledge query --event near-hackathon --sponsor games-real-economies -q "<your question about Games With Real Economies>"

# NFTs That Do Something
loops knowledge query --event near-hackathon --sponsor nfts-that-do-something -q "<your question about NFTs That Do Something>"

# Memecoins With Mechanics
loops knowledge query --event near-hackathon --sponsor memecoins-with-mechanics -q "<your question about Memecoins With Mechanics>"

# Social Money
loops knowledge query --event near-hackathon --sponsor social-money -q "<your question about Social Money>"

# Open Innovation
loops knowledge query --event near-hackathon --sponsor open-innovation -q "<your question about Open Innovation>"
```

## Manage the project

The project IS the submission. The user has at most one here, and the platform resolves it from the session — no ids, no listings.

```sh
loops project fields --event near-hackathon    # EVERY field this event asks for, with current values + `missing`
loops project get --event near-hackathon       # current state (exists=false if none yet)
loops project create --event near-hackathon --name "<name>" --repoUrl <url> --tagline "<one-liner>"
loops project update --event near-hackathon --description "<new description>"
```

**Start with `project fields`.** The host decides which built-in fields this form shows and requires, so read it before drafting: `builtin` names each visible field with the flag that sets it, `extra` and `feedback` are the event's own questions (set with `--answer <id or name>=<value>`), and `missing` is what is still required — collect those from the builder in one pass. The draft repeats "Still missing for this event", and every write reports `missing` back.

**Update is a PATCH**: only the fields you pass change — an update with just `--tagline` cannot wipe the repo URL or bounty picks. Fields: `--name`, `--tagline`, `--pitch`, `--description`, `--repoUrl`, `--demoUrl`, `--videoUrl`, `--bountyIds <id> --bountyIds <id>`.

**Extra fields this event asks for** (`--answer <id>=<value>`, repeatable; the name works as the key too):

- `5404259c-f568-46c1-bd47-84427b4547c2` — Team size (required)
- `9ac4bcac-c482-42b1-a3aa-967c2da03365` — NEAR wallet address (required)

## Save ideation artifacts

Save ideas, problems, and tech-stack notes against this event — they appear in the user's web playground too, so persist anything worth keeping instead of letting it die in the conversation. Kinds: `idea`, `problem`, `tech-stack`, `note`.

```sh
loops artifact list --event near-hackathon
loops artifact save --event near-hackathon --name "<title>" --kind idea --body "<markdown body>"
loops artifact update --event near-hackathon --id <artifactId> --body "<updated markdown>"
loops artifact remove --event near-hackathon --id <artifactId>
```

## Evaluate the project against a sponsor

Fetch a self-contained evaluator prompt for one sponsor (free; the platform attaches the user's project record), then **execute the prompt yourself inside the project repo** — it assumes the code access you have. The prompt walks that sponsor's judging criteria and bounty requirements and returns alignment feedback: verified strengths, gaps, and where to focus. Run it for every sponsor the project targets, well before the deadline.

```sh
loops evaluate --event near-hackathon --sponsor <sponsorSlug>
```

Take sponsor slugs from the TOON data above. Report the feedback to the user, then apply agreed improvements via `loops project update`.
