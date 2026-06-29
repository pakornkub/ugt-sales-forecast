---
name: sonarqube-clean-code
description: >
  SonarQube clean-code rules for TypeScript/React/Next.js — write code that
  passes the Quality Gate on the FIRST scan instead of fixing violations later.
  Covers modern-JS idioms SonarQube enforces (S77xx/S65xx/S6xxx), how to suppress
  genuine false positives correctly (NOSONAR placement + sonar.issue.ignore), and
  the duplication strategy (refactor vs sonar.cpd.exclusions). Load BEFORE writing
  any new component, server action, validation schema, or table.
  Don't use for SonarQube pipeline/credentials config (→ `ci-cd` / `ugt-jenkins`)
  or OWASP dependency suppressions (→ `security-expert`).
---

# SonarQube Clean Code — write it right the first time

The cheapest SonarQube fix is the violation you never create. This skill is the
**pre-flight checklist**: apply these idioms while writing, and the Quality Gate
passes without a follow-up cleanup pass.

> Full incident history + rationale lives in `ugt-hrms-bug-fixes.instructions.md`
> (entries `SQ-001`…`SQ-004`). This skill is the standalone runtime summary.

---

## How the Quality Gate is scored (read first)

The gate measures **new code only**. Two conditions fail builds most often:

| Condition                      | Threshold | What trips it                                       |
| ------------------------------ | --------- | --------------------------------------------------- |
| `new_violations`               | < 50      | Lots of small code smells in one PR                 |
| `new_duplicated_lines_density` | < 5%      | Copy-pasted blocks — **NOSONAR does NOT help here** |

Implication: duplication is the silent gate-killer. Treat copy-paste as a defect
while writing, not after the scan.

---

## 1. Modern-JS idioms SonarQube enforces

Write these by default. Each left column is what SonarQube flags; right is correct.

| ❌ Flagged                                  | ✅ Write instead                                  | Rule          |
| ------------------------------------------- | ------------------------------------------------- | ------------- |
| `str.replace(/x/g, 'y')`                    | `str.replaceAll('x', 'y')`                        | S7781         |
| `parseInt(v, 10)` / `parseFloat(v)`         | `Number.parseInt(v, 10)` / `Number.parseFloat(v)` | S7773         |
| `typeof window !== 'undefined'`             | `globalThis.window !== undefined`                 | S7764         |
| `typeof x === 'undefined'`                  | `x === undefined`                                 | S7741         |
| `arr[arr.length - 1]`                       | `arr.at(-1)`                                      | S7755         |
| `x > 0 ? x : 0`                             | `Math.max(0, x)`                                  | S7766         |
| `a !== null ? a : b` / `a ? a : b`          | `a ?? b`                                          | S6606 / S7735 |
| `if (!notReady)` (negated cond. in ternary) | flip branches → positive condition                | S7735         |
| `catch (err)` / `catch (e)`                 | `catch (error_)` (or `error`)                     | S7718         |
| `value as Foo` when TS already narrows      | remove the assertion                              | S4325         |
| `void someExpr;` / unused `void`            | delete the dead expression                        | S3735         |

**Component / type rules:**

| Rule  | Requirement                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------- |
| S6759 | Wrap every function-component prop type in `Readonly<>` — inline objects, named interfaces, and `React.ComponentProps<…>`. |
| S3863 | Never import twice from the same module — merge into one `import` statement.                                               |
| S1874 | No deprecated APIs. Zod v4: `z.flattenError(err)` not `err.flatten()`; `z.iso.datetime()` not `z.string().datetime()`.     |
| S3776 | Keep cognitive complexity ≤ 15 — extract helpers from deeply nested/branchy functions.                                     |

**S6759 exception:** a TanStack `CellContext<TRow, TValue>` cell renderer param must use
`Readonly<CellContext<TRow, unknown>>` — the value generic is `unknown` at the column level.

---

## 2. Duplication — the gate-killer (no NOSONAR exists for it)

When you're about to copy a block, stop and pick a lever:

**A. Refactor (default — do this when DRY helps):**

- Two Zod schemas share fields/refinements → extract shared field consts + standalone
  predicate functions (type the shared `superRefine` ctx as `z.core.$RefinementCtx`).
  A `.refine()` options `path` must stay a mutable `PropertyKey[]` — no `as const`.
- Two components differ only in config (endpoint, labels, body) → extract one component
  that takes those as props (e.g. a shared `ExportMenu`, `LegendModalShell`).
- Twin dialogs/forms share schema + fields → extract a shared schema module + a
  `<Fields form={form} />` sub-component.
- Server actions repeat guard/email/create blocks → extract `loadX`, `notifyX`, `createX` helpers.

**B. `sonar.cpd.exclusions` (when forcing DRY hurts):** type-safe CRUD tables that share
structure but differ in generic row type, content-only modal bodies over a shared shell,
generic DataTable variants, per-resource API-route guards. Add the path to
`sonar-project.properties` with a comment explaining _why_ it's intentional.

> Rule of thumb: if unifying the duplicates needs `any`/casts or a 5-param config object
> that's harder to read than the copies → exclude. Otherwise → refactor.

---

## 3. Suppressing genuine false positives

### NOSONAR — must be on the SAME line as the flagged code

```ts
// ✅ same line as the arrow/declaration SonarQube reports
cell: ({ row }) => <RiskCell row={row} />, // NOSONAR typescript:S6478 — TanStack renderer
export function Wizard() { // NOSONAR typescript:S3776 — cohesive state machine

// ❌ next line / JSX block comment → does NOT suppress
header: () => (
  // NOSONAR …          ← wrong: issue is on the `() => (` line above
{/* NOSONAR … */}       ← wrong: JSX block comments are ignored by SonarQube
```

### Prefer `sonar.issue.ignore.multicriteria` for systematic false positives

When a rule fires across a whole file/glob because of a library pattern (TanStack Table
column renderers, react-day-picker slot overrides, RHF render props), suppress it once in
`sonar-project.properties` instead of scattering fragile per-line NOSONARs:

```properties
sonar.issue.ignore.multicriteria=s6478tables,s4144ot
sonar.issue.ignore.multicriteria.s6478tables.ruleKey=typescript:S6478
sonar.issue.ignore.multicriteria.s6478tables.resourceKey=**/*table*.tsx
sonar.issue.ignore.multicriteria.s4144ot.ruleKey=typescript:S4144
sonar.issue.ignore.multicriteria.s4144ot.resourceKey=**/ot-approval-list.tsx
```

Common library false positives worth ignoring by glob: **S6478** (inline component) on
`*table*`, `*-tab`, `*-list`, `calendar`; **S4144** (identical impl) on generic-type
variant components; **S6848 / S1082** (a11y) on UI primitives that delegate ARIA to a parent.

`console.*` in fire-and-forget catch blocks → `// NOSONAR typescript:S106` same line.

---

## Pre-commit checklist

Before committing new code, verify:

- [ ] No `parseInt`/`.replace(/…/g)`/`typeof … 'undefined'`/`arr[len-1]`/negated ternaries — used the modern idiom
- [ ] Every component prop type wrapped in `Readonly<>`
- [ ] No duplicated import lines; no deprecated Zod APIs
- [ ] No copy-pasted block ≥ ~10 lines — refactored or added to `sonar.cpd.exclusions` with a reason
- [ ] Any NOSONAR is on the **same line** as the issue; systematic FPs use `sonar.issue.ignore.multicriteria`
- [ ] `npx tsc --noEmit` + `npm run lint` clean
