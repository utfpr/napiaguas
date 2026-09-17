export interface TeamMember {
  name: string
  affiliation?: string
  period?: string
}

export interface TeamRole {
  label?: string
  members: TeamMember[]
}

export interface TeamGroup {
  id: string
  title: string
  roles: TeamRole[]
}

export const PROJECT_COORDINATION: TeamGroup = {
  id: 'coordenacao',
  title: 'Coordenação do Projeto',
  roles: [
    {
      label: 'Coordenação Geral',
      members: [{ name: 'Profª. Drª. Yara Moretto', affiliation: 'UFPR – Palotina' }],
    },
    {
      label: 'Vice-coordenação',
      members: [{ name: 'Prof. Dr. Sandro Froehner', affiliation: 'UFPR – Curitiba' }],
    },
  ],
}

export const WORKGROUP_TEAMS: TeamGroup[] = [
  {
    id: 'agua-doce',
    title: 'GT Ecossistemas de Água Doce',
    roles: [
      {
        label: 'Coordenação',
        members: [
          { name: 'Profª. Drª. Rosilene Luciana Delariva', affiliation: 'UNIOESTE – Cascavel' },
        ],
      },
      {
        label: 'Pós-doutorandos',
        members: [
          {
            name: 'Drª. Anielly Galego de Oliveira',
            affiliation: 'UNIOESTE – Cascavel',
            period: '2023 – 2025',
          },
          {
            name: 'Dr. César Augusto Crovador Sieffert',
            affiliation: 'UFPR – Palotina',
            period: '2023 – 2024',
          },
          {
            name: 'Dr. José Ricardo Pires Adelino',
            affiliation: 'UFPR – Palotina',
            period: '2023 – 2024',
          },
          {
            name: 'Dr. Leonardo Antunes Pessoa',
            affiliation: 'UFPR – Palotina',
            period: '2024 – 2026',
          },
          {
            name: 'Drª. Louise Cristina Gomes',
            affiliation: 'UNIOESTE – Cascavel',
            period: '2022 – 2023',
          },
          {
            name: 'Drª. Marina Lopes Bueno',
            affiliation: 'UFPR – Palotina',
            period: '2023 – 2025',
          },
          {
            name: 'Drª. Taise Miranda Lopes',
            affiliation: 'UNIOESTE – Cascavel',
            period: '2024 – 2026',
          },
          {
            name: 'Drª. Tássia Juliane Malacarne',
            affiliation: 'UFPR – Palotina',
            period: '2022 – 2023',
          },
        ],
      },
      {
        label: 'Doutorando',
        members: [
          {
            name: 'Leonardo da Silva Tomadon',
            affiliation: 'UFPR – Palotina',
            period: '2022 – 2025',
          },
        ],
      },
    ],
  },
  {
    id: 'litoral',
    title: 'GT Litoral',
    roles: [
      {
        label: 'Coordenação',
        members: [{ name: 'Prof. Dr. Sandro Froehner', affiliation: 'UFPR – Curitiba' }],
      },
      {
        label: 'Pós-doutoranda',
        members: [
          {
            name: 'Drª. Aluana Schleder',
            affiliation: 'UFPR – Curitiba',
            period: '2022 – 2024',
          },
        ],
      },
    ],
  },
  {
    id: 'saude',
    title: 'GT Saúde',
    roles: [
      {
        label: 'Coordenação',
        members: [{ name: 'Profª. Drª. Valéria Ghisloti Iared', affiliation: 'UFPR – Palotina' }],
      },
      {
        label: 'Pós-doutorandos',
        members: [
          {
            name: 'Dr. Bruno Henrique Costa Toledo',
            affiliation: 'UFPR – Palotina',
            period: '2022 – 2024',
          },
          {
            name: 'Drª. Tatiellen Cristina Prudentes',
            affiliation: 'UFPR – Palotina',
            period: '2024 – 2026',
          },
        ],
      },
    ],
  },
  {
    id: 'transportes',
    title: 'GT Infraestrutura de Transportes',
    roles: [
      {
        label: 'Coordenação',
        members: [
          { name: 'Profª. Drª. Cristihane Michiko Passos Okawa', affiliation: 'UEM – Maringá' },
        ],
      },
      {
        label: 'Pós-doutorandas',
        members: [
          {
            name: 'Drª. Deise Molinari',
            affiliation: 'UEM – Maringá',
            period: '2025 – 2026',
          },
          {
            name: 'Drª. Fernanda de Oliveira Tavares',
            affiliation: 'UEM – Maringá',
            period: '2022 – 2025',
          },
        ],
      },
      {
        label: 'Supervisão',
        members: [{ name: 'Prof. Dr. Jesner Sereni Ildefonso', affiliation: 'UEM – Maringá' }],
      },
    ],
  },
]

export const COMPLEMENTARY_TEAMS: TeamGroup[] = [
  {
    id: 'integracao',
    title: 'Integração dos Grupos de Trabalho',
    roles: [
      {
        label: 'Pós-doutoranda',
        members: [
          {
            name: 'Drª. Tatiana Motta Tavares',
            affiliation: 'UFPR – Curitiba',
            period: '2023 – 2025',
          },
        ],
      },
    ],
  },
  {
    id: 'colaborador-institucional',
    title: 'Colaborador na Viabilização Institucional da Plataforma',
    roles: [
      {
        members: [{ name: 'Prof. Dr. Reginaldo Ré', affiliation: 'UTFPR – Campo Mourão' }],
      },
    ],
  },
]
