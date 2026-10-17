// SSR smoke test: render each page directly with fixed mock data to catch
// runtime errors (bad hooks, undefined access, JSX mistakes) that the
// type-checker can't see.
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let passed = 0, failed = 0;
function ok(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

// ---- Mock data ----
const now = new Date().toISOString();
const project = { id: 'p1', name: 'Mobile App v2', description: 'Test project', owner_id: 'u1', created_at: now };
const sprints = [
  { id: 's1', project_id: 'p1', name: 'Sprint 1', goal: 'Ship login', start_date: '2026-10-12', end_date: '2026-10-25', status: 'active', created_at: now },
];
const stories = [
  { id: 'st1', project_id: 'p1', sprint_id: 's1', title: 'As a user I can sign in', description: 'desc', acceptance_criteria: 'ac', story_points: 5, status: 'in_progress', assignee_id: 'u1', reporter_id: 'u1', position: 0, created_at: now, updated_at: now },
  { id: 'st2', project_id: 'p1', sprint_id: null, title: 'Backlog story', description: '', acceptance_criteria: '', story_points: 3, status: 'backlog', assignee_id: null, reporter_id: 'u1', position: 1, created_at: now, updated_at: now },
];
const tasks = [
  { id: 't1', story_id: 'st1', title: 'Build login API', description: '', status: 'done', assignee_id: 'u1', position: 0, created_at: now, updated_at: now },
  { id: 't2', story_id: 'st1', title: 'Build login UI', description: '', status: 'todo', assignee_id: null, position: 1, created_at: now, updated_at: now },
];
const members = [
  { project_id: 'p1', user_id: 'u1', role: 'owner', joined_at: now, user: { id: 'u1', email: 'alice@example.com' } },
  { project_id: 'p1', user_id: 'u2', role: 'member', joined_at: now, user: { id: 'u2', email: 'bob@example.com' } },
];

const { ProjectContext } = await vite.ssrLoadModule('/src/context/ProjectContext.tsx');
const { AuthProvider } = await vite.ssrLoadModule('/src/context/AuthContext.tsx');
const { default: ProjectsPage } = await vite.ssrLoadModule('/src/pages/ProjectsPage.tsx');
const { default: DashboardPage } = await vite.ssrLoadModule('/src/pages/DashboardPage.tsx');
const { default: BacklogPage } = await vite.ssrLoadModule('/src/pages/BacklogPage.tsx');
const { default: SprintPage } = await vite.ssrLoadModule('/src/pages/SprintPage.tsx');
const { default: BoardPage } = await vite.ssrLoadModule('/src/pages/BoardPage.tsx');
const { default: TeamPage } = await vite.ssrLoadModule('/src/pages/TeamPage.tsx');
const { default: ReportsPage } = await vite.ssrLoadModule('/src/pages/ReportsPage.tsx');
const { default: AuthPage } = await vite.ssrLoadModule('/src/pages/AuthPage.tsx');

const projectCtx = {
  project, sprints, stories, tasks, members,
  loading: false, error: null, refresh: async () => {},
};

function renderPage(component, path, routePath) {
  return renderToString(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          ProjectContext.Provider,
          { value: projectCtx },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: routePath ?? path, element: React.createElement(component) })
          )
        )
      )
    )
  );
}

const pages = [
  [DashboardPage, '/projects/p1', '/projects/:projectId', 'DashboardPage', 'Mobile App v2'],
  [BacklogPage, '/projects/p1/backlog', '/projects/:projectId/backlog', 'BacklogPage', 'Backlog'],
  [SprintPage, '/projects/p1/sprints/s1', '/projects/:projectId/sprints/:sprintId', 'SprintPage', 'Sprint 1'],
  [BoardPage, '/projects/p1/board', '/projects/:projectId/board', 'BoardPage', 'Kanban'],
  [TeamPage, '/projects/p1/team', '/projects/:projectId/team', 'TeamPage', 'Team'],
  [ReportsPage, '/projects/p1/reports', '/projects/:projectId/reports', 'ReportsPage', 'Reports'],
];

for (const [Comp, path, routePath, name, marker] of pages) {
  try {
    const html = renderPage(Comp, path, routePath);
    ok(`${name} renders with data`, html.includes(marker), `html length ${html.length}; expected "${marker}"`);
  } catch (e) {
    ok(`${name} renders with data`, false, e.message);
  }
}

// ProjectsPage fetches in an effect (won't run in SSR) → renders empty state
try {
  const html = renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/'] },
      React.createElement(AuthProvider, null, React.createElement(ProjectsPage)))
  );
  ok('ProjectsPage renders (empty state)', html.includes('No projects yet'), html.slice(0, 150));
} catch (e) {
  ok('ProjectsPage renders (empty state)', false, e.message);
}

// AuthPage in unconfigured mode (stub the auth context to skip async loading)
const { AuthContext } = await vite.ssrLoadModule('/src/context/AuthContext.tsx');
try {
  const html = renderToString(
    React.createElement(
      AuthContext.Provider,
      { value: { user: null, session: null, loading: false, configured: false } },
      React.createElement(AuthPage)
    )
  );
  ok('AuthPage renders (setup state)', html.includes('SprintFlow') && /database not connected/i.test(html), html.slice(0, 150));
} catch (e) {
  ok('AuthPage renders (setup state)', false, e.message);
}

// AuthPage in configured mode (sign-up form)
try {
  const html = renderToString(
    React.createElement(
      AuthContext.Provider,
      { value: { user: null, session: null, loading: false, configured: true } },
      React.createElement(AuthPage)
    )
  );
  ok('AuthPage renders (sign-up form)', /Create your account/.test(html) && /Sign up/.test(html), html.slice(0, 150));
} catch (e) {
  ok('AuthPage renders (sign-up form)', false, e.message);
}

await vite.close();
console.log(`\n========== SSR smoke: ${passed} passed, ${failed} failed ==========`);
process.exit(failed > 0 ? 1 : 0);