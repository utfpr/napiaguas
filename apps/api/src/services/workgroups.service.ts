import { Workgroup } from '@napi-aguas/shared'

export class WorkgroupsService {
  async getAllWorkgroups(): Promise<Workgroup[]> {
    return [
      {
        id: 'agua-doce',
        name: 'GT Ecossistemas de Água Doce',
        description: 'Vulnerabilidade de subbacias e ecossistemas aquáticos',
        icon: 'water-drop',
        color: '#0ea5e9',
        geometryType: 'polygon',
        active: true,
      },
      {
        id: 'litoral',
        name: 'GT Zona Costeira e Litoral',
        description: 'Erosão costeira e recursos marinhos',
        icon: 'waves',
        color: '#06b6d4',
        geometryType: 'polygon',
        active: true,
      },
      {
        id: 'saude',
        name: 'GT Saúde',
        description: 'Impactos climáticos na saúde pública',
        icon: 'heart-pulse',
        color: '#ef4444',
        geometryType: 'polygon',
        active: true,
      },
      {
        id: 'transportes',
        name: 'GT Transportes',
        description: 'Vulnerabilidade da infraestrutura viária',
        icon: 'truck',
        color: '#f59e0b',
        geometryType: 'linestring',
        active: true,
      },
    ]
  }
}

export const workgroupsService = new WorkgroupsService()
