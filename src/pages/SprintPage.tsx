import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { updateStory, updateSprint, createStory } from '../lib/api';
import {
  STORY_STATUSES,
  SPRINT_STATUSES,
  emailName,
  todayISO,
  daysBetween,
} from '../lib/types';
import { Modal } from '../components/Modal';

export default function SprintPage() {
  const { sprintId } = useParams();
  const { project, sprints, stories, tasks, members, refresh, loading } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showStory, setShowStory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sprint = sprints.find((s) => s.id === sprintId) ?? null;

  if (loading) return <div className="page-center">Loading…</div>;
  if (!project || !sprint) return <div className="page-center">Sprint not found.</div>;

  const sprintStories = stories.filter((s) => s.sprint_id === sprint.id);
  const totalPoints = sprintStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
  const donePoints = sprintStories
    .filter((s) => s.status === 'done')
    .reduce((a, s) => a + (s.story_points ?? 0), 0);
  const pct = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0;

  const today = todayISO();
  const totalDays = Math.max(daysBetween(sprint.start_date, sprint.end_date), 1);
  const elapsed = Math.min(Math.max(daysBetween(sprint.start_date, today), 0), totalDays);
  const idealPct = Math.round((elapsed / totalDays) * 100);

  const memberOptions = members.map((m) => ({ id: m.user_id, name: emailName(m.user?.email) }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn-link" onClick={() => navigate(`/projects/${project.id}/backlog`)}>
            ← Back to backlog
          </button>
          <h1>{sprint.name}</h1>
          <p className="muted">
            {sprint.start_date} → {sprint.end_date}
            {sprint.goal && <> · {sprint.goal}</>}
          </p>
        </div>
        <div className="header-actions">
          <select
            className="select-inline"
            value={sprint.status}
            onChange={async (e) => {
              try {
                await updateSprint(sprint.id, { status: e.target.value });
                refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            {SPRINT_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => navigate(`/projects/${project.id}/board?sprint=${sprint.id}`)}>
            Open board
          </button>
          <button className="btn btn-primary" onClick={() => setShowStory(true)}>
            + Add story to sprint
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">Stories</div>
          <div className="stat-value">
            {sprintStories.filter((s) => s.status === 'done').length} / {sprintStories.length}
          </div>
          <div className="stat-sub">done</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Velocity</div>
          <div className="stat-value">
            {donePoints} / {totalPoints}
          </div>
          <div className="stat-sub">points</div>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Time elapsed</div>
          <div className="stat-value">
            {elapsed} / {totalDays}
          </div>
          <div className="stat-sub">days</div>
          <div className="progress">
            <div className="progress-fill progress-ideal" style={{ width: `${idealPct}%` }} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Health</div>
          <div className={`stat-value ${pct >= idealPct ? 'text-good' : 'text-warn'}`}>
            {pct >= idealPct ? 'On track' : 'Behind'}
          </div>
          <div className="stat-sub">
            {pct}% done vs {idealPct}% of time
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Sprint stories</h2>
        </div>
        {sprintStories.length === 0 ? (
          <p className="muted">No stories in this sprint yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Story</th>
                <th>Points</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sprintStories.map((s) => {
                const st = tasks.filter((t) => t.story_id === s.id);
                const stDone = st.filter((t) => t.status === 'done').length;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="story-cell">
                        <span className="story-title">{s.title}</span>
                        {s.description && <span className="muted small">{s.description}</span>}
                      </div>
                    </td>
                    <td>{s.story_points ?? '—'}</td>
                    <td>
                      <select
                        className={`select-inline status-${s.status}`}
                        value={s.status}
                        onChange={async (e) => {
                          try {
                            await updateStory(s.id, { status: e.target.value });
                            refresh();
                          } catch (err) {
                            setError((err as Error).message);
                          }
                        }}
                      >
                        {STORY_STATUSES.map((stt) => (
                          <option key={stt.value} value={stt.value}>
                            {stt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="select-inline"
                        value={s.assignee_id ?? ''}
                        onChange={async (e) => {
                          try {
                            await updateStory(s.id, { assignee_id: e.target.value || null });
                            refresh();
                          } catch (err) {
                            setError((err as Error).message);
                          }
                        }}
                      >
                        <option value="">Unassigned</option>
                        {memberOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`pill ${stDone === st.length && st.length > 0 ? 'pill-good' : 'pill-muted'}`}>
                        {stDone}/{st.length} tasks
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <SprintStoryModal
        open={showStory}
        onClose={() => setShowStory(false)}
        projectId={project.id}
        sprintId={sprint.id}
        members={memberOptions}
        userId={user?.id ?? ''}
        onSaved={refresh}
        onError={setError}
      />
    </div>
  );
}

function SprintStoryModal({
  open,
  onClose,
  projectId,
  sprintId,
  members,
  userId,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprintId: string;
  members: { id: string; name: string }[];
  userId: string;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createStory({
        project_id: projectId,
        sprint_id: sprintId,
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: '',
        story_points: points === '' ? null : Math.max(0, parseInt(points, 10)),
        status: 'todo',
        assignee_id: assignee || null,
        reporter_id: userId,
        position: 0,
      });
      setTitle('');
      setDescription('');
      setPoints('');
      setAssignee('');
      onSaved();
      onClose();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add story to sprint">
      <form onSubmit={submit}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="As a user, I can…"
            required
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </label>
        <div className="form-row">
          <label>
            Story points
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 3"
            />
          </label>
          <label>
            Assignee
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Adding…' : 'Add story'}
          </button>
        </div>
      </form>
    </Modal>
  );
}