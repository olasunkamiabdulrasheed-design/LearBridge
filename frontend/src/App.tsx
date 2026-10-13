import { Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthLayout } from "./components/layout/AuthLayout";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AboutPage } from "./pages/About";
import { AgentPage } from "./pages/Agent";
import { AssessmentPage } from "./pages/Assessment";
import { DashboardPage } from "./pages/Dashboard";
import { FAQPage } from "./pages/FAQ";
import { FeaturesPage } from "./pages/Features";
import { HowItWorksPage } from "./pages/HowItWorks";
import { LandingPage } from "./pages/Landing";
import { LearningPlanPage } from "./pages/LearningPlan";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { ProgressPage } from "./pages/Progress";
import { ReportPage } from "./pages/Report";
import { ResourcesPage } from "./pages/Resources";
import { NotFoundPage } from "./pages/Placeholder";

function LearnerLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing site: shared nav + footer, no learner sidebar. */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FAQPage />} />
      </Route>
      {/* Authentication: focused layout without the marketing nav/footer. */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      {/* Authenticated learner application. */}
      <Route element={<LearnerLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="/plan" element={<LearningPlanPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
