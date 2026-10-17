import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage.jsx";
import AccessPage from "./pages/AccessPage.jsx";
import AgentActivityPage from "./pages/AgentActivityPage.jsx";
import AISetupPage from "./pages/AISetupPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import BusinessPortalPage from "./pages/BusinessPortalPage.jsx";
import ConversationsPage from "./pages/ConversationsPage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import OperIQStoryPage from "./pages/OperIQStoryPage.jsx";
import OperIQFounderStoryPage from "./pages/OperIQFounderStoryPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import SchedulePage from "./pages/SchedulePage.jsx";
import TeamTasksPage from "./pages/TeamTasksPage.jsx";
import DashboardHeader from "./pages/components/DashboardHeader.jsx";
import LoadingScreen from "./pages/components/LoadingScreen.jsx";
import Sidebar from "./pages/components/Sidebar.jsx";
import WorkflowModal from "./pages/components/WorkflowModal.jsx";
import DashboardContent, { NotificationToast } from "./pages/components/DashboardContent.jsx";
import { dashboardClassName, prompts } from "./pages/components/dashboard-config.jsx";
import useDashboardController from "./hooks/useDashboardController.js";

const getPortalSlug = (location) => {
  const pathSlug = location.pathname.match(/^\/b\/([a-z0-9-]+)\/?$/i)?.[1];
  const hostParts = window.location.hostname.toLowerCase().split(".");
  const hostSlug = window.location.hostname.endsWith(".operiq.tech") && !["www", "app"].includes(hostParts[0])
    ? hostParts[0]
    : "";
  return pathSlug || hostSlug;
};

const protectedPage = (allowedPages, pageName, element) => (
  allowedPages.includes(pageName) ? element : <Navigate to="/app" replace />
);

export default function App() {
  const routerNavigate = useNavigate();
  const location = useLocation();
  const controller = useDashboardController({ location, routerNavigate });
  const { data, page, pending, token, error, modal, busy, goal, askAnswer, selectedWorkflow, probe, notice } = controller;

  const portalSlug = getPortalSlug(location);
  if (portalSlug) return <BusinessPortalPage slug={portalSlug} />;

  if (location.pathname === "/story") return <OperIQStoryPage />;
  if (location.pathname === "/story/founder") return <OperIQFounderStoryPage />;

  const inviteToken = location.pathname.match(/^\/invite\/([a-f0-9-]+)\/?$/i)?.[1];
  if (inviteToken) {
    return token
      ? <Navigate to="/app" replace />
      : <InvitePage token={inviteToken} onAuthenticated={controller.authenticated} />;
  }

  if (location.pathname === "/") {
    return <LandingPage navigate={routerNavigate} authenticated={Boolean(token)} />;
  }

  if (["/login", "/signup"].includes(location.pathname)) {
    return token
      ? <Navigate to="/app" replace />
      : <AuthPage mode={location.pathname.slice(1)} onAuthenticated={controller.authenticated} navigate={routerNavigate} />;
  }

  if (!token) return <Navigate to="/login" replace />;
  if (!data) return <LoadingScreen error={error} onRetry={controller.load} onLogout={controller.logout} />;

  return (
    <div className={`${dashboardClassName(page)} mobile:[&_main]:!ml-0`}>
      <Sidebar data={data} page={page} pending={pending} allowedPages={controller.allowedPages} navigate={controller.navigate} logout={controller.logout} />
      <main>
        <DashboardHeader data={data} page={page} pending={pending} navigate={controller.navigate} />
        <DashboardContent controller={controller}>
          <Routes>
            <Route path="/app" element={<OverviewPage {...controller.pageProps} />} />
            <Route path="/app/customers" element={protectedPage(controller.allowedPages, "Customers", <CustomersPage {...controller.pageProps} />)} />
            <Route path="/app/schedule" element={protectedPage(controller.allowedPages, "Schedule", <SchedulePage {...controller.pageProps} />)} />
            <Route path="/app/team-tasks" element={protectedPage(controller.allowedPages, "Team & tasks", <TeamTasksPage {...controller.pageProps} />)} />
            <Route path="/app/conversations" element={protectedPage(controller.allowedPages, "Conversations", <ConversationsPage {...controller.pageProps} />)} />
            <Route path="/app/approvals" element={protectedPage(controller.allowedPages, "Approvals", <ApprovalsPage {...controller.pageProps} />)} />
            <Route path="/app/agent-activity" element={protectedPage(controller.allowedPages, "Agent activity", <AgentActivityPage {...controller.pageProps} />)} />
            <Route path="/app/profile" element={protectedPage(controller.allowedPages, "Profile", <ProfilePage {...controller.pageProps} />)} />
            <Route path="/app/ai-setup" element={protectedPage(controller.allowedPages, "Teach your AI", <AISetupPage {...controller.pageProps} />)} />
            <Route path="/app/access" element={protectedPage(controller.allowedPages, "Team access", <AccessPage {...controller.pageProps} />)} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </DashboardContent>
      </main>
      <NotificationToast notice={notice} onDismiss={() => controller.setNotice("")} />
      <WorkflowModal
        modal={modal}
        busy={busy}
        setModal={controller.setModal}
        goal={goal}
        setGoal={controller.setGoal}
        askAnswer={askAnswer}
        setAskAnswer={controller.setAskAnswer}
        selectedWorkflow={selectedWorkflow}
        setSelectedWorkflow={controller.setSelectedWorkflow}
        probe={probe}
        setProbe={controller.setProbe}
        data={data}
        prompts={prompts}
        run={controller.run}
      />
    </div>
  );
}
