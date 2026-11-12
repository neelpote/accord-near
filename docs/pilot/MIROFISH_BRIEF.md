# MiroFish product-objection exercise

This is an input brief for **simulated personas**, not a report from real users. No simulation has run and no customer-demand conclusions have been established.

## Source facts

Accord is a testnet prototype for NEAR application maintainers. It observes finalized contract hashes and access keys against a user-reviewed baseline, groups differences into incidents, keeps before/after evidence, supports acknowledgement and exports a digest-verifiable timeline. Optional independently purchased reports use finite NEAR escrow agreements that fix provider, price, interval, maximum cycles and expiry. Customers can cancel future charges, remove the restricted key and withdraw unspent balance. This does not prevent an exploit or roll back a contract upgrade.

Five reference services share one provider and use deterministic RPC rules. Groq can explain public evidence, with a persistent small request cap; it is not proof that an incident is malicious. NEAR AI Cloud is paused. External notifications need an operator receiver and opt-in. Monitoring itself is not bundled into paid report purchases. No real customer interviews, production uptime history, independent security audit or paying-customer traction have been established.

The demo per-report price is 0.001 test NEAR. At one report per minute that would be 1.44 NEAR/day or 43.2 NEAR/30 days per agent; all five would be 216 NEAR/30 days. Current agreements are finite, so they do not silently renew for a month. Explore whether on-demand explanations or less frequent reports are useful before suggesting a pricing model.

## Simulation question

What would stop a small NEAR engineering team from trying this monitoring/evidence workflow, and which objections should we test in real interviews before adding features?

Use contrasting hypothetical perspectives: a solo NEAR maintainer, an agency maintaining several client contracts, an engineer already using explorer alerts and scripts, a security reviewer skeptical of AI explanations, and a founder who owns the operating budget. These are archetypes, not actual respondents. Include participants who decide they do not need the product.

Discuss these specific tradeoffs:

- What concrete past incident would make code/key evidence worth opening another dashboard?
- Can explorer alerts and a cron script already solve it at lower cost?
- Would evidence without external notification be actionable?
- Does prepaying a recurring report solve a real need, or does it add wallet friction to an occasional task?
- Which private operational information would a team refuse to upload?
- Would a one-off report, free monitoring with paid explanations, or an infrastructure API be a better fit? Identify the extra assumptions each alternative makes.

## Required output

For each objection, give the source fact or explicit assumption, strongest counterargument, possible product change, and one falsifiable interview or usability test. Surface reasons to stop building. Do not invent conversion rates, market size, customer quotes, purchase intent or probability of winning the hackathon.

Run the smallest supported experiment first with a separately configured inference budget. Do not reuse Accord's already limited production inference budget. Record model, input hash, persona count, rounds, actual requests/cost, failed runs and settings. A round limit alone is not a monetary cap. Do not start a simulation until the operator has configured Zep Cloud and an LLM and chosen an explicit request/spending ceiling. Feed only this public brief; never upload `.env`, account keys, authentication cookies, database exports or private pilot notes.

Compare the objections with 3–5 real interviews using [INTERVIEWS.md](INTERVIEWS.md). Label any eventual generated output **AI-simulated feedback** everywhere it is used.

## Local installation record

Official source: https://github.com/666ghj/MiroFish, commit `7657031ac01184afe2cb220f5ee3545573b5e843`, AGPL-3.0. Installed separately at `/Users/neelsubhashpote/Desktop/near/tools/MiroFish`, outside Accord's repository and deployment. Python 3.11 virtual environment and npm dependencies are installed; compatible npm audit fixes were applied locally. Frontend production build, both npm audits and all 130 upstream backend tests pass. Flask `/health` passes an application test-client check. This does not verify a complete simulation or audit Python dependencies.

The tool is configured for loopback port 3300 to avoid Accord's port 3000. No LLM or Zep keys were copied from Accord, no live inference ran and no generated feedback is claimed. Full startup still requires both credentials and a separately bounded inference budget. See the local `LOCAL_SETUP.md` for commands. This research tool is not shipped as part of Accord.
