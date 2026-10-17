import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listMyProjects, Project } from '../lib/api';
import { emailName } from '../lib/types';

export default function Layout() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    listMyProjects().then(setProjects).catch(() => {});
  }, [session]);

  const current = projects.find((p) => p.id === projectId);

  async function signOut() {
    const { supabase } = await import('../lib/supabase');
    await supabase?.auth.signOut();
    navigate('/auth');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <span className="brand-mark">S</span>
          <span className="brand-name">SprintFlow</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Project</div>
          <div className="project-picker">
            <select
              value={projectId ?? ''}
              onChange={(e) => navigate(`/projects/${e.target.value}`)}
            >
              <option value="" disabled>
                {projects.length ? 'Select project…' : 'No projects yet'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {current && (
          <nav className="sidebar-nav">
            <NavLink to={`/projects/${current.id}`} end>
              <span className="nav-icon">◧</span> Dashboard
            </NavLink>
            <NavLink to={`/projects/${current.id}/backlog`}>
              <span className="nav-icon">☰</span> Backlog &amp; Stories
            </NavLink>
            <NavLink to={`/projects/${current.id}/board`}>
              <span className="nav-icon">▦</span> Kanban Board
            </NavLink>
            <NavLink to={`/projects/${current.id}/team`}>
              <span className="nav-icon">◉</span> Team
            </NavLink>
            <NavLink to={`/projects/${current.id}/reports`}>
              <span className="nav-icon">◫</span> Reports
            </NavLink>
          </nav>
        )}

        <div className="sidebar-footer">
          <div className="user-chip" onClick={() => setMenuOpen((v) => !v)}>
            <span className="avatar">{(user?.email ?? '?')[0].toUpperCase()}</span>
            <span className="user-email">{emailName(user?.email)}</span>
          </div>
          {menuOpen && (
            <div className="user-menu">
              <button onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}