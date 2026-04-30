import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  selectedWorkgroup: string | null
  selectedIndicatorIdByWorkgroup: Record<string, string | null>
  theme: 'light' | 'dark'
  isLoading: boolean
  setSelectedWorkgroup: (wg: string | null) => void
  setSelectedIndicator: (workgroupId: string, indicatorId: string | null) => void
  toggleTheme: () => void
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedWorkgroup: null,
      selectedIndicatorIdByWorkgroup: {},
      theme: 'light',
      isLoading: false,
      setSelectedWorkgroup: (wg) => set({ selectedWorkgroup: wg }),
      setSelectedIndicator: (workgroupId, indicatorId) =>
        set((state) => {
          const current = state.selectedIndicatorIdByWorkgroup[workgroupId] ?? null
          if (current === indicatorId) {
            return state
          }
          return {
            selectedIndicatorIdByWorkgroup: {
              ...state.selectedIndicatorIdByWorkgroup,
              [workgroupId]: indicatorId,
            },
          }
        }),
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'napi-aguas-storage',
      partialize: (state) => ({
        selectedWorkgroup: state.selectedWorkgroup,
        selectedIndicatorIdByWorkgroup: state.selectedIndicatorIdByWorkgroup,
        theme: state.theme,
      }),
    }
  )
)
