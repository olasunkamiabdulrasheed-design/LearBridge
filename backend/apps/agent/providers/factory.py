"""Provider selection from engine config. Keyless installs get local providers."""
from apps.agent.config import AgentConfig

from .base import LLMProvider, SearchProvider
from .local import CatalogSearchProvider


def get_search_provider(config: AgentConfig) -> SearchProvider:
    if (
        config.allow_web
        and config.search_provider == "tavily"
        and config.tavily_api_key
    ):
        from .search_tavily import TavilySearchProvider

        return TavilySearchProvider(
            api_key=config.tavily_api_key,
            timeout=20.0,
        )
    return CatalogSearchProvider()


def get_llm_provider(config: AgentConfig) -> LLMProvider | None:
    if config.llm_provider == "openai_compatible" and config.llm_api_key:
        from .llm_openai import OpenAICompatibleProvider

        provider = OpenAICompatibleProvider(
            api_key=config.llm_api_key,
            base_url=config.llm_base_url,
            model=config.llm_model,
            timeout=20.0,
        )
        return provider if provider.available else None
    return None
