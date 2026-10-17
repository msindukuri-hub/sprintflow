export type StoryStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type SprintStatus = 'planned' | 'active' | 'completed';
export type MemberRole = 'owner' | 'member';

export interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  user?: { id: string; email: string } | null;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_at: string;
}

export interface UserStory {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string;
  acceptance_criteria: string;
  story_points: number | null;
  status: StoryStatus;
  assignee_id: string | null;
  reporter_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  story_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
}

export const STORY_STATUSES: { value: StoryStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export const SPRINT_STATUSES: { value: SprintStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function statusLabel(status: string, kind: 'story' | 'task' | 'sprint'): string {
  const list = kind === 'story' ? STORY_STATUSES : kind === 'task' ? TASK_STATUSES : SPRINT_STATUSES;
  return list.find((s) => s.value === status)?.label ?? status;
}

export function emailName(email: string | null | undefined): string {
  if (!email) return 'Unassigned';
  return email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}