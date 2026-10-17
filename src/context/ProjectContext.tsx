import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  listMyProjects,
  listSprints,
  listStories,
  listTasks,
  listMembers,
  Project,
  Sprint,
  UserStory,
  Task,
  ProjectMember,
} from '../lib/api';
import { Profile } from '../lib/types';

interface ProjectData {
  project: Project | null;
  sprints: Sprint[];
  stories: UserStory[];
  tasks: Task[];
  members: ProjectMember[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ProjectContext = createContext<ProjectData>({
  project: null,
  sprints: [],
  stories: [],
  tasks: [],
  members: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const [proj, sp, st, mem] = await Promise.all([
        listMyProjects().then((ps) => ps.find((p) => p.id === projectId) ?? null),
        listSprints(projectId),
        listStories(projectId),
        listMembers(projectId),
      ]);
      const ts = await listTasks(st.map((s) => s.id));
      setProject(proj);
      setSprints(sp);
      setStories(st);
      setTasks(ts);
      setMembers(mem);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return (
    <ProjectContext.Provider
      value={{ project, sprints, stories, tasks, members, loading, error, refresh }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}

// Exported for tests (SSR smoke test injects fixed data).
export { ProjectContext };

export function useProfiles(members: ProjectMember[]): Map<string, Profile> {
  const [map] = useState(() => new Map<string, Profile>());
  useEffect(() => {
    for (const m of members) {
      if (m.user && !map.has(m.user.id)) {
        map.set(m.user.id, { id: m.user.id, email: m.user.email });
      }
    }
  }, [members, map]);
  return map;
}