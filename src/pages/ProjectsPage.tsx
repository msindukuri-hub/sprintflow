import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listMyProjects, createProject, deleteProject, Project } from '../lib/api';
import { Modal } from '../components/Modal';

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setProjects(await listMyProjects());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  load();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const p = await createProject(name.trim(), description.trim(), user.id);
      setShowCreate(false);
      setName('');
      setDescription('');
      navigate(`/projects/${p.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Delete project "${p.name}" and all of its sprints, stories, and tasks?`)) return;
    try {
      await deleteProject(p.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Your projects</h1>
          <p className="muted">Each project has its own backlog, sprints, and team.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New project
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◧</div>
          <h2>No projects yet</h2>
          <p className="muted">Create your first project to start planning sprints.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            Create a project
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {projects.map((p) => (
            <div key={p.id} className="card project-card" onClick={() => navigate(`/projects/${p.id}`)}>
              <div className="project-card-head">
                <h3>{p.name}</h3>
                <button
                  className="btn-icon"
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p);
                  }}
                >
                  ✕
                </button>
              </div>
              <p className="muted small">{p.description || 'No description'}</p>
              <div className="project-card-meta">
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New project">
        <form onSubmit={submit}>
          <label>
            Project name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App v2"
              required
              autoFocus
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}