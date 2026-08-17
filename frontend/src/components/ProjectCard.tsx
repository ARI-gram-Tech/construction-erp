import { Link } from 'react-router-dom'

interface ProjectCardProps {
  id: string
  name: string
  client: string
  progress: number
  budget: string
  status: 'Active' | 'Completed' | 'Starting'
}

const statusStyle: Record<ProjectCardProps['status'], string> = {
  Active: 'bg-status-success/10 text-status-success',
  Starting: 'bg-status-warning/10 text-status-warning',
  Completed: 'bg-steel-100 text-steel-500',
}

export function ProjectCard({ id, name, client, progress, budget, status }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${id}/overview`}
      className="flex flex-col gap-3 rounded-lg border border-steel-100 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-steel-900">{name}</h3>
          <p className="text-xs text-steel-500">Client: {client}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[status]}`}>
          {status}
        </span>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-steel-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-steel-100">
          <div
            className="h-2 rounded-full bg-primary-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-sm">
        <span className="text-steel-500">Budget: </span>
        <span className="font-medium text-steel-900">{budget}</span>
      </div>
    </Link>
  )
}
