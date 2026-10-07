"""Agent engine configuration — environment-driven, safe defaults.

No credentials are invented here; empty keys mean deterministic fallback mode.
"""
import os
from dataclasses import dataclass


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    return _env(name, "1" if default else "0").lower() in ("1", "true", "yes")


@dataclass(frozen=True)
class AgentConfig:
    enabled: bool = True
    max_steps: int = 12
    timeout_seconds: int = 120
    allow_web: bool = False
    llm_provider: str = "none"  # none | openai_compatible
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""
    search_provider: str = "catalog"  # catalog | tavily
    tavily_api_key: str = ""
    max_gaps_per_run: int = 5
    candidates_per_gap: int = 5
    fetch_per_gap: int = 2
    keep_per_gap: int = 2


def get_config() -> AgentConfig:
    return AgentConfig(
        enabled=_env_bool("AGENT_ENABLED", True),
        max_steps=_env_int("AGENT_MAX_STEPS", 12),
        timeout_seconds=_env_int("AGENT_TIMEOUT_SECONDS", 120),
        allow_web=_env_bool("AGENT_ALLOW_WEB", False),
        llm_provider=_env("LEARNBRIDGE_LLM_PROVIDER", "none").strip().lower(),
        llm_api_key=_env("LEARNBRIDGE_LLM_API_KEY", ""),
        llm_base_url=_env("LEARNBRIDGE_LLM_BASE_URL", "").strip(),
        llm_model=_env("LEARNBRIDGE_LLM_MODEL", "").strip(),
        search_provider=_env("LEARNBRIDGE_SEARCH_PROVIDER", "catalog").strip().lower(),
        tavily_api_key=_env("TAVILY_API_KEY", ""),
    )


def per_call_timeout(config: AgentConfig) -> float:
    """Bound each external call; the step cap bounds the whole run."""
    return max(5.0, min(30.0, config.timeout_seconds / 6.0))
