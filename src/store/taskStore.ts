import { create } from 'zustand'
import type { Task, Phase } from '@/types'

interface TaskStore {
  tasks: Task[]
  phases: Phase[]
  setTasks: (tasks: Task[]) => void
  setPhases: (phases: Phase[]) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  addTask: (task: Task) => void
  removeTask: (id: string) => void
  upsertTask: (task: Task) => void
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  phases: [],
  setTasks: (tasks) => set({ tasks }),
  setPhases: (phases) => set({ phases }),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
  upsertTask: (task) =>
    set((state) => {
      const exists = state.tasks.some((t) => t.id === task.id)
      if (exists) {
        return { tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) }
      }
      return { tasks: [...state.tasks, task] }
    }),
}))
