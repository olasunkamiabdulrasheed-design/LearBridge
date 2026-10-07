"""Provider interfaces. Swappable; fakes implement these in tests."""
from dataclasses import dataclass, field


class ProviderError(Exception):
    """External provider failure. Orchestrator degrades to fallbacks."""


@dataclass(frozen=True)
class SearchCandidate:
    title: str
    url: str
    source_name: str = ""
    snippet: str = ""
    origin: str = "catalog"  # catalog | web
    resource_id: int | None = None  # set for catalog rows


@dataclass(frozen=True)
class Evaluation:
    score: float  # 0..1
    level_fit: str
    topic_fit: str
    rationale: str
    fallback: bool = False


@dataclass(frozen=True)
class GapCard:
    gap_id: int
    subject: str
    topic: str
    severity: str
    evidence: str
    wrong_count: int
    recent_attempt_ids: list = field(default_factory=list)


class SearchProvider:
    name = "base"

    def search(self, subject: str, topic: str, level: str, limit: int) -> list:
        """Return SearchCandidate list. Raise ProviderError on failure."""
        raise NotImplementedError


class LLMProvider:
    name = "none"

    @property
    def available(self) -> bool:
        return False

    def evaluate(self, gap: GapCard, candidate: SearchCandidate, excerpt: str = "") -> Evaluation:
        raise NotImplementedError

    def draft_item_text(self, gap: GapCard, resource_title: str) -> dict:
        """Return {title, rationale} strings for one plan item."""
        raise NotImplementedError

    def summarize_report(self, gap_count: int, plan_title: str, findings: list) -> str:
        raise NotImplementedError
