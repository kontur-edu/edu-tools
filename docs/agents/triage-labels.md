# Triage Labels

Скиллы говорят в терминах пяти канонических триажных ролей. Этот файл сопоставляет роли со значениями, которые используются в нашем трекере.

Трекер — меморибанк (см. `docs/agents/issue-tracker.md`), поэтому роль записывается не меткой, а строкой `Triage: <role>` в шапке файла фичи `.memory-bank/plans/features/FT-XXXX-*.md`.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding value from this table in the `Triage:` line.

Edit the right-hand column to match whatever vocabulary you actually use.
