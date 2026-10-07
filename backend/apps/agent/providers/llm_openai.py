"""LLM provider: single OpenAI-compatible integration (lazy, optional).

Used only for evaluation/ranking prose and report summaries — never for
side effects. Any failure (missing lib, missing key, bad response) raises
ProviderError and the orchestrator uses deterministic fallbacks.
Fetched web content is passed as labelled DATA, never as instructions.
"""
import json

from .base import Evaluation, GapCard, LLMProvider, ProviderError, SearchCandidate


EVALUATE_SYSTEM = (
    "You evaluate educational resources for a student. "
    "Respond with JSON only: "
    '{"score": 0.0-1.0, "level_fit": "...", "topic_fit": "...", "rationale": "..."}. '
    "The rationale must reference the student's gap topic in one sentence. "
    "Never include chain-of-thought."
)


class OpenAICompatibleProvider(LLMProvider):
    name = "openai_compatible"

    def __init__(self, api_key: str, base_url: str = "", model: str = "", timeout: float = 20.0):
        self._api_key = api_key
        self._base_url = base_url or None
        self._model = model or "gpt-4o-mini"
        self._timeout = timeout

    @property
    def available(self) -> bool:
        if not self._api_key:
            return False
        try:
            import openai  # noqa: F401
        except ImportError:
            return False
        return True

    def _client(self):
        try:
            import openai
        except ImportError as exc:
            raise ProviderError("openai package not installed") from exc
        if not self._api_key:
            raise ProviderError("LLM API key not configured")
        kwargs = {"api_key": self._api_key, "timeout": self._timeout}
        if self._base_url:
            kwargs["base_url"] = self._base_url
        return openai.OpenAI(**kwargs)

    def _complete(self, system: str, user: str) -> str:
        try:
            client = self._client()
            response = client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.2,
                max_tokens=400,
            )
            return (response.choices[0].message.content or "").strip()
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(f"LLM request failed: {type(exc).__name__}") from exc

    def evaluate(self, gap: GapCard, candidate: SearchCandidate, excerpt: str = "") -> Evaluation:
        if not self.available:
            raise ProviderError("LLM provider not available (missing key or package)")
        user = (
            f"Student gap: {gap.subject} / {gap.topic} (severity {gap.severity}). "
            f"Evidence: {gap.evidence[:300]}. Wrong answers on this topic: {gap.wrong_count}. "
            f"Candidate: {candidate.title} ({candidate.url}). "
            f"Snippet DATA: {(excerpt or candidate.snippet)[:800]}"
        )
        raw = self._complete(EVALUATE_SYSTEM, user)
        try:
            data = json.loads(raw)
            score = float(data["score"])
            if not 0.0 <= score <= 1.0:
                raise ValueError("score out of range")
            return Evaluation(
                score=round(score, 2),
                level_fit=str(data.get("level_fit", ""))[:200],
                topic_fit=str(data.get("topic_fit", ""))[:200],
                rationale=str(data.get("rationale", ""))[:500],
                fallback=False,
            )
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderError(f"LLM returned unusable evaluation: {exc}") from exc

    def draft_item_text(self, gap: GapCard, resource_title: str) -> dict:
        raw = self._complete(
            "Draft one study-plan activity as JSON only: "
            '{"title": "...", "rationale": "..."}. '
            "The rationale must name the student's gap topic and evidence in one sentence.",
            f"Gap: {gap.subject} / {gap.topic}. Evidence: {gap.evidence[:300]}. "
            f"Resource: {resource_title}.",
        )
        try:
            data = json.loads(raw)
            return {
                "title": str(data["title"])[:200],
                "rationale": str(data["rationale"])[:800],
            }
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderError(f"LLM returned unusable draft: {exc}") from exc

    def summarize_report(self, gap_count: int, plan_title: str, findings: list) -> str:
        topics = ", ".join(f"{f['subject']}/{f['topic']}" for f in findings[:5])
        raw = self._complete(
            "Write a 3-sentence student-facing summary of this learning report. "
            "Name the gap topics. No chain-of-thought, no generic advice.",
            f"Gaps: {gap_count} ({topics}). Plan: {plan_title}.",
        )
        return raw[:1000]
