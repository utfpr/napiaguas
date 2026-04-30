import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ChevronRightIcon } from '@/components/ui/icons'
import { useIndicators } from '@/hooks/useIndicators'
import { useAppStore } from '@/stores/useAppStore'
import type { IndicatorNode } from '@/types/indicators'

interface IndicatorBreadcrumbProps {
  workgroupId: string
}

const WORKGROUP_CONFIG = {
  'agua-doce': {
    label: 'Água Doce',
    route: '/agua-doce',
  },
  saude: {
    label: 'Saúde',
    route: '/saude',
  },
  litoral: {
    label: 'Litoral',
    route: '/litoral',
  },
  transportes: {
    label: 'Transportes',
    route: '/transportes',
  },
} as const

export function IndicatorBreadcrumb({ workgroupId }: IndicatorBreadcrumbProps) {
  const selectedIndicatorId = useAppStore(
    (state) => state.selectedIndicatorIdByWorkgroup[workgroupId] ?? null,
  )
  const { data: indicators } = useIndicators(workgroupId)

  const path = useMemo(() => {
    if (!selectedIndicatorId || !indicators) {
      return []
    }

    return buildPathToIndicator(indicators, selectedIndicatorId)
  }, [indicators, selectedIndicatorId])

  const config = WORKGROUP_CONFIG[workgroupId as keyof typeof WORKGROUP_CONFIG] ?? {
    label: workgroupId,
    route: `/${workgroupId}`,
  }

  if (!path.length) {
    return null
  }

  return (
    <div className="border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={config.route} replace>
                {config.label}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {path.map((node, index) => {
            const isLast = index === path.length - 1
            return (
              <Fragment key={node.id}>
                <BreadcrumbSeparator>
                  <ChevronRightIcon className="h-4 w-4 text-neutral-400" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{node.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={`${config.route}?indicator=${node.id}`} replace>
                        {node.name}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}

export function buildPathToIndicator(tree: IndicatorNode[], targetId: string): IndicatorNode[] {
  const path: IndicatorNode[] = []

  function search(nodes: IndicatorNode[], currentPath: IndicatorNode[]): boolean {
    for (const node of nodes) {
      const nextPath = [...currentPath, node]

      if (node.id === targetId) {
        path.push(...nextPath)
        return true
      }

      if (node.children.length > 0 && search(node.children, nextPath)) {
        return true
      }
    }
    return false
  }

  search(tree, [])
  return path
}
