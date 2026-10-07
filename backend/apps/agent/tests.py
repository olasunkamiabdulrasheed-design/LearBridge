"""Engine unit tests: tools, providers, guards. No network, no LLM keys."""
from django.test import TestCase

from apps.agent import tools
from apps.agent.config import AgentConfig, get_config
from apps.agent.fetch import FetchSkipped, fetch_url, validate_url
from apps.agent.orchestrator import run_agent
from apps.agent.providers.base import (
    Evaluation,
    LLMProvider,
    ProviderError,
    SearchCandidate,
    SearchProvider,
)
from apps.agent.providers.local import (
    CatalogSearchProvider,
    deterministic_evaluate,
    difficulty_for_level,
)
from apps.agent_runs.models import AgentRun
from apps.core.test_utils import make_user
from apps.gaps.models import GapSource, LearningGap
from apps.plans.models import StudyPlan
from apps.resources.models import LearningResource


def make_gap(profile, topic="fractions", subject="Mathematics"):
    return LearningGap.objects.create(
        student=profile, subject=subject, topic=topic,
        description="d", severity="high", source=GapSource.ASSESSMENT,
        evidence="Attempt 1 on 'Math diagnostic'",
    )


def make_resource(subject="Mathematics", topic="fractions", title="Fractions practice"):
    return LearningResource.objects.create(
        title=title, description="Practice adding fractions.",
        url=f"https://example.org/{title.replace(' ', '-').lower()}",
        resource_type="practice", subject=subject, topic=topic,
        difficulty="beginner", source_name="Catalog",
    )


class FakeSearchProvider(SearchProvider):
    name = "fake"

    def __init__(self, candidates):
        self._candidates = candidates

    def search(self, subject, topic, level, limit):
        return list(self._candidates[:limit])


class FakeLLMProvider(LLMProvider):
    name = "fake-llm"

    @property
    def available(self):
        return True

    def evaluate(self, gap, candidate, excerpt=""):
        return Evaluation(
            score=0.95, level_fit="fake fit", topic_fit="fake topic",
            rationale=f"Fake rationale for {gap.topic}.", fallback=False,
        )

    def draft_item_text(self, gap, resource_title):
        return {
            "title": f"Fake activity for {gap.topic}",
            "rationale": f"Fake rationale citing {gap.topic} evidence.",
        }

    def summarize_report(self, gap_count, plan_title, findings):
        return f"Fake summary for {plan_title}."


class InspectGapsTests(TestCase):
    def test_returns_only_own_open_gaps(self):
        ada = make_user("ada")
        bob = make_user("bob")
        make_gap(ada.student_profile)
        make_gap(bob.student_profile, topic="kinematics", subject="Physics")
        cards = tools.inspect_learning_gaps(ada.student_profile)
        self.assertEqual(len(cards), 1)
        self.assertEqual(cards[0].topic, "fractions")

    def test_rejects_foreign_gap_ids(self):
        ada = make_user("ada")
        bob = make_user("bob")
        foreign = make_gap(bob.student_profile)
        with self.assertRaises(tools.OwnershipError):
            tools.inspect_learning_gaps(ada.student_profile, [foreign.id])


class CatalogSearchTests(TestCase):
    def test_finds_topic_matches_offline(self):
        make_resource()
        make_resource(title="Other", topic="geometry")
        results = CatalogSearchProvider().search("Mathematics", "fractions", "high", 5)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].origin, "catalog")
        self.assertIsNotNone(results[0].resource_id)

    def test_falls_back_to_subject(self):
        make_resource(topic="geometry")
        results = CatalogSearchProvider().search("Mathematics", "algebra", "high", 5)
        self.assertEqual(len(results), 1)


class DeterministicEvaluateTests(TestCase):
    def test_scores_in_range_and_flagged_fallback(self):
        from apps.agent.providers.base import GapCard

        gap = GapCard(gap_id=1, subject="Mathematics", topic="fractions",
                      severity="high", evidence="e", wrong_count=2)
        candidate = SearchCandidate(
            title="Fractions practice", url="https://example.org/x",
            snippet="Practice adding fractions.", origin="catalog",
        )
        evaluation = deterministic_evaluate(gap, candidate)
        self.assertTrue(0.0 <= evaluation.score <= 1.0)
        self.assertTrue(evaluation.fallback)
        self.assertIn("fractions", evaluation.rationale)


class DifficultyMappingTests(TestCase):
    def test_high_maps_to_beginner_first(self):
        self.assertEqual(difficulty_for_level("high"), "beginner")
        self.assertEqual(difficulty_for_level("graduate"), "intermediate")


class FetchGuardTests(TestCase):
    def test_blocks_non_http_scheme(self):
        with self.assertRaises(FetchSkipped):
            validate_url("file:///etc/passwd")

    def test_blocks_loopback(self):
        with self.assertRaises(FetchSkipped):
            validate_url("http://127.0.0.1:8000/x")

    def test_blocks_private_network(self):
        with self.assertRaises(FetchSkipped):
            validate_url("http://10.0.0.5/admin")

    def test_blocks_localhost_name(self):
        with self.assertRaises(FetchSkipped):
            validate_url("http://localhost:8000/x")

    def test_fetch_blocked_host_raises_skipped_without_network(self):
        with self.assertRaises(FetchSkipped):
            fetch_url("http://127.0.0.1:9/unreachable")


class KeylessProviderTests(TestCase):
    def test_llm_unavailable_without_key(self):
        from apps.agent.providers.llm_openai import OpenAICompatibleProvider

        provider = OpenAICompatibleProvider(api_key="", model="x")
        self.assertFalse(provider.available)
        with self.assertRaises(ProviderError):
            provider.evaluate(
                gap=None, candidate=None,  # type: ignore[arg-type]
            )

    def test_tavily_requires_key(self):
        from apps.agent.providers.search_tavily import TavilySearchProvider

        with self.assertRaises(ProviderError):
            TavilySearchProvider(api_key="").search("Math", "fractions", "high", 3)

    def test_factory_defaults_are_local(self):
        import os
        from unittest import mock

        with mock.patch.dict(os.environ, {"AGENT_ALLOW_WEB": "False",
                                          "LEARNBRIDGE_SEARCH_PROVIDER": "tavily",
                                          "TAVILY_API_KEY": "secret",
                                          "LEARNBRIDGE_LLM_PROVIDER": "none",
                                          "LEARNBRIDGE_LLM_API_KEY": ""}):
            from apps.agent.providers.factory import get_llm_provider, get_search_provider

            config = get_config()
            self.assertIsInstance(get_search_provider(config), CatalogSearchProvider)
            self.assertIsNone(get_llm_provider(config))


class ProgressRecommendationTests(TestCase):
    def test_recommends_first_unfinished_item(self):
        ada = make_user("ada")
        plan = StudyPlan.objects.create(
            student=ada.student_profile, title="P",
            start_date="2026-10-01", target_date="2026-10-14",
        )
        from apps.plans.models import StudyPlanItem

        item = StudyPlanItem.objects.create(study_plan=plan, title="Item", ordering=1)
        rec = tools.update_progress_recommendation(ada.student_profile, plan.id)
        self.assertEqual(rec["next_item_id"], item.id)
        self.assertIn("Item", rec["reason"])

    def test_rejects_foreign_plan(self):
        ada = make_user("ada")
        bob = make_user("bob")
        plan = StudyPlan.objects.create(
            student=bob.student_profile, title="P",
            start_date="2026-10-01", target_date="2026-10-14",
        )
        with self.assertRaises(tools.OwnershipError):
            tools.update_progress_recommendation(ada.student_profile, plan.id)


class FakeProviderRunTests(TestCase):
    def test_full_pipeline_with_doubles(self):
        ada = make_user("ada")
        gap = make_gap(ada.student_profile)
        resource = make_resource()
        run = AgentRun.objects.create(
            student=ada.student_profile, purpose="remediate_gaps",
            input_context={"gap_ids": [gap.id]},
        )
        finished = run_agent(
            run.id,
            config=AgentConfig(),
            search=FakeSearchProvider([
                SearchCandidate(title=resource.title, url=resource.url,
                                source_name="Catalog", snippet="fractions",
                                origin="catalog", resource_id=resource.id),
            ]),
            llm=FakeLLMProvider(),
        )
        self.assertEqual(finished.status, "succeeded")
        plan_id = finished.result["plan_id"]
        plan = StudyPlan.objects.get(pk=plan_id)
        self.assertEqual(plan.origin, "agent")
        items = list(plan.items.all())
        self.assertEqual(len(items), 1)
        self.assertIn("fractions", items[0].rationale)
        kinds = list(finished.events.values_list("kind", flat=True))
        for expected in ("started", "gaps_examined", "resources_searched",
                         "resources_evaluated", "plan_built", "report_written",
                         "completed"):
            self.assertIn(expected, kinds)
