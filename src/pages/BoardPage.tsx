import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { updateStory } from '../lib/api';
import { STORY_STATUSES, emailName, UserStory } from '../lib/types';

export default function BoardPage() {
  const { project, sprints, stories, tasks, members, refresh, loading } = useProject();
  const [params, setParams] = useSearchParams();
  const [sprintFilter, setSprintFilter] = useState<string>(params.get('sprint') ?? '');
  const [error, setError] = useState<string | null>(null);

  const visibleStories = useMemo(() => {
    if (!sprintFilter) return stories;
    return stories.filter((s) => s.sprint_id === sprintFilter);
  }, [stories, sprintFilter]);

  if (loading) return <div className="page-center">Loading…</div>;
  if (!project) return <div className="page-center">Project not found.</div>;

  const memberOptions = members.map((m) => ({ id: m.user_id, name: emailName(m.user?.email) }));

  async function move(story: UserStory, status: string) {
    try {
      await updateStory(story.id, { status });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Kanban Board</h1>
          <p className="muted">Drag-free status updates — pick a new status to move a card.</p>
        </div>
        <div className="header-actions">
          <select
            className="select-inline"
            value={sprintFilter}
            onChange={(e) => {
              setSprintFilter(e.target.value);
              setParams(e.target.value ? { sprint: e.target.value } : {});
            }}
          >
            <option value="">All stories</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="board">
        {STORY_STATUSES.map((col) => {
          const colStories = visibleStories.filter((s) => s.status === col.value);
          const colPoints = colStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
          return (
            <div key={col.value} className="board-col">
              <div className="board-col-head">
                <span className={`status-dot status-${col.value}`} />
                <span className="board-col-title">{col.label}</span>
                <span className="board-col-count">{colStories.length}</span>
                <span className="board-col-points">{colPoints} pts</span>
              </div>
              <div className="board-col-body">
                {colStories.map((s) => {
                  const st = tasks.filter((t) => t.story_id === s.id);
                  const stDone = st.filter((t) => t.status === 'done').length;
                  return (
                    <div key={s.id} className="board-card">
                      <div className="board-card-title">{s.title}</div>
                      <div className="board-card-meta">
                        <span className="pill pill-muted">{s.story_points ?? '—'} pts</span>
                        <span className="pill pill-muted">
                          {stDone}/{st.length} tasks
                        </span>
                      </div>
                      <div className="board-card-foot">
                        <span className="avatar avatar-sm">
                          {s.assignee_id
                            ? (memberOptions.find((m) => m.id === s.assignee_id)?.name ?? '?')[0]
                            : '·'}
                        </span>
                        <span className="board-card-assignee">
                          {s.assignee_id
                            ? memberOptions.find((m) => m.id === s.assignee_id)?.name
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div className="board-card-actions">
                        <select
                          className="select-inline"
                          value={s.status}
                          onChange={(e) => move(s, e.target.value)}
                        >
                          {STORY_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
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
                      </div>
                    </div>
                  );
                })}
                {colStories.length === 0 && (
                  <div className="board-empty">No stories</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}