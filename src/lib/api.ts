import { supabase } from './supabase';
import type {
  Project,
  ProjectMember,
  Sprint,
  UserStory,
  Task,
  Profile,
} from './types';

export type { Project, ProjectMember, Sprint, UserStory, Task, Profile } from './types';

function db() {
  if (!supabase) throw new Error('Database is not configured');
  return supabase;
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function checkError(error: unknown, what: string): void {
  if (error) throw new ApiError(`${what} failed: ${(error as { message?: string }).message ?? error}`);
}

// ---------- Projects ----------

export async function listMyProjects(): Promise<Project[]> {
  const { data, error } = await db()
    .from('projects')
    .select('id, name, description, owner_id, created_at')
    .order('created_at', { ascending: false });
  checkError(error, 'Loading projects');
  return (data ?? []) as Project[];
}

export async function createProject(name: string, description: string, ownerId: string): Promise<Project> {
  const { data, error } = await db()
    .from('projects')
    .insert({ name, description, owner_id: ownerId })
    .select()
    .single();
  checkError(error, 'Creating project');
  const memberErr = await db()
    .from('project_members')
    .insert({ project_id: (data as Project).id, user_id: ownerId, role: 'owner' });
  checkError(memberErr.error, 'Adding you as project owner');
  return data as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await db().from('projects').delete().eq('id', projectId);
  checkError(error, 'Deleting project');
}

export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await db()
    .from('project_members')
    .select('project_id, user_id, role, joined_at')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });
  checkError(error, 'Loading team members');
  const rows = (data ?? []) as Omit<ProjectMember, 'user'>[];

  // Fetch the emails for all member user ids in one query, then merge.
  const userIds = rows.map((r) => r.user_id);
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users, error: uErr } = await db()
      .from('auth_users_view')
      .select('id, email')
      .in('id', userIds);
    if (!uErr && users) {
      for (const u of users as { id: string; email: string }[]) {
        emails.set(u.id, u.email);
      }
    }
  }
  return rows.map((r) => ({
    ...r,
    user: emails.has(r.user_id) ? { id: r.user_id, email: emails.get(r.user_id)! } : null,
  }));
}

export async function addMember(projectId: string, email: string, role: 'owner' | 'member'): Promise<void> {
  // Find the user by email (works when the user has signed up before)
  const { data: users, error: uErr } = await db()
    .from('auth_users_view')
    .select('id')
    .ilike('email', email);
  if (uErr) {
    // Fallback: try direct lookup via RPC-free approach — the view may not exist.
    throw new ApiError(`Could not look up ${email}. They must sign up to SprintFlow first.`);
  }
  if (!users || users.length === 0) {
    throw new ApiError(`${email} has no SprintFlow account yet. Ask them to sign up, then add them again.`);
  }
  const { error } = await db()
    .from('project_members')
    .insert({ project_id: projectId, user_id: users[0].id, role });
  checkError(error, 'Adding member');
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await db()
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  checkError(error, 'Removing member');
}

// ---------- Sprints ----------

export async function listSprints(projectId: string): Promise<Sprint[]> {
  const { data, error } = await db()
    .from('sprints')
    .select('*')
    .eq('project_id', projectId)
    .order('start_date', { ascending: true });
  checkError(error, 'Loading sprints');
  return (data ?? []) as Sprint[];
}

export async function createSprint(input: {
  project_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: string;
}): Promise<Sprint> {
  const { data, error } = await db().from('sprints').insert(input).select().single();
  checkError(error, 'Creating sprint');
  return data as Sprint;
}

export async function updateSprint(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from('sprints').update(patch).eq('id', id);
  checkError(error, 'Updating sprint');
}

export async function deleteSprint(id: string): Promise<void> {
  const { error } = await db().from('sprints').delete().eq('id', id);
  checkError(error, 'Deleting sprint');
}

// ---------- User stories ----------

export async function listStories(projectId: string): Promise<UserStory[]> {
  const { data, error } = await db()
    .from('user_stories')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  checkError(error, 'Loading user stories');
  return (data ?? []) as UserStory[];
}

export async function createStory(input: {
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string;
  acceptance_criteria: string;
  story_points: number | null;
  status: string;
  assignee_id: string | null;
  reporter_id: string;
  position: number;
}): Promise<UserStory> {
  const { data, error } = await db().from('user_stories').insert(input).select().single();
  checkError(error, 'Creating user story');
  return data as UserStory;
}

export async function updateStory(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from('user_stories').update(patch).eq('id', id);
  checkError(error, 'Updating user story');
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await db().from('user_stories').delete().eq('id', id);
  checkError(error, 'Deleting user story');
}

// ---------- Tasks ----------

export async function listTasks(storyIds: string[]): Promise<Task[]> {
  if (storyIds.length === 0) return [];
  const { data, error } = await db()
    .from('tasks')
    .select('*')
    .in('story_id', storyIds)
    .order('position', { ascending: true });
  checkError(error, 'Loading tasks');
  return (data ?? []) as Task[];
}

export async function createTask(input: {
  story_id: string;
  title: string;
  description: string;
  status: string;
  assignee_id: string | null;
  position: number;
}): Promise<Task> {
  const { data, error } = await db().from('tasks').insert(input).select().single();
  checkError(error, 'Creating task');
  return data as Task;
}

export async function updateTask(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from('tasks').update(patch).eq('id', id);
  checkError(error, 'Updating task');
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db().from('tasks').delete().eq('id', id);
  checkError(error, 'Deleting task');
}

// ---------- Profiles (email lookup for member invites) ----------

export async function lookupUserByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await db()
    .from('auth_users_view')
    .select('id, email')
    .ilike('email', email);
  if (error) return null;
  return (data && data[0]) as Profile | null;
}