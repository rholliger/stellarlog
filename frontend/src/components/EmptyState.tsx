import { Telescope, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  type: 'observations' | 'targets' | 'photos'
  action?: {
    label: string
    to: string
  }
}

const config = {
  observations: {
    icon: Telescope,
    title: 'No observations yet',
    description: 'Start logging your astrophotography sessions to build your journal.',
  },
  targets: {
    icon: Telescope,
    title: 'No targets visible',
    description: 'Check back later tonight or look toward the weekend for better viewing conditions.',
  },
  photos: {
    icon: Telescope,
    title: 'No photos yet',
    description: 'Add photos to your observation to preserve your captures.',
  },
}

export function EmptyState({ type, action }: EmptyStateProps) {
  const { icon: Icon, title, description } = config[type]

  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(220_15%_14%)] border border-[hsl(215_15%_22%)] flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{description}</p>
      {action && (
        <Link
          to={action.to}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </Link>
      )}
    </div>
  )
}
