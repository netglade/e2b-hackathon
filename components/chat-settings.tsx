import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
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
import { getMcps, removeMcp, addMcp } from '@/app/actions/publish'
import { LLMModelConfig } from '@/lib/models'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  const [selectedTool, setSelectedTool] = useState<{ id: string, name: string } | null>(null)
  const [newToolName, setNewToolName] = useState('')
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
    }
  })

  // Add tool mutation
  const addMutation = useMutation({
    mutationFn: addMcp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] })
      setNewToolName('')
      setIsOpen(false)
    }
  })

  const handleOpenTool = (tool: { id: string, name: string }) => {
    setSelectedTool(tool)
    setIsOpen(true)
  }

  const handleCreateNew = () => {
    setSelectedTool(null)
    setNewToolName('')
    setIsOpen(true)
  }

  const handleDeleteTool = () => {
    if (selectedTool) {
      removeMutation.mutate(selectedTool.id)
    }
  }

  const handleAddTool = (e: React.FormEvent) => {
    e.preventDefault()
    if (newToolName.trim()) {
      addMutation.mutate(newToolName)
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
                <DialogTitle>Tool: {selectedTool.name}</DialogTitle>
                <DialogDescription>
                  View or delete this tool.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label>Tool ID</Label>
                <Input 
                  value={selectedTool.id} 
                  readOnly 
                  className="mt-1 bg-muted"
                />
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
                <div className="py-4">
                  <Label htmlFor="toolName">Tool Name</Label>
                  <Input 
                    id="toolName"
                    value={newToolName}
                    onChange={(e) => setNewToolName(e.target.value)}
                    placeholder="Enter tool name"
                    className="mt-1"
                  />
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={!newToolName.trim() || addMutation.isPending}
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