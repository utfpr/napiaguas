import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
} from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { IndicatorNode } from '@/types/indicators'

interface IndicatorTreeNodeProps {
  node: IndicatorNode
  selectedId: string | null
  onSelect: (id: string) => void
  level?: number
}

const LEVEL_PADDING_CLASSES = ['pl-2', 'pl-6', 'pl-10', 'pl-14', 'pl-16']

function hasDescendant(node: IndicatorNode, targetId: string | null): boolean {
  if (!targetId) {
    return false
  }

  if (node.id === targetId) {
    return true
  }

  return node.children.some((child) => hasDescendant(child, targetId))
}

export function IndicatorTreeNode({
  node,
  selectedId,
  onSelect,
  level = 0,
}: IndicatorTreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false)

  const [expanded, setExpanded] = useState<boolean>(() => {
    if (!hasChildren) {
      return false
    }

    // Nível 0 (Índice principal) sempre inicia expandido
    if (level === 0) {
      return true
    }

    return false
  })

  useEffect(() => {
    if (hasChildren && hasDescendant(node, selectedId) && !expanded && !manuallyCollapsed) {
      setExpanded(true)
    }
  }, [expanded, hasChildren, node, selectedId, manuallyCollapsed])

  const paddingClass = useMemo(() => {
    if (level < LEVEL_PADDING_CLASSES.length) {
      return LEVEL_PADDING_CLASSES[level]
    }

    return LEVEL_PADDING_CLASSES[LEVEL_PADDING_CLASSES.length - 1]
  }, [level])

  const ToggleIcon = hasChildren ? (expanded ? ChevronDownIcon : ChevronRightIcon) : null
  const NodeIcon = node.type === 'indicator' ? FileIcon : FolderIcon

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={isSelected}
      data-selected={isSelected ? 'true' : undefined}
    >
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isSelected ? 'outline' : 'ghost'}
            className={cn(
              'flex w-full items-center justify-start gap-2 text-sm',
              'focus-visible:ring-1 focus-visible:ring-neutral-500',
              paddingClass,
            )}
            onClick={() => {
              if (hasChildren) {
                setExpanded((previous) => {
                  const newExpanded = !previous
                  if (!newExpanded) {
                    setManuallyCollapsed(true)
                  } else {
                    setManuallyCollapsed(false)
                  }
                  return newExpanded
                })
              }
              // Todos os indicadores são selecionáveis (incluindo índices com filhos)
              onSelect(node.id)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' && hasChildren && !expanded) {
                event.preventDefault()
                setExpanded(true)
                setManuallyCollapsed(false)
              }
              if (event.key === 'ArrowLeft' && hasChildren && expanded) {
                event.preventDefault()
                setExpanded(false)
                setManuallyCollapsed(true)
              }
            }}
          >
            {ToggleIcon ? <ToggleIcon className="h-4 w-4 shrink-0 text-neutral-500" /> : null}
            <NodeIcon className="h-4 w-4 shrink-0 text-neutral-400" />
            <span className="flex-1 truncate text-left">{node.name}</span>
            {node.unit ? (
              <span className="text-xs font-medium text-neutral-400">{node.unit}</span>
            ) : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="max-w-xs">
          <p className="font-medium">{node.name}</p>
          {node.unit && <p className="text-xs text-neutral-300 mt-1">{node.unit}</p>}
        </TooltipContent>
      </Tooltip>

      {hasChildren && expanded ? (
        <div role="group" className="ml-2 border-l border-neutral-200 pl-1">
          {node.children.map((child) => (
            <IndicatorTreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
