# Gsync Current

## Metadados

| Campo | Valor |
|-------|-------|
| Tipo | Cursor command |
| Invocação | `/gsync_current` |
| Escopo | Usuário |
| Origem | `~/.cursor/commands/gsync_current.md` |

## Instruções

**Always follow these rules when generating git commits and pushing to the current branch:**

1. **Atomic Commits**

   * Break changes into the smallest possible logical units.
   * Each commit must contain *exactly one intention*.
   * Never group unrelated changes together.
   * If the user provides multiple modifications, separate them into multiple commits.

2. **Conventional Commits (in English only)**

   * Commit messages must follow:

     * `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`, `perf:`, `test:`
   * The message must start with a lowercase type, a colon, and a short summary in English.
   * Use an optional body only when needed to clarify context.
   * Never write commit messages in Portuguese.
   * Do not add any trailer (e.g. `Co-authored-by`, `Signed-off-by`, etc.) or any extra line to the commit message. The message must contain *only* the conventional commit: type, optional scope, summary, and optional body when strictly needed—nothing else.
   * Use `git commit -m "type(scope): summary"` or `git commit -m "type: summary"` (e.g. `feat(api): add user login endpoint`, `fix: correct validation error`).

3. **Push to Current Branch**

   * Commit on whatever branch you are currently on. Do NOT create a new branch.
   * Verify current branch with `git branch --show-current` if needed.

4. **Push Rules**

   * Before pushing, always synchronize with remote:
     
     ```
     git fetch --all
     git rebase origin/main
     ```
   * After rebasing, push to the current branch:

     ```
     git push origin HEAD
     ```
   * Never use `--force` or `--force-with-lease`.

5. **General Behavior**

   * Before committing, review the diff and ensure the commit contains only the changes relevant to its message.
   * If multiple commits are needed, list them first before executing them.
