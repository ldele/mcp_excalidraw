<!-- status: active · updated: 2026-09-06 · class: living -->

# NORTH STAR — mcp_excalidraw

The standing half of the writing contract (ADR-035). `CONTEXT.md` says what is true right now;
this says who we are writing for and how we talk to them, and it changes perhaps twice in a
project's life. If you are editing it every sprint, what you are editing belongs in `CONTEXT.md`.

Fill every section. An unfilled one is worse than an absent file, because an agent will read the
placeholder as an answer.

## What this is for

<One sentence, aimed at someone outside the project. Not the current phase and not the feature
list: the thing that decides what is worth building. If it takes three sentences, the project does
not know yet.>

## Who reads what we produce

<!-- Named groups, 2-4 of them. For each: what they already know, and what they have never heard
     of. This is the section that makes "explain the thing, then name it" actionable — it is the
     list of things that need explaining. A group nobody can name is a group nobody is writing for. -->

| Group | Already knows | Has never heard of | What they do after reading |
|---|---|---|---|
| <e.g. a new maintainer> | <the language, the domain> | <our internal names> | <picks up an open task> |
| <e.g. an evaluating stranger> | <the general problem> | <everything of ours> | <decides whether to adopt> |

## Register

- **Voice:** <e.g. plain, direct, first-person-plural avoided. Name what this project never does.>
- **Jargon:** <which terms are assumed, which are explained on first use, which are banned outright>
- **Default length:** <a number per doc type, e.g. README under 200 lines, ADR under 150>
- **Never:** <the specific habits this project rejects — a claim without a number, a benefit
  without its cost, a heading that promises more than the section delivers>

## Standing answers

<!-- The per-deliverable questions whose answer is the same every time, so a per-document SPEC does
     not repeat them. Anything genuinely per-document belongs in the brief instead. -->

- **Reader we default to when a document does not say:** <group>
- **What we always include:** <e.g. the command that reproduces every number>
- **What we never include:** <e.g. estimates presented as measurements, roadmap dates>
- **How we handle something we did not verify:** <e.g. say so on the line, in the same sentence>

## What would make our writing wrong

<!-- The failure this project actually suffers from, named concretely. Generic answers ("unclear
     writing") do not constrain anything. One or two lines. -->

- <e.g. a reader who cannot tell which sentences carry facts, so they skim and miss the one line
  that mattered>
