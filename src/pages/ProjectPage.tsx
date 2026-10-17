import { Outlet } from 'react-router-dom';
import { ProjectProvider } from '../context/ProjectContext';

export default function ProjectPage() {
  return (
    <ProjectProvider>
      <Outlet />
    </ProjectProvider>
  );
}