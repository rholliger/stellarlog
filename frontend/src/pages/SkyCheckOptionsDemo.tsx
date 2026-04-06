import { useState } from 'react'
import {
  SkyCheckCardCompact,
  SkyCheckMiniForm,
  SkyCheckButtonRow,
  SkyCheckWeatherIntegration,
} from '@/components/SkyCheckIntegration'

export default function SkyCheckOptionsDemo() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const options = [
    {
      id: 'compact',
      name: 'Compact Card',
      description: 'Shows current status with quick actions. Expands contextually based on whether you\'ve checked today.',
      component: <SkyCheckCardCompact />,
      pros: ['Clear status indicator', 'One-tap quick log', 'Shows history link when done'],
      cons: ['Takes more vertical space', 'Might compete with moon/weather cards'],
    },
    {
      id: 'mini',
      name: 'Inline Mini Form',
      description: 'Dashed button that expands into a mini form right on the Tonight page.',
      component: <SkyCheckMiniForm />,
      pros: ['No navigation required', 'Fastest workflow', 'Always visible'],
      cons: ['Adds clutter to Tonight page', 'Limited fields (no temp/wind)'],
    },
    {
      id: 'button',
      name: 'Subtle Button Row',
      description: 'Minimal row that blends into the page. Just a status + action button.',
      component: <SkyCheckButtonRow />,
      pros: ['Very compact', 'Non-intrusive', 'Familiar pattern'],
      cons: ['Less prominent', 'No quick-log option'],
    },
    {
      id: 'weather',
      name: 'Weather Card Integration',
      description: 'Gradient card that feels like part of the weather section.',
      component: <SkyCheckWeatherIntegration />,
      pros: ['Visually distinct', 'Groups with conditions', 'Inviting to click'],
      cons: ['Another card in the grid', 'Could be missed'],
    },
  ]

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-2">Sky Check Integration Options</h1>
      <p className="text-gray-500 mb-6">Four ways to integrate Sky Check into the Tonight page</p>

      <div className="space-y-6">
        {options.map((option) => (
          <div 
            key={option.id}
            className={`border rounded-xl p-4 transition-all ${
              selectedOption === option.id 
                ? 'border-blue-500/50 bg-blue-500/5' 
                : 'border-[hsl(215_15%_18%)] hover:border-[hsl(215_15%_25%)]'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{option.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{option.description}</p>
              </div>
              <button
                onClick={() => setSelectedOption(option.id)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  selectedOption === option.id
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-[hsl(220_15%_14%)] text-gray-400 border border-[hsl(215_15%_22%)] hover:text-gray-300'
                }`}
              >
                {selectedOption === option.id ? 'Selected' : 'Select'}
              </button>
            </div>

            {/* Preview */}
            <div className="bg-[hsl(220_20%_6%)] rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-600 mb-3 uppercase tracking-wide">Preview</p>
              {option.component}
            </div>

            {/* Pros/Cons */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-green-400 font-medium mb-1">Pros</p>
                <ul className="text-gray-500 space-y-0.5">
                  {option.pros.map((pro, i) => (
                    <li key={i}>+ {pro}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-red-400 font-medium mb-1">Cons</p>
                <ul className="text-gray-500 space-y-0.5">
                  {option.cons.map((con, i) => (
                    <li key={i}>− {con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOption && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm text-blue-300">
            Selected: <strong>{options.find(o => o.id === selectedOption)?.name}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            I can implement this into the Tonight page. Want me to proceed?
          </p>
        </div>
      )}
    </div>
  )
}
