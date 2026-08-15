export interface Todo {
  id: string
  organization_id: string
  title: string
  description: string | null
  completed: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTodoDto {
  title: string
  description?: string
}

export interface UpdateTodoDto {
  title?: string
  description?: string
  completed?: boolean
}
