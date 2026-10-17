import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import DashboardPage from './pages/DashboardPage';
import BacklogPage from './pages/BacklogPage';
import SprintPage from './pages/SprintPage';
import BoardPage from './pages/BoardPage';
import TeamPage from './pages/TeamPage';
import ReportsPage from './pages/ReportsPage';
import SetupBanner from './components/SetupBanner';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  if (loading) return <div className="page-center">Loading…</div>;
  if (!configured) return <AuthPage />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  const { configured, user, loading } = useAuth();
  return (
    <>
      {!configured && <SetupBanner />}
      <Routes>
        <Route path="/auth" element={loading ? <div className="page-center">Loading…</div> : user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectPage />}>
            <Route index element={<DashboardPage />} />
            <Route path="backlog" element={<BacklogPage />} />
            <Route path="sprints/:sprintId" element={<SprintPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}