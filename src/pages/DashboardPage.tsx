import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { STORY_STATUSES, emailName, todayISO } from '../lib/types';

export default function DashboardPage() {
  const { project, sprints, stories, members, loading } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeSprint = useMemo(() => {
    const today = todayISO();
    return (
      sprints.find((s) => s.status === 'active') ??
      sprints.find((s) => s.start_date <= today && s.end_date >= today) ??
      sprints[sprints.length - 1] ??
      null
    );
  }, [sprints]);

  const activeStories = useMemo(
    () => (activeSprint ? stories.filter((s) => s.sprint_id === activeSprint.id) : []),
    [stories, activeSprint]
  );

  const byStatus = useMemo(() => {
    const m: Record<string, number> = {};
    for (const st of STORY_STATUSES) m[st.value] = 0;
    for (const s of activeStories) m[s.status] = (m[s.status] ?? 0) + 1;
    return m;
  }, [activeStories]);

  const totalPoints = activeStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
  const donePoints = activeStories
    .filter((s) => s.status === 'done')
    .reduce((a, s) => a + (s.story_points ?? 0), 0);
  const pct = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0;

  const myOpen = useMemo(
    () =>
      stories.filter(
        (s) => s.assignee_id === user?.id && s.status !== 'done'
      ).length,
    [stories, user]
  );

  if (loading) return <div className="page-center">Loading…</div>;
  if (!project) return <div className="page-center">Project not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || 'No description'}</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => navigate(`/projects/${project.id}/board`)}>
            Open board
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/projects/${project.id}/backlog`)}
          >
            + Add story
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Active sprint" value={activeSprint ? activeSprint.name : 'None'} sub={activeSprint ? `${activeSprint.start_date} → ${activeSprint.end_date}` : 'Plan a sprint to begin'} />
        <StatCard label="Sprint stories" value={String(activeStories.length)} sub={`${activeStories.filter((s) => s.status === 'done').length} done`} />
        <StatCard label="Velocity (points)" value={`${donePoints} / ${totalPoints}`} sub={`${pct}% complete`} progress={pct} />
        <StatCard label="My open stories" value={String(myOpen)} sub={`Assigned to ${emailName(user?.email)}`} />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <h2>Sprint progress</h2>
            {activeSprint && (
              <span className="pill pill-muted">{activeSprint.status}</span>
            )}
          </div>
          {!activeSprint ? (
            <p className="muted">No sprints yet. Head to the backlog to create one.</p>
          ) : (
            <div className="status-bars">
              {STORY_STATUSES.map((st) => {
                const count = byStatus[st.value] ?? 0;
                const width = activeStories.length ? (count / activeStories.length) * 100 : 0;
                return (
                  <div key={st.value} className="status-bar-row">
                    <span className="status-bar-label">{st.label}</span>
                    <div className="status-bar-track">
                      <div
                        className={`status-bar-fill status-${st.value}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="status-bar-count">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Team</h2>
            <span className="muted small">{members.length} members</span>
          </div>
          <div className="member-list">
            {members.map((m) => (
              <div key={m.user_id} className="member-row">
                <span className="avatar">{(m.user?.email ?? '?')[0].toUpperCase()}</span>
                <span className="member-name">{emailName(m.user?.email)}</span>
                <span className={`pill ${m.role === 'owner' ? 'pill-accent' : 'pill-muted'}`}>
                  {m.role}
                </span>
              </div>
            ))}
            {members.length === 0 && <p className="muted">No members yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {progress !== undefined && (
        <div className="progress">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}