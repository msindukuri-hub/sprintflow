import { useState, FormEvent } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { addMember, removeMember } from '../lib/api';

export default function TeamPage() {
  const { project, members, stories, tasks, refresh, loading } = useProject();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (loading) return <div className="page-center">Loading…</div>;
  if (!project) return <div className="page-center">Project not found.</div>;

  const isOwner = members.find((m) => m.user_id === user?.id)?.role === 'owner';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await addMember(project!.id, email.trim(), 'member');
      setEmail('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function workload(userId: string) {
    const openStories = stories.filter((s) => s.assignee_id === userId && s.status !== 'done');
    const points = openStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
    const openTasks = tasks.filter((t) => t.assignee_id === userId && t.status !== 'done').length;
    return { openStories: openStories.length, points, openTasks };
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="muted">Manage who has access to this project and see their workload.</p>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}
      {notice && <div className="banner banner-info">{notice}</div>}

      <div className="card">
        <div className="card-head">
          <h2>Members</h2>
          <span className="muted small">{members.length} people</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Open stories</th>
              <th>Open points</th>
              <th>Open tasks</th>
              {isOwner && <th />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const w = workload(m.user_id);
              const isSelf = m.user_id === user?.id;
              return (
                <tr key={m.user_id}>
                  <td>
                    <div className="member-cell">
                      <span className="avatar">{(m.user?.email ?? '?')[0].toUpperCase()}</span>
                      <span>{m.user?.email ?? 'Unknown'}</span>
                      {isSelf && <span className="pill pill-muted">you</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`pill ${m.role === 'owner' ? 'pill-accent' : 'pill-muted'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td>{w.openStories}</td>
                  <td>{w.points}</td>
                  <td>{w.openTasks}</td>
                  {isOwner && (
                    <td className="row-actions">
                      {!isSelf && (
                        <button
                          className="btn-icon"
                          title="Remove member"
                          onClick={async () => {
                            if (!confirm(`Remove ${m.user?.email} from this project?`)) return;
                            try {
                              await removeMember(project.id, m.user_id);
                              refresh();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isOwner && (
        <div className="card">
          <div className="card-head">
            <h2>Invite a teammate</h2>
          </div>
          <p className="muted small">
            The person must already have a SprintFlow account (sign up with the same email).
          </p>
          <form className="invite-form" onSubmit={submit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              required
            />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add member'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}