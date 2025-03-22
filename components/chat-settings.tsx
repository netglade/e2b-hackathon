import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Label } from './ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { getMcps } from '@/app/actions/publish'
import { LLMModelConfig } from '@/lib/models'
import { useQuery } from '@tanstack/react-query'
import { HammerIcon } from 'lucide-react'

export function ChatSettings({
  apiKeyConfigurable,
  baseURLConfigurable,
  languageModel,
  onLanguageModelChange,
}: {
  apiKeyConfigurable: boolean
  baseURLConfigurable: boolean
  languageModel: LLMModelConfig
  onLanguageModelChange: (model: LLMModelConfig) => void
}) {
  // Fetch tools list using React Query
  const { data: mcps, isLoading } = useQuery({
    queryKey: ['mcps'],
    queryFn: () => getMcps(),
  })

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-6 w-6 rounded-sm"
              >
                <HammerIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Tool settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-56">
        <div className="flex flex-col gap-2 px-3 py-2">
          <Label className="mb-1">Tools</Label>

          {isLoading ? (
            <div className="text-xs text-muted-foreground py-1">
              Loading tools...
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto">
              {mcps?.servers && mcps.servers.length > 0 ? (
                <ul className="space-y-1">
                  {mcps.servers.map((server) => (
                    <li key={server.id} className="text-sm py-1">
                      {server.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground py-1">
                  No tools available
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
