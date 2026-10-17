import { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { emailName, daysBetween, todayISO } from '../lib/types';

export default function ReportsPage() {
  const { project, sprints, stories, tasks, members, loading } = useProject();
  const [sprintId, setSprintId] = useState<string>('');

  const selected = sprints.find((s) => s.id === sprintId) ?? sprints[sprints.length - 1] ?? null;

  const report = useMemo(() => {
    if (!selected) return null;
    const sprintStories = stories.filter((s) => s.sprint_id === selected.id);
    const totalPoints = sprintStories.reduce((a, s) => a + (s.story_points ?? 0), 0);
    const donePoints = sprintStories
      .filter((s) => s.status === 'done')
      .reduce((a, s) => a + (s.story_points ?? 0), 0);
    const doneStories = sprintStories.filter((s) => s.status === 'done');
    const sprintTasks = tasks.filter((t) => sprintStories.some((s) => s.id === t.story_id));
    const doneTasks = sprintTasks.filter((t) => t.status === 'done');

    const today = todayISO();
    const totalDays = Math.max(daysBetween(selected.start_date, selected.end_date), 1);
    const elapsed = Math.min(Math.max(daysBetween(selected.start_date, today), 0), totalDays);
    const idealPct = Math.round((elapsed / totalDays) * 100);
    const actualPct = totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0;

    // Per-member contribution in this sprint
    const byMember = members.map((m) => {
      const mStories = sprintStories.filter((s) => s.assignee_id === m.user_id);
      const mDone = mStories.filter((s) => s.status === 'done');
      const mTasks = sprintTasks.filter((t) => t.assignee_id === m.user_id);
      const mDoneTasks = mTasks.filter((t) => t.status === 'done');
      return {
        name: emailName(m.user?.email),
        role: m.role,
        stories: mStories.length,
        doneStories: mDone.length,
        points: mDone.reduce((a, s) => a + (s.story_points ?? 0), 0),
        tasks: mTasks.length,
        doneTasks: mDoneTasks.length,
      };
    });

    return {
      sprintStories,
      totalPoints,
      donePoints,
      doneStories,
      sprintTasks,
      doneTasks,
      idealPct,
      actualPct,
      byMember,
    };
  }, [selected, stories, tasks, members]);

  if (loading) return <div className="page-center">Loading…</div>;
  if (!project) return <div className="page-center">Project not found.</div>;

  function exportCSV() {
    if (!selected || !report) return;
    const rows: string[][] = [
      ['Sprint Report', selected.name],
      ['Period', `${selected.start_date} to ${selected.end_date}`],
      ['Status', selected.status],
      ['Goal', selected.goal],
      [],
      ['Metric', 'Value'],
      ['Stories', `${report.doneStories.length} / ${report.sprintStories.length} done`],
      ['Story points', `${report.donePoints} / ${report.totalPoints} done (${report.actualPct}%)`],
      ['Tasks', `${report.doneTasks.length} / ${report.sprintTasks.length} done`],
      ['Time elapsed', `${report.idealPct}% of sprint duration`],
      ['Health', report.actualPct >= report.idealPct ? 'On track' : 'Behind schedule'],
      [],
      ['Story', 'Points', 'Status', 'Assignee'],
      ...report.sprintStories.map((s) => [
        s.title,
        String(s.story_points ?? ''),
        s.status,
        members.find((m) => m.user_id === s.assignee_id)?.user?.email ?? 'Unassigned',
      ]),
      [],
      ['Member', 'Role', 'Stories', 'Done', 'Points done', 'Tasks', 'Tasks done'],
      ...report.byMember.map((m) => [
        m.name,
        m.role,
        String(m.stories),
        String(m.doneStories),
        String(m.points),
        String(m.tasks),
        String(m.doneTasks),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprintflow-report-${selected.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Sprint performance at a glance, ready to export for stakeholders.</p>
        </div>
        <div className="header-actions">
          <select
            className="select-inline"
            value={selected?.id ?? ''}
            onChange={(e) => setSprintId(e.target.value)}
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={exportCSV} disabled={!selected}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {!selected || !report ? (
        <div className="empty-state">
          <h2>No sprints to report on</h2>
          <p className="muted">Create a sprint and add stories to generate a report.</p>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <ReportStat label="Stories done" value={`${report.doneStories.length}/${report.sprintStories.length}`} />
            <ReportStat
              label="Points done"
              value={`${report.donePoints}/${report.totalPoints}`}
              sub={`${report.actualPct}% complete`}
            />
            <ReportStat label="Tasks done" value={`${report.doneTasks.length}/${report.sprintTasks.length}`} />
            <ReportStat
              label="Health"
              value={report.actualPct >= report.idealPct ? 'On track' : 'Behind'}
              sub={`${report.actualPct}% done vs ${report.idealPct}% of time`}
              good={report.actualPct >= report.idealPct}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Completed stories</h2>
            </div>
            {report.doneStories.length === 0 ? (
              <p className="muted">No stories completed yet in {selected.name}.</p>
            ) : (
              <ul className="done-list">
                {report.doneStories.map((s) => (
                  <li key={s.id}>
                    <span>{s.title}</span>
                    <span className="pill pill-muted">{s.story_points ?? '—'} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h2>Member contribution</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Stories</th>
                  <th>Done</th>
                  <th>Points done</th>
                  <th>Tasks</th>
                  <th>Tasks done</th>
                </tr>
              </thead>
              <tbody>
                {report.byMember.map((m, i) => (
                  <tr key={i}>
                    <td>{m.name}</td>
                    <td>{m.role}</td>
                    <td>{m.stories}</td>
                    <td>{m.doneStories}</td>
                    <td>{m.points}</td>
                    <td>{m.tasks}</td>
                    <td>{m.doneTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ReportStat({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${good === true ? 'text-good' : good === false ? 'text-warn' : ''}`}>
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}