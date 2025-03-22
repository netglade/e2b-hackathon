import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { addMcp, getMcps, removeMcp } from '@/app/actions/publish'
import { LLMModelConfig } from '@/lib/models'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HammerIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'

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
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState<McpServer | null>(null)
  const [newToolName, setNewToolName] = useState('')
  const [newToolCommand, setNewToolCommand] = useState('')
  const [newToolApiKey, setNewToolApiKey] = useState<string | undefined>(
    undefined,
  )
  const queryClient = useQueryClient()

  // Fetch tools list using React Query
  const { data: mcps, isLoading } = useQuery({
    queryKey: ['mcps'],
    queryFn: () => getMcps(),
  })

  // Remove tool mutation
  const removeMutation = useMutation({
    mutationFn: removeMcp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] })
      setIsOpen(false)
      setSelectedTool(null)
    },
  })

  // Add tool mutation
  const addMutation = useMutation({
    mutationFn: addMcp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] })
      setNewToolName('')
      setIsOpen(false)
    },
  })

  const handleOpenTool = (tool: McpServer) => {
    setSelectedTool(tool)
    setIsOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedTool(null)
    setNewToolName('')
    setNewToolCommand('')
    setNewToolApiKey(undefined)
    setIsOpen(true)
  }

  const handleDeleteTool = () => {
    if (selectedTool) {
      removeMutation.mutate(selectedTool.id)
    }
  }

  const handleAddTool = (e: React.FormEvent) => {
    e.preventDefault()
    if (newToolName.trim() && newToolCommand.trim()) {
      // Note: Update your addMcp function to accept these new parameters
      addMutation.mutate({
        name: newToolName,
        command: newToolCommand,
        apiKey: newToolApiKey,
      })
    }
  }

  return (
    <>
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
            <div className="flex justify-between items-center">
              <Label className="mb-1">Tools</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCreateNew}
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Create
              </Button>
            </div>

            {isLoading ? (
              <div className="text-xs text-muted-foreground py-1">
                Loading tools...
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto">
                {mcps?.servers && mcps.servers.length > 0 ? (
                  <ul className="space-y-1">
                    {mcps.servers.map((server) => (
                      <li
                        key={server.id}
                        className="text-sm py-1 px-1 rounded cursor-pointer hover:bg-accent"
                        onClick={() => handleOpenTool(server)}
                      >
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

      {/* Tool Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          {selectedTool ? (
            // Edit/View Tool Dialog
            <>
              <DialogHeader>
                <DialogTitle>{selectedTool.name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label>Command</Label>
                  <Input
                    value={selectedTool.command}
                    readOnly
                    className="mt-1 bg-muted"
                  />
                </div>

                <div>
                  <Label>API Key</Label>
                  <Input
                    value={selectedTool.apiKey || 'Not set'}
                    readOnly
                    className="mt-1 bg-muted"
                    type="password"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleDeleteTool}
                  disabled={removeMutation.isPending}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Tool
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : (
            // Create New Tool Dialog
            <>
              <DialogHeader>
                <DialogTitle>Create New Tool</DialogTitle>
                <DialogDescription>
                  Add a new tool to your collection.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddTool}>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="toolName">Tool Name</Label>
                    <Input
                      id="toolName"
                      value={newToolName}
                      onChange={(e) => setNewToolName(e.target.value)}
                      placeholder="Enter tool name"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="toolCommand">Command</Label>
                    <Input
                      id="toolCommand"
                      value={newToolCommand}
                      onChange={(e) => setNewToolCommand(e.target.value)}
                      placeholder="Enter tool command"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="toolApiKey">API Key (Optional)</Label>
                    <Input
                      id="toolApiKey"
                      value={newToolApiKey || ''}
                      onChange={(e) =>
                        setNewToolApiKey(e.target.value || undefined)
                      }
                      placeholder="Enter API key if needed"
                      className="mt-1"
                      type="password"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={
                      !newToolName.trim() ||
                      !newToolCommand.trim() ||
                      addMutation.isPending
                    }
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Tool
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
