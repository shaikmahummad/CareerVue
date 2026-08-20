"""Idempotently seed the Frontend Developer taxonomy and approved question bank.

Run after migrations from the backend directory:
    python seed_frontend_knowledge.py
"""
import asyncio
import hashlib
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from sqlalchemy.dialects.postgresql import insert

load_dotenv()

from app.database import AsyncSessionLocal
from app.models.knowledge import (
    CareerRole,
    CareerSkill,
    QuestionSource,
    QuizQuestion,
    Skill,
    SkillPrerequisite,
)


NAMESPACE = uuid.UUID("f31b930e-4d09-4af9-89c8-58ae68e44a78")


def stable_id(kind: str, key: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f"{kind}:{key}")


SKILLS = [
    ("html", "HTML", "Web Fundamentals", "Semantic document structure, forms, media, and browser-native elements."),
    ("css", "CSS", "Web Fundamentals", "Layout, responsive design, cascade, selectors, and visual presentation."),
    ("javascript", "JavaScript", "Programming", "Core language, DOM interaction, asynchronous code, and modules."),
    ("git", "Git", "Developer Tools", "Version-control fundamentals and collaborative workflows."),
    ("typescript", "TypeScript", "Programming", "Static typing and scalable JavaScript application design."),
    ("react", "React", "Frontend Frameworks", "Component-driven interfaces, state, effects, and composition."),
    ("frontend-testing", "Frontend Testing", "Quality Engineering", "Unit, integration, and user-focused UI testing."),
    ("web-accessibility", "Web Accessibility", "Web Standards", "Accessible semantics, keyboard operation, forms, and ARIA."),
]

CAREER_SKILLS = [
    ("html", "intermediate", 5, 1, True),
    ("css", "intermediate", 5, 2, True),
    ("javascript", "advanced", 5, 3, True),
    ("git", "intermediate", 4, 4, True),
    ("typescript", "intermediate", 4, 5, False),
    ("react", "intermediate", 5, 6, True),
    ("frontend-testing", "intermediate", 4, 7, True),
    ("web-accessibility", "intermediate", 4, 8, True),
]

PREREQUISITES = [
    ("css", "html"),
    ("typescript", "javascript"),
    ("react", "html"),
    ("react", "javascript"),
    ("frontend-testing", "javascript"),
    ("frontend-testing", "react"),
    ("web-accessibility", "html"),
]

SOURCES = {
    "mdn": ("MDN Web Docs", "Mozilla", "https://developer.mozilla.org/en-US/docs/Web", "CC-BY-SA 2.5"),
    "git": ("Git Reference", "Git project", "https://git-scm.com/docs", None),
    "typescript": ("TypeScript Handbook", "Microsoft", "https://www.typescriptlang.org/docs/handbook/", "CC-BY 4.0"),
    "react": ("React Reference", "Meta Open Source", "https://react.dev/reference/react", "CC-BY 4.0"),
    "testing": ("Testing Library Guiding Principles", "Testing Library", "https://testing-library.com/docs/guiding-principles", "MIT"),
    "accessibility": ("WAI Tutorials", "W3C Web Accessibility Initiative", "https://www.w3.org/WAI/tutorials/", "W3C document license"),
}

SKILL_SOURCES = {
    "html": "mdn", "css": "mdn", "javascript": "mdn", "git": "git",
    "typescript": "typescript", "react": "react",
    "frontend-testing": "testing", "web-accessibility": "accessibility",
}

# skill, difficulty, prompt, A, B, C, D, correct, explanation
QUESTIONS = [
    ("html", "beginner", "Which HTML element represents the main navigation links?", "<nav>", "<main>", "<aside>", "<section>", "A", "The nav element identifies a section containing navigation links."),
    ("html", "intermediate", "What is the primary purpose of the label element in a form?", "Submit the form", "Associate descriptive text with a form control", "Validate an input", "Group radio buttons", "B", "A label gives a form control an accessible name and a larger activation target."),
    ("html", "advanced", "When should a button be preferred over an anchor element?", "When navigating to another URL", "When downloading every file", "When triggering an action on the current page", "When linking to a document fragment", "C", "Buttons represent actions; anchors represent navigation to a resource or location."),
    ("css", "beginner", "Which CSS declaration creates a flex formatting context?", "position: flex", "display: flex", "layout: flex", "flex: display", "B", "display: flex makes the element a flex container."),
    ("css", "intermediate", "In the standard box model, what does an element's declared width apply to?", "Content box only", "Content and padding", "Content, padding, and border", "Margin box", "A", "With content-box, the default, width applies to the content box."),
    ("css", "advanced", "Which selector has the greatest specificity?", ".card.active", "article .card", "#dashboard .card", "article[data-state='active']", "C", "An ID selector outweighs combinations of class, attribute, and type selectors."),
    ("javascript", "beginner", "Which keyword declares a block-scoped variable that can be reassigned?", "const", "let", "var", "static", "B", "let creates a block-scoped binding whose value may be reassigned."),
    ("javascript", "intermediate", "What does Promise.all do if one input promise rejects?", "Ignores the rejection", "Waits forever", "Rejects with that reason", "Returns only fulfilled values", "C", "Promise.all rejects when any input rejects, using that rejection reason."),
    ("javascript", "advanced", "What is a closure in JavaScript?", "A function bundled with access to its lexical environment", "A method that terminates the event loop", "An immutable object", "A syntax error caused by a missing brace", "A", "A closure lets a function retain access to bindings from its surrounding lexical scope."),
    ("git", "beginner", "Which command copies an existing remote repository locally?", "git init", "git clone", "git copy", "git fetch-file", "B", "git clone creates a local copy and configures the source as a remote."),
    ("git", "intermediate", "What does git rebase typically do?", "Deletes remote history", "Moves or reapplies commits onto another base", "Encrypts commits", "Creates a repository", "B", "Rebase reapplies commits on top of a selected base commit."),
    ("git", "advanced", "Which command can locate the commit that introduced a regression using binary search?", "git blame", "git bisect", "git grep", "git stash", "B", "git bisect performs a binary search between known good and bad commits."),
    ("typescript", "beginner", "What does the string annotation mean in let name: string?", "name is immutable", "name must hold a string value", "name is globally scoped", "name may hold any value", "B", "The annotation restricts assignments to values compatible with string."),
    ("typescript", "intermediate", "What is a union type?", "A type composed with the | operator from multiple alternatives", "A class with two constructors", "A type that cannot be narrowed", "An imported namespace", "A", "A union permits a value to be one of several specified types."),
    ("typescript", "advanced", "What does the never type normally represent?", "Any runtime value", "Only null", "A value that cannot occur", "An unresolved Promise", "C", "never represents an impossible value, such as the result of a function that always throws."),
    ("react", "beginner", "What is the purpose of props in React?", "Persist data in a database", "Pass data from a parent to a child component", "Replace HTML", "Install dependencies", "B", "Props are inputs supplied to a component, commonly by its parent."),
    ("react", "intermediate", "Why should list items have stable keys?", "To apply global CSS", "To help React identify items across renders", "To make every item stateful", "To prevent event handling", "B", "Stable keys let reconciliation associate rendered items with prior items correctly."),
    ("react", "advanced", "Which situation is an appropriate use for useEffect?", "Calculating a value directly from props", "Synchronizing a component with an external system", "Declaring a component", "Formatting static JSX", "B", "Effects are intended for synchronization with systems outside React's render calculation."),
    ("frontend-testing", "beginner", "What should a unit test generally verify?", "The entire production infrastructure", "A focused unit of behavior", "Only CSS colors", "The package manager", "B", "Unit tests exercise a small, focused behavior in isolation or with limited collaborators."),
    ("frontend-testing", "intermediate", "Why do user-focused tests prefer querying a button by accessible role and name?", "It tests implementation details", "It resembles how users and assistive technology find controls", "It disables accessibility", "It makes the button private", "B", "Role-and-name queries align tests with the interface exposed to users."),
    ("frontend-testing", "advanced", "What is a common cause of a flaky asynchronous UI test?", "Waiting for observable UI state", "Using deterministic fixtures", "Depending on arbitrary time delays", "Resetting state between tests", "C", "Fixed delays race against variable execution time; waiting for an observable condition is more reliable."),
    ("web-accessibility", "beginner", "What text should an informative image's alt attribute provide?", "Its file name", "A meaningful text alternative", "Its pixel dimensions", "The word image", "B", "Alternative text should communicate the image's relevant purpose or information."),
    ("web-accessibility", "intermediate", "What must be true of an interactive control for keyboard accessibility?", "It works only on hover", "It can be reached and operated using a keyboard", "It uses a div", "It has an animation", "B", "Keyboard users need to reach the control and activate its functionality."),
    ("web-accessibility", "advanced", "What is the first rule of ARIA?", "Use ARIA on every element", "Prefer native HTML semantics when they provide the needed behavior", "ARIA automatically adds keyboard behavior", "Roles may be invented freely", "B", "Native elements should be used when possible because they provide built-in semantics and behavior."),
]


async def upsert(session, model, values: dict, conflict: list[str], update_fields: list[str]) -> None:
    statement = insert(model).values(**values)
    statement = statement.on_conflict_do_update(
        index_elements=conflict,
        set_={field: getattr(statement.excluded, field) for field in update_fields},
    )
    await session.execute(statement)


async def seed() -> None:
    now = datetime.now(timezone.utc)
    career_id = stable_id("career", "frontend-developer")
    skill_ids = {slug: stable_id("skill", slug) for slug, *_ in SKILLS}
    source_ids = {
        key: stable_id("source", values[2]) for key, values in SOURCES.items()
    }

    async with AsyncSessionLocal() as session:
        await upsert(session, CareerRole, {
            "id": career_id,
            "slug": "frontend-developer",
            "title": "Frontend Developer",
            "description": "Build accessible, tested, responsive web interfaces using modern JavaScript and component frameworks.",
            "is_active": True,
        }, ["slug"], ["title", "description", "is_active", "updated_at"])

        for slug, name, category, description in SKILLS:
            await upsert(session, Skill, {
                "id": skill_ids[slug], "slug": slug, "name": name,
                "category": category, "description": description, "is_active": True,
            }, ["slug"], ["name", "category", "description", "is_active", "updated_at"])

        for slug, level, importance, order_index, required in CAREER_SKILLS:
            await upsert(session, CareerSkill, {
                "id": stable_id("career-skill", f"frontend-developer:{slug}"),
                "career_id": career_id, "skill_id": skill_ids[slug],
                "target_level": level, "importance": importance,
                "order_index": order_index, "is_required": required,
            }, ["career_id", "skill_id"], ["target_level", "importance", "order_index", "is_required"])

        for skill_slug, prerequisite_slug in PREREQUISITES:
            await upsert(session, SkillPrerequisite, {
                "id": stable_id("prerequisite", f"{skill_slug}:{prerequisite_slug}"),
                "skill_id": skill_ids[skill_slug],
                "prerequisite_skill_id": skill_ids[prerequisite_slug],
                "is_required": True,
            }, ["skill_id", "prerequisite_skill_id"], ["is_required"])

        for key, (title, publisher, url, license_name) in SOURCES.items():
            await upsert(session, QuestionSource, {
                "id": source_ids[key], "title": title, "publisher": publisher,
                "url": url, "license": license_name, "accessed_at": now,
            }, ["url"], ["title", "publisher", "license", "accessed_at"])

        for skill_slug, difficulty, prompt, a, b, c, d, correct, explanation in QUESTIONS:
            fingerprint = hashlib.sha256(f"{skill_slug}:{prompt}".lower().encode()).hexdigest()
            await upsert(session, QuizQuestion, {
                "id": stable_id("question", fingerprint),
                "skill_id": skill_ids[skill_slug],
                "source_id": source_ids[SKILL_SOURCES[skill_slug]],
                "fingerprint": fingerprint, "prompt": prompt,
                "options": {"A": a, "B": b, "C": c, "D": d},
                "correct_option": correct, "explanation": explanation,
                "difficulty": difficulty, "status": "approved", "version": 1,
                "reviewed_at": now,
            }, ["fingerprint"], [
                "skill_id", "source_id", "prompt", "options", "correct_option",
                "explanation", "difficulty", "status", "version", "reviewed_at", "updated_at",
            ])

        await session.commit()
        print(
            f"Seeded Frontend Developer: {len(SKILLS)} skills, "
            f"{len(PREREQUISITES)} prerequisites, {len(QUESTIONS)} approved questions."
        )


if __name__ == "__main__":
    asyncio.run(seed())
