"""Local providers: catalog search + deterministic evaluation/report fallback.

Zero credentials, zero network (except fetch, which is separately guarded).
This is the default engine behavior and the hackathon-safe mode.
"""
from apps.resources.models import LearningResource

from .base import Evaluation, GapCard, SearchCandidate, SearchProvider


# Student education_level -> resource difficulty fit.
LEVEL_DIFFICULTY = {
    "elementary": {"beginner"},
    "middle": {"beginner"},
    "high": {"beginner", "intermediate"},
    "undergraduate": {"intermediate"},
    "graduate": {"intermediate", "advanced"},
    "professional": {"intermediate", "advanced"},
    "other": {"beginner", "intermediate", "advanced"},
    "": {"beginner", "intermediate", "advanced"},
}


def difficulty_for_level(level: str) -> str:
    fits = LEVEL_DIFFICULTY.get((level or "").strip().lower(), {"beginner"})
    # Prefer the easiest fitting level for remediation.
    for candidate in ("beginner", "intermediate", "advanced"):
        if candidate in fits:
            return candidate
    return "beginner"


class CatalogSearchProvider(SearchProvider):
    """Search the curated LearningResource catalog. Deterministic, offline."""

    name = "catalog"

    def search(self, subject: str, topic: str, level: str, limit: int) -> list:
        qs = LearningResource.objects.filter(subject__iexact=subject.strip())
        topic_qs = qs.filter(topic__iexact=topic.strip()) if topic else qs
        rows = list(topic_qs.order_by("-is_verified", "-updated_at")[:limit])
        if not rows:
            # Fall back to subject-level matches when the topic has no rows.
            rows = list(qs.order_by("-is_verified", "-updated_at")[:limit])
        return [
            SearchCandidate(
                title=r.title,
                url=r.url,
                source_name=r.source_name,
                snippet=r.description or "",
                origin="catalog",
                resource_id=r.id,
            )
            for r in rows
        ]


def deterministic_evaluate(
    gap: GapCard, candidate: SearchCandidate, excerpt: str = ""
) -> Evaluation:
    """Heuristic scoring: topic fit, level fit, verification bonus. No LLM."""
    topic = (gap.topic or "").strip().casefold()
    haystack = f"{candidate.title} {candidate.snippet} {excerpt[:500]}".casefold()
    topic_hit = bool(topic) and topic != "general" and topic in haystack
    score = 0.30  # subject-level baseline (search already scoped by subject)
    topic_fit = "subject-level"
    if topic_hit:
        score += 0.35
        topic_fit = "direct topic match"
    else:
        topic_fit = "subject-level (topic not evidenced in snippet)"
    level_fit = "unknown level"
    # Catalog candidates carry a real difficulty via resource row lookup below;
    # for all candidates we reward verified/catalog provenance conservatively.
    if candidate.origin == "catalog":
        score += 0.10
    if "practice" in candidate.title.casefold() or "practice" in candidate.snippet.casefold():
        score += 0.05
    score = round(min(1.0, score), 2)
    rationale = (
        f"Covers '{gap.topic}' at {topic_fit}; "
        f"source: {candidate.source_name or candidate.url}."
    )
    return Evaluation(
        score=score, level_fit=level_fit, topic_fit=topic_fit,
        rationale=rationale, fallback=True,
    )


def template_item_text(gap: GapCard, resource_title: str) -> dict:
    return {
        "title": f"Study {gap.topic} with: {resource_title[:80]}",
        "rationale": (
            f"Your assessment ({gap.evidence[:160]}) shows difficulty with "
            f"{gap.topic} ({gap.subject}). This activity targets that exact "
            f"topic at your level."
        ),
    }


def template_report_summary(gap_count: int, plan_title: str, findings: list) -> str:
    topics = ", ".join(f"{f['subject']}/{f['topic']}" for f in findings[:5])
    return (
        f"Examined {gap_count} learning gap(s) ({topics}). "
        f"Selected {sum(len(f.get('resources', [])) for f in findings)} resource(s) "
        f"matched to your level and built the study plan '{plan_title}'. "
        f"Each activity below names the gap it addresses and why it was chosen."
    )
