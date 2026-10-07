import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AgentPage } from "./pages/Agent";
import { AssessmentPage } from "./pages/Assessment";
import { DashboardPage } from "./pages/Dashboard";
import { LearningPlanPage } from "./pages/LearningPlan";
import { LoginPage } from "./pages/Login";
import { ReportPage } from "./pages/Report";
import {
  NotFoundPage,
  ProgressPage,
  ResourcesPage,
} from "./pages/Placeholder";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/reports/:id" element={<ReportPage />} />
        <Route path="/plan" element={<LearningPlanPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
