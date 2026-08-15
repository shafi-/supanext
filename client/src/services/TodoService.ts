import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData, Todo } from '@/types'
import { Rpc } from '@/types/rpc'

export class TodoService extends BaseRepository {
  async createTodo(orgId: string, title: string, description?: string): ServiceData<Todo> {
    return this.callRpc<Todo>(Rpc.Todo.Create, {
      p_organization_id: orgId,
      p_title: title,
      p_description: description || null,
    })
  }

  async getTodos(orgId: string): ServiceData<Todo[]> {
    return this.callRpc<Todo[]>(Rpc.Todo.GetMany, {
      p_organization_id: orgId,
    })
  }

  async updateTodo(
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean }
  ): ServiceData<Todo> {
    return this.callRpc<Todo>(Rpc.Todo.Update, {
      p_todo_id: todoId,
      p_title: data.title,
      p_description: data.description,
      p_completed: data.completed,
    })
  }

  async deleteTodo(todoId: string): ServiceData<boolean> {
    return this.callRpc<boolean>(Rpc.Todo.Delete, {
      p_todo_id: todoId,
    })
  }
}

export const todoService = new TodoService()
