import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import {
  createSprint,
  updateSprint,
  deleteSprint,
  createStory,
  updateStory,
  deleteStory,
  createTask,
  updateTask,
  deleteTask,
  UserStory,
  Sprint,
} from '../lib/api';
import {
  STORY_STATUSES,
  TASK_STATUSES,
  SPRINT_STATUSES,
  emailName,
  todayISO,
  addDaysISO,
} from '../lib/types';
import { Modal } from '../components/Modal';

export default function BacklogPage() {
  const { project, sprints, stories, tasks, members, refresh } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSprint, setShowSprint] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [editing, setEditing] = useState<UserStory | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!project) return <div className="page-center">Project not found.</div>;

  const memberOptions = members.map((m) => ({ id: m.user_id, name: emailName(m.user?.email) }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Backlog &amp; Stories</h1>
          <p className="muted">Plan sprints and manage your user stories.</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowSprint(true)}>
            + New sprint
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowStory(true); }}>
            + New story
          </button>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="card">
        <div className="card-head">
          <h2>Sprints</h2>
        </div>
        {sprints.length === 0 ? (
          <p className="muted">No sprints yet. Create one to start planning.</p>
        ) : (
          <div className="sprint-list">
            {sprints.map((s) => (
              <SprintRow
                key={s.id}
                sprint={s}
                storyCount={stories.filter((st) => st.sprint_id === s.id).length}
                onOpen={() => navigate(`/projects/${project.id}/sprints/${s.id}`)}
                onChange={async (patch) => {
                  try {
                    await updateSprint(s.id, patch);
                    refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                onDelete={async () => {
                  if (!confirm(`Delete sprint "${s.name}"? Its stories return to the backlog.`)) return;
                  try {
                    await deleteSprint(s.id);
                    refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>User stories</h2>
          <span className="muted small">{stories.length} total</span>
        </div>
        {stories.length === 0 ? (
          <p className="muted">No stories yet. Add your first user story.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Story</th>
                <th>Points</th>
                <th>Status</th>
                <th>Sprint</th>
                <th>Assignee</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {stories.map((s) => (
                <tr key={s.id}>
                  <td>
                    <a className="story-link" onClick={() => { setEditing(s); setShowStory(true); }}>
                      {s.title}
                    </a>
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
                      {STORY_STATUSES.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="select-inline"
                      value={s.sprint_id ?? ''}
                      onChange={async (e) => {
                        try {
                          await updateStory(s.id, { sprint_id: e.target.value || null });
                          refresh();
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    >
                      <option value="">Backlog</option>
                      {sprints.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name}
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
                  <td className="row-actions">
                    <button
                      className="btn-icon"
                      title="Edit story & tasks"
                      onClick={() => { setEditing(s); setShowStory(true); }}
                    >
                      ✎
                    </button>
                    <button
                      className="btn-icon"
                      title="Delete story"
                      onClick={async () => {
                        if (!confirm(`Delete story "${s.title}" and its tasks?`)) return;
                        try {
                          await deleteStory(s.id);
                          refresh();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SprintModal
        open={showSprint}
        onClose={() => setShowSprint(false)}
        projectId={project.id}
        onCreated={refresh}
        onError={setError}
      />
      <StoryModal
        open={showStory}
        onClose={() => setShowStory(false)}
        story={editing}
        projectId={project.id}
        sprints={sprints}
        members={memberOptions}
        tasks={tasks}
        userId={user?.id ?? ''}
        onSaved={refresh}
        onError={setError}
      />
    </div>
  );
}

function SprintRow({
  sprint,
  storyCount,
  onOpen,
  onChange,
  onDelete,
}: {
  sprint: Sprint;
  storyCount: number;
  onOpen: () => void;
  onChange: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="sprint-row">
      <a className="sprint-name" onClick={onOpen}>
        {sprint.name}
      </a>
      <span className="muted small">
        {sprint.start_date} → {sprint.end_date} · {storyCount} stories
      </span>
      <select
        className="select-inline"
        value={sprint.status}
        onChange={(e) => onChange({ status: e.target.value })}
      >
        {SPRINT_STATUSES.map((st) => (
          <option key={st.value} value={st.value}>
            {st.label}
          </option>
        ))}
      </select>
      <button className="btn-icon" title="Delete sprint" onClick={onDelete}>
        🗑
      </button>
    </div>
  );
}

function SprintModal({
  open,
  onClose,
  projectId,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(addDaysISO(13));
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createSprint({
        project_id: projectId,
        name: name.trim(),
        goal: goal.trim(),
        start_date: start,
        end_date: end,
        status: 'planned',
      });
      setName('');
      setGoal('');
      onCreated();
      onClose();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New sprint">
      <form onSubmit={submit}>
        <label>
          Sprint name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 1" required autoFocus />
        </label>
        <label>
          Goal
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="What does success look like this sprint?"
            rows={2}
          />
        </label>
        <div className="form-row">
          <label>
            Start date
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            End date
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create sprint'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StoryModal({
  open,
  onClose,
  story,
  projectId,
  sprints,
  members,
  tasks,
  userId,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  story: UserStory | null;
  projectId: string;
  sprints: Sprint[];
  members: { id: string; name: string }[];
  tasks: import('../lib/types').Task[];
  userId: string;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [points, setPoints] = useState<string>('');
  const [status, setStatus] = useState('backlog');
  const [sprintId, setSprintId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [newTask, setNewTask] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync form when the target story changes
  const [lastStoryId, setLastStoryId] = useState<string | null | undefined>(undefined);
  if (open && story?.id !== lastStoryId) {
    setLastStoryId(story?.id ?? null);
    setTitle(story?.title ?? '');
    setDescription(story?.description ?? '');
    setAcceptance(story?.acceptance_criteria ?? '');
    setPoints(story?.story_points != null ? String(story.story_points) : '');
    setStatus(story?.status ?? 'backlog');
    setSprintId(story?.sprint_id ?? '');
    setAssignee(story?.assignee_id ?? '');
    setNewTask('');
  }
  if (!open && lastStoryId !== undefined) setLastStoryId(undefined);

  const storyTasks = story ? tasks.filter((t) => t.story_id === story.id) : [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        acceptance_criteria: acceptance.trim(),
        story_points: points === '' ? null : Math.max(0, parseInt(points, 10)),
        status,
        sprint_id: sprintId || null,
        assignee_id: assignee || null,
      };
      if (story) {
        await updateStory(story.id, payload);
      } else {
        await createStory({
          project_id: projectId,
          ...payload,
          reporter_id: userId,
          position: 0,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addTask(e: FormEvent) {
    e.preventDefault();
    if (!story || !newTask.trim()) return;
    try {
      await createTask({
        story_id: story.id,
        title: newTask.trim(),
        description: '',
        status: 'todo',
        assignee_id: null,
        position: storyTasks.length,
      });
      setNewTask('');
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={story ? 'Edit story' : 'New user story'} wide>
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
            placeholder="More context about this story"
          />
        </label>
        <label>
          Acceptance criteria
          <textarea
            value={acceptance}
            onChange={(e) => setAcceptance(e.target.value)}
            rows={2}
            placeholder={'- Given… When… Then…'}
          />
        </label>
        <div className="form-row form-row-3">
          <label>
            Story points
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 5"
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STORY_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
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
        <label>
          Sprint
          <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
            <option value="">Backlog (no sprint)</option>
            {sprints.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : story ? 'Save story' : 'Create story'}
          </button>
        </div>
      </form>

      {story && (
        <div className="tasks-section">
          <h3>Tasks</h3>
          {storyTasks.length === 0 && <p className="muted small">No tasks yet.</p>}
          <ul className="task-list">
            {storyTasks.map((t) => (
              <li key={t.id} className="task-item">
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  onChange={async (e) => {
                    try {
                      await updateTask(t.id, { status: e.target.checked ? 'done' : 'todo' });
                      onSaved();
                    } catch (err) {
                      onError((err as Error).message);
                    }
                  }}
                />
                <span className={t.status === 'done' ? 'task-title done' : 'task-title'}>
                  {t.title}
                </span>
                {t.status !== 'done' && (
                  <select
                    className="select-inline"
                    value={t.status}
                    onChange={async (e) => {
                      try {
                        await updateTask(t.id, { status: e.target.value });
                        onSaved();
                      } catch (err) {
                        onError((err as Error).message);
                      }
                    }}
                  >
                    {TASK_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="btn-icon"
                  title="Delete task"
                  onClick={async () => {
                    try {
                      await deleteTask(t.id);
                      onSaved();
                    } catch (err) {
                      onError((err as Error).message);
                    }
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form className="task-add" onSubmit={addTask}>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task…"
            />
            <button className="btn btn-primary" type="submit">
              Add
            </button>
          </form>
        </div>
      )}
    </Modal>
  );
}