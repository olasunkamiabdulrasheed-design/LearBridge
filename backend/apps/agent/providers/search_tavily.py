"""Tavily web-search provider (keyed, optional, plain REST — no SDK).

Only used when AGENT_ALLOW_WEB is true and TAVILY_API_KEY is set.
Failures raise ProviderError; the orchestrator falls back to catalog search.
"""
from .base import ProviderError, SearchCandidate, SearchProvider

TAVILY_ENDPOINT = "https://api.tavily.com/search"


class TavilySearchProvider(SearchProvider):
    name = "tavily"

    def __init__(self, api_key: str, timeout: float = 20.0):
        self._api_key = api_key
        self._timeout = timeout

    def search(self, subject: str, topic: str, level: str, limit: int) -> list:
        if not self._api_key:
            raise ProviderError("Tavily API key not configured")
        try:
            import httpx
        except ImportError as exc:
            raise ProviderError("HTTP client unavailable") from exc
        query = f"{subject} {topic} learn tutorial practice".strip()
        try:
            response = httpx.post(
                TAVILY_ENDPOINT,
                json={
                    "api_key": self._api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": max(1, min(limit, 10)),
                    "include_answer": False,
                },
                timeout=self._timeout,
            )
            if response.status_code != 200:
                raise ProviderError(f"Tavily HTTP {response.status_code}")
            data = response.json()
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(f"Tavily request failed: {type(exc).__name__}") from exc
        candidates = []
        for hit in data.get("results", [])[:limit]:
            url = hit.get("url", "")
            if not url:
                continue
            candidates.append(
                SearchCandidate(
                    title=(hit.get("title", "") or url)[:255],
                    url=url,
                    source_name="Web search",
                    snippet=(hit.get("content", "") or "")[:500],
                    origin="web",
                )
            )
        return candidates
