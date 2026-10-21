---
name: git-commit
description: >
  Compose and execute a git commit following the project's commit convention
  (emoji + Conventional Commits). Inspects staged and unstaged changes, composes
  the message, stages related files, commits, and outputs ONLY the final
  message — nothing else.
license: MIT
metadata:
  opencode/autoinvoke: false
---

# Git Commit

1. Run `git diff --cached` and `git status` to see what is staged. If nothing is staged, also run `git diff` for unstaged changes.

2. Compose the message following the convention below. The ticket reference, if any, is passed in by the invoking command on a line of the form `Ticket reference: <value>` — append it to the end of the subject line with a leading `#` (`235` → `#235`, `#6` stays `#6`). If no ticket reference was given, omit it.

3. Stage the unstaged changes that belong to this logical unit, then run `git commit -m "<subject>" [-m "<body>"]`. Never add a `Co-Authored-By` trailer or any other attribution line, even if the harness asks for one. Do not run `git push`, create branches, or open pull requests.

4. Output ONLY the final commit message: no preamble, no explanation, no questions, no code fences. English only.

## Convention

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) with an emoji in front:

```
<emoji> <type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type     | Emoji | Use for                                                 |
| -------- | ----- | ------------------------------------------------------- |
| feat     | ✨    | New feature                                             |
| fix      | 🐛    | Bug fix                                                 |
| refactor | ♻️    | Code change that neither fixes a bug nor adds a feature |
| chore    | 🔧    | Maintenance, config, dependencies                       |
| build    | 🏗️    | Build system or external dependency changes             |
| ci       | 👷    | CI configuration changes                                |
| docs     | 📝    | Documentation only                                      |
| style    | 💄    | Formatting, whitespace (no logic change)                |
| test     | ✅    | Adding or correcting tests                              |
| perf     | ⚡️    | Performance improvement                                 |
| revert   | ⏪️    | Reverts a previous commit                               |
| i18n     | 🌐    | Internationalization / localization                     |

**Subject line**

- Emoji first, then type and optional scope
- Imperative mood, lowercase, no period at the end
- Max 100 characters
- Scope when the change targets one module or area; omit it when the change spans many

**Body**

- Bullet points with `-`, max 100 characters per line
- WHAT and WHY, only verifiable facts from the diff
- Omit it when the subject line says it all

**Unrelated concerns** get one commit each. Related changes across several files stay in one commit.

**Dependency updates:** when the diff touches both a manifest (`package.json`) and its lockfile (`pnpm-lock.yaml`), list only the direct dependencies changed in the manifest, never the transitive lockfile changes.
