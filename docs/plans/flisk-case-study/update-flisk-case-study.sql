-- Replace the existing Flisk case-study placeholder with the completed copy.
-- Draft only: review before applying to any database.

BEGIN;

DO $check$
DECLARE
  flisk_count integer;
BEGIN
  SELECT count(*)
  INTO flisk_count
  FROM case_studies
  WHERE company_url = 'Flisk';

  IF flisk_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one Flisk case study, found %',
      flisk_count;
  END IF;
END
$check$;

UPDATE case_studies
SET
  title = 'Flisk Agent-Driven Tracking Implementation',
  summary = $summary$
<strong>Flisk</strong> manages tracking implementation and monitoring across your entire stack. It began as a tool for engineers, but our research pointed in a different direction, so I redesigned and rebuilt the app and agent experience around the people who need reliable tracking and can't get engineering resources to implement it.
$summary$,
  content = $content$
<p>
Every company that spends money on advertising depends on data tracking, and nobody wants to own it; tags, triggers, pixels, and event schemas sit between the marketing team that needs the numbers and the engineering team that has no interest in maintaining them. The work is repetitive, unglamorous, but mission-critical. When it breaks, campaigns keep running, and budgets keep getting spent, but the signals underneath them are wrong.
</p>

<h2>Right Problem, Wrong User</h2>
<p>
Flisk began as an MVP built by my co-founder around source code access, where the agent read a customer's repository, understood how tracking was implemented, and helped write it. It was a reasonable bet; writing tracking code is boring and tedious, engineers hate maintaining it, and an agent that writes it for them solves a real problem.
</p>
<p>
When I joined as co-founder, we expanded our research, and across more than 200 interviews, a pattern emerged that neither of us had predicted: engineers weren't especially excited by what we'd built, while product managers, marketing directors, and data people were.
</p>
<p>
What we discovered:
</p>
<ul>
<li>Engineers are bored and annoyed by what they see as menial tasks, which include tracking implementation, but since their job is maintaining code, existing coding assistants had already largely addressed that need.</li>
<li>The people who depend on the data, and therefore on the timely and correct collection of it, feel the real pain, forced to wait in the dev queue behind other tasks that are viewed as higher priority.</li>
<li>Google Tag Manager is ubiquitous across marketing agencies because it's free, but there's a real learning curve, and it's easy to set up wrong given its complex UI and many options.</li>
<li>Marketing agencies often manage a large number of GTM containers for their clients, so an interface and architecture like the Flisk MVP, built around managing a single org's tracking implementation, weren't sufficient for managing tracking at scale.</li>
</ul>
<p>
Engineers never asked for help writing tracking code, because writing it was never the hard part for them, and they already had tools to help them anyway. The people in pain were the ones doing the asking, and they didn't live in a repository; they lived in Google Tag Manager.
</p>
<p>
The last two findings told us GTM was popular because it was free—not because it was the best tool or easy to use—and that the people leaning on it hardest were managing many containers on behalf of others rather than their own.
</p>
<p>
We added direct GTM connections via Google's API and repositioned the product around those users, keeping the source code connections because covering the full tracking stack was the long-term position and code is half of it. But GTM support became our focus and our biggest differentiator.
</p>

<h3>Narrowing on Purpose</h3>
<p>
The second pivot was more challenging than the first, because it meant deciding to do less.
</p>
<p>
We went after enterprise accounts initially, which is the obvious move once you've identified a non-technical buyer, but the reason it didn't work only became obvious after lots of sales calls that went nowhere. Tracking pain is substantial in aggregate and diffuse in practice, spread across marketing, analytics, and engineering in such a way that no single department was hurting enough on its own to justify an enterprise tool at enterprise prices, which made every deal an exercise in getting several departments to agree on a purchase none of them urgently wanted. That was a long slog for a small company.
</p>
<p>
A reasonably priced self-serve product directed toward individual marketers and understaffed marketing teams is a far easier sell, and the people in that market were already working in GTM, so we made a calculated pivot and committed to GTM, where the user base was enormous. Nothing else managed GTM the way Flisk did, and did it without requiring code snippets, scripts, or engineering support of any kind.
</p>
<p>
That choice determined the go-to-market, which in turn determined a great deal of the design, because a very large horizontal audience of non-technical people is not a market you sell to one account at a time. It had to be self-serve, and everything about how a new user would come to know the product followed from that.
</p>

<h2>Building Trust Into the Interaction</h2>
<p>
Verifiability had to be built into the structure of the interaction, so every agent interaction ran the same five steps: Read, Plan, Execute, Report, Approve.
</p>
<p>
The agent connected to GTM, the code base, and the site, and re-verified live state before acting, then drafted a plain-language summary of the proposed change along with its reasoning and any risks. Execution happened in an isolated Flisk workspace rather than the customer's default workspace, and when it finished, the agent reported what it had actually changed with a one-click path to confirm in GTM. Publishing required explicit approval.
</p>
<p>
The ninety-ten framing on the marketing site followed from this: the agent did ninety percent of the work and the user owned the ten percent that required judgment. It wasn't a hedge against unreliability. Customers were handing over a system of record they stayed accountable for, and the approval gate was what made that handover possible at all.
</p>
<p>
Establishing trust and keeping the agent from doing things it shouldn't were understood across the team as UX priorities rather than compliance requirements, which meant the three constraints I drew from them were never seriously in question:
</p>
<ul>
<li><strong>Every change went through the official Google GTM API.</strong> No back channels.</li>
<li><strong>Changes landed in GTM's own changelog,</strong> alongside changes from the customer's team. Full audit trail, nothing new to learn.</li>
<li><strong>No proprietary scripts on the customer's site.</strong> Removing Flisk broke nothing.</li>
</ul>
<p>
Finally, the agent was built for tracking and nothing else, carrying a prompt layer full of the conventions, trigger rules, and implementation standards that separate correct tracking from plausible tracking, and it reached the container through a direct GTM connection rather than handing the user advice to carry across themselves. A general-purpose agent with the same approval gate would produce confident, well-audited, wrong tracking.
</p>

<h2>With AI Agents, Context Is Key</h2>
<p>
A user looking at a broken tag in an audit report shouldn't have to describe that tag to an agent. The app had two entry points into the same agent: free-form chat for open-ended work, and "Fix Now" and "Edit this tag" buttons that opened the chat interface from anywhere with the relevant context already loaded. The user told the agent what they wanted done, either through plain language or clicking an action button in the UI, and the agent understood what they were talking about without having to clarify.
</p>
<p>
Making that work required a layer most agent products skip, so I built an event-tracking form tool the agent could create and edit directly, along with a <code>UI_STATUS</code> message type that told the agent what the user had open, so it reasoned about the form in front of them rather than an abstraction of it. Inline prompts distinguished agent-initiated flows from user-initiated ones, because the same screen means something different depending on who opened it.
</p>
<p>
I wrote the primary agent prompt and did the inline prompt engineering for UI-triggered actions, which made prompt design and interaction design one activity rather than a handoff. A "Fix Now" button is a prompt with a visual affordance attached to it.
</p>

<h2>Projects: Building Fences</h2>
<p>
One recurring failure in general-purpose AI tools is that the user becomes the context manager, re-pasting setup, re-explaining conventions, and starting over when a session ends.
</p>
<p>
Part of the answer was memory, so I implemented thread-scoped working memory that restores form state, summaries, and generated code from chat history rather than re-deriving or losing them, gave threads unique persistent URLs, and moved prompts into managed versioning so agent behavior could be changed and rolled back deliberately rather than edited in place.
</p>
<p>
The larger part was projects, which existed because of what we had heard from agencies. The MVP was built around a single organization's tracking implementation, which is a reasonable shape for an in-house team and the wrong shape entirely for an agency running tracking across a roster of clients with hundreds, or even thousands, of GTM containers.
</p>
<p>
A project grouped a customer's assets: containers, repositories, and sites. When a user opened a chat, the assets belonging to the selected project were injected into the prompt automatically, so the agent already knew what "the container" and "the repo" referred to.
</p>
<p>
Scoping by project resolved the reference structurally, and the same structure did two more jobs: it provided scope to the agent and prevented it from stepping beyond the user's intended boundaries, so an agency working across a hundred client containers wouldn't have an agent reach into the wrong one, and it scoped the skill catalog, so what the agent offered to do reflected the assets actually connected rather than the product's full capability surface. If the project had a GTM container, but not a repo, the agent wouldn't recommend tracking changes that required source code edits.
</p>
<p>
Projects started as an organizational tool, but evolved into a contextual and protective mechanism that kept the agent on track and working across many assets safely.
</p>

<h2>Reliability Is the Design</h2>
<p>
Long GTM builds were terminating before completion, and the root cause turned out to be a default step limit in the agent framework cutting multi-step work off partway through, which reached users as an agent that seemed to lose interest halfway through a job. That was one of several reliability problems I worked through, alongside guardrails against acting on a stale GTM workspace, explicit rules preventing the agent from creating directionless triggers, consistent error handling so failures surfaced to the user instead of disappearing, and two full audits of the prompt set along with regular prompt tweaks.
</p>
<p>
This was my first AI product, and the hardest part of it was not the interface or the model choice, but the discipline of getting reliable, repeatable output through thoughtful prompt engineering, repeated rewrites, and deterministic validation and error handling wrapped around results that are never fully deterministic themselves. Working with models instead of code means giving up the guarantee that the same input produces the same output, and a great deal of the reliability work is rebuilding that guarantee by other means.
</p>
<p>
The generalizable point is that for an agent product, reliability is not a quality attribute sitting behind the design; it is the design, because an agent that completes a task eight times out of ten teaches users its work can't be trusted.
</p>

<h2>Three Attempts at the Front Door</h2>
<p>
The audit was the product's first useful act. From day one on a new account, Flisk audited a customer's GTM container and returned a health score with a prioritized list covering duplicate tags, dead triggers, malformed code, performance problems, best-practice violations, and missing tracking. Each finding carried a diagnosis, a recommended fix, and a one-click path to resolve it with the agent. Audits then ran on a schedule, so when an engineer changed a CSS selector or a contractor pushed a commit that broke a trigger, it surfaced before the reports went cold.
</p>
<p>
Because it demonstrates value using the visitor's own broken tracking, the audit was the obvious thing to put at the top of a self-serve funnel. Getting it right took three tries, and the sequence is the clearest record I have of how my thinking about the product evolved:
</p>
<ol>
<li>We started with <strong>a free public audit</strong> on the marketing site, open to anyone, which worked by scanning the visitor's website and inferring what their GTM setup probably looked like from the evidence on the page. That was all that was possible without authentication, and it meant the report amounted to a set of educated guesses, while the in-app audit, which was behind a payment gateway, read the container directly. Prospects received a weaker version of our best argument.</li>
<li>Later, we offered <strong>a free trial with a real audit</strong>, replacing required payments with a self-serve trial that connected a real container and returned the real audit, which was better, except that I'd included a restriction: the trial couldn't publish changes to GTM. Since the entire proposition was that Flisk does the work rather than telling you what to do, publishing was the moment the product proved itself, and a trial that stops at the approval gate stops precisely where the value is.</li>
<li>Finally, we moved to <strong>a credit-based pay-as-you-go model with free credits against the full product</strong>, removing the restrictions and turning trials into unrestricted accounts with full publishing capabilities. New users exercised the whole product with a proper GTM audit, publishing included, and the thing they evaluated was the thing they would buy.</li>
</ol>
<p>
Earlier versions failed for the same reason in a different place, because we kept trying to demonstrate "it does the work for you" with something that couldn't do the work. For a product whose value is the completed action, every restriction on the trial is a restriction on the argument.
</p>

<h2>Pricing as a Design Problem</h2>
<p>
Moving to credits created a measurement problem before it created a pricing one, because you cannot price what you cannot attribute, and a credit is meaningless to a customer who can't predict how many a task will consume.
</p>
<p>
I built a cost-attribution package covering model, compute, storage, and sandbox spend, with allocation, idempotency, and rollups, wrote it into a cost ledger, and built an internal cost dashboard and token-economics calculator on top of it. Then we used that tooling to set the plan pricing rather than estimating it.
</p>
<p>
The result was a Standard plan that started free and charged as you go, with 50 included credits, prepaid credit bundles, and per-asset pricing on connected containers and repositories under a single organization subscription, where owners held the payment method while delegating purchasing to their team. That last detail existed because it was how the agencies and portfolio companies in our customer base actually bought.
</p>

<h2>Building the App and Agent In Concert</h2>
<p>
I owned the entire user-facing product along with the bulk of the agent functionality, which, over twelve months, came to about 70% of the commits in our monorepo, spanning authentication, onboarding, the chat and Canvas experience, the GTM interface, projects, settings, billing, and the design system, plus the conversion surfaces on the marketing site.
</p>
<p>
Two things about <em>how</em> the work happened matter more than a list of technologies:
</p>
<ul>
<li><strong>Plans as the primary design artifact</strong> – Tens of thousands of lines of status-tracked implementation plans lived in the repository alongside the code, because, for AI-assisted development, the specification is the leverage point, which makes writing plans a design activity rather than a documentation chore.</li>
<li><strong>Design and implementation in one hand</strong> – I wrote the implementation plans, produced design assets, and shipped code. For example, I handled our entire design refresh across both the marketing site and the app from end to end in about a week, covering tokens and typography, app shell, tables, drawers, chat items, button consolidation, breakpoints, and onboarding rebuilt as a five-step surface. The pay-as-you-go launch ran the same way, plan to shipped in eleven days. Neither timeline survives a handoff between roles.</li>
</ul>

<h2>Conclusion</h2>
<p>
Lots of startups pivot, but often due to impulse or panic rather than solid data. I followed the customer data to its logical conclusion and transformed an MVP without a market into a fully-realized AI tracking implementation partner, capable of understanding the scope of the user's task and working safely within its boundaries, and establishing trust with users by delivering reliable, repeatable output for complex tasks.
</p>
$content$
WHERE company_url = 'Flisk';

COMMIT;
