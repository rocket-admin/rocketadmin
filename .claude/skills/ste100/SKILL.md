---
name: ste100
description: Rewrite a plan, an architecture record or a comment block with the ASD-STE100 writing rules, then run scripts/ste-check.mjs until it reports no error. Use when the user asks to apply the writing rules to a file, or when the writing-rules hook reports findings that need a rewrite.
---

# Apply the ASD-STE100 writing rules

Input: one or more file paths. Default: the files the current change touches
(`git diff --name-only main`).

1. Read the rules in `../sitenova/architecture-design-records/STE100-WRITING-RULES.md`, or the summary in
   `CLAUDE.md` when the sibling checkout is absent. Sections 4 to 6 and
   section 11 matter most.
2. Run `node scripts/ste-check.mjs <file>` and read every finding.
3. Rewrite each reported sentence. Keep the meaning. Keep every identifier, path, number and date.
   Do not change code, string literals, model prompts or test names.
4. In a file with old text, rewrite only the paragraphs the user named, or the paragraphs the
   change touches. Old text stays as it is.
5. Run the checker again. Repeat until it reports no error. A warning needs judgment: fix it when
   the rule applies, leave it when the sentence is correct.
6. Report the counts before and after. List each warning you left, with one reason.
