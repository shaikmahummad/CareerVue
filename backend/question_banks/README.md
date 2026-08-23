# CareerVue question banks

This package is the maintained, local assessment source for every career goal
advertised by the web and mobile applications. It does not call an AI service at
runtime.

## Coverage

- 11 career goals
- 12 ranked skills per career
- 63 reusable skills across the taxonomy
- one beginner, intermediate, and advanced question per skill
- 189 source-backed questions in total
- 36 eligible questions per career, from which each assessment selects 20

The level profiles are deliberately distinct:

| Requested level | Question mix |
| --- | --- |
| Beginner | 12 beginner + 8 intermediate |
| Intermediate | 12 intermediate + 8 advanced |
| Advanced | 12 advanced + 8 intermediate |

The levels mean:

- **Beginner:** recognizes core concepts and direct, safe behavior.
- **Intermediate:** applies concepts to realistic tasks, trade-offs, and diagnosis.
- **Advanced:** reasons about architecture, edge cases, failure modes, and system impact.

## Editorial contract

Every question must have exactly four distinct options, one unambiguous correct
answer, an explanatory rationale, a known skill, one of the three supported
difficulties, and an official source assigned through `SKILL_SOURCES`. Avoid trick
wording, trivia, and answers that depend on an unstated product version.

The seed operation is idempotent and uses stable identifiers. After migrations,
run it from the backend directory:

```shell
python seed_question_banks.py
```

Deployment entry points run this command automatically. Run the structural and
selection checks with:

```shell
python -m unittest tests.test_all_question_banks -v
```

Automated checks enforce coverage, source links, unique prompts and options,
balanced answer positions, valid taxonomy references, deterministic assembly,
and the exact difficulty mix above. A domain expert should still approve material
changes before they are used for high-stakes assessment.
