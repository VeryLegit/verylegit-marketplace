# VeryLegit Plugins

Productivity and personality plugins for [Claude Code](https://claude.ai/claude-code).

## Plugins

| Plugin | Description | Type |
|--------|-------------|------|
| **debate** | Adversarial debate with three AI subagents — Proponent, Critic, and Judge. Stress-test any plan or decision. | Skill + Command |
| **wtf** | Like /btw but angry — dramatic frustration before a clear answer. | Command |

## Install

Add this marketplace to Claude Code:

```
claude plugins add-marketplace VeryLegit/verylegit-marketplace
```

Then install individual plugins:

```
claude plugins install debate
claude plugins install wtf
```

## Usage

### /debate

```
/debate Should we rewrite the auth system in Rust?
```

Spawns three subagents (Proponent, Critic, Judge) for rigorous adversarial analysis of your proposal.

### /wtf

```
/wtf Why is this returning undefined?
```

Gets you an answer, but first expresses the appropriate level of outrage about whatever prompted the question.

## License

MIT
