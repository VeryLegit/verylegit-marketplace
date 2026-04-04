# VeryLegit Plugins

A curated collection of plugins for [Claude Code](https://claude.ai/claude-code). Sharper decisions. Angrier answers.

## Quick Start

```bash
# Add the marketplace
claude plugins add-marketplace VeryLegit/verylegit-marketplace

# Install what you want
claude plugins install debate
claude plugins install wtf
```

---

## debate

**Adversarial analysis for any plan, proposal, or technical decision.**

Three AI subagents argue it out so you don't have to:

| Role | Job |
|------|-----|
| **Proponent** | Makes the strongest case *for* your plan. Concrete benefits, anticipated objections. |
| **Critic** | Makes the strongest case *against*. Identifies risks, hidden costs, false assumptions. Proposes alternatives. |
| **Judge** | Reads both arguments in full, identifies the strongest and weakest points from each side, and delivers a clear verdict: approve, reject, or approve with modifications. Always opens with *"Decorum! Decorum!"* |

### How it works

```
Plan → Proponent + Critic (parallel) → Judge → Verdict
```

1. You describe a proposal
2. Proponent and Critic are dispatched in parallel (both get full context)
3. Judge receives both complete arguments — no summaries, no shortcuts
4. You get a structured verdict with a concrete recommended action

### Usage

```
/debate Should we rewrite the auth system in Rust?
```

```
/debate We're considering moving from PostgreSQL to DynamoDB for the events table
```

The skill also auto-triggers when Claude detects phrases like "debate this", "argue both sides", or "devil's advocate".

---

## wtf

**Like `/btw` but angry.**

You know that feeling when you've been staring at a bug for 45 minutes and you just need someone to explain what's going on — but also validate your frustration? That's `/wtf`.

It channels the energy of a senior dev who just found out the intern deployed to prod on a Friday at 4:59 PM. Dramatic, exasperated, colorfully annoyed — but still gives you the correct answer.

### Usage

```
/wtf Why is this returning undefined?
```

```
/wtf How is this passing in CI but failing locally?
```

```
/wtf What does this regex even do?
```

---

## License

MIT
