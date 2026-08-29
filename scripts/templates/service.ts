import { BaseRepository } from '@/repositories/BaseRepository'
import type { ServiceData } from '@/types'
import type { PaginationParams } from '@/types/pagination'
import { Rpc } from '@/types/rpc'
import type { {{PASCAL}} } from '@/types/{{SNAKE}}'

export class {{PASCAL}}Service extends BaseRepository {
  async list(params?: PaginationParams): ServiceData<{{PASCAL}}[]> {
    return this.callRpc<{{PASCAL}}[]>(Rpc.{{PASCAL}}.List, {
      p_limit: params?.limit ?? 20,
      p_cursor: params?.cursor,
    })
  }

  async create(input: { name: string; description?: string }): ServiceData<string> {
    return this.callRpc<string>(Rpc.{{PASCAL}}.Create, {
      p_name: input.name,
      p_description: input.description,
    })
  }

  async update(
    id: string,
    patch: { name?: string; description?: string }
  ): ServiceData<void> {
    return this.callRpc<void>(Rpc.{{PASCAL}}.Update, {
      p_{{SNAKE}}_id: id,
      p_name: patch.name,
      p_description: patch.description,
    })
  }

  async delete(id: string): ServiceData<void> {
    return this.callRpc<void>(Rpc.{{PASCAL}}.Delete, { p_{{SNAKE}}_id: id })
  }
}

export const {{SNAKE}}Service = new {{PASCAL}}Service()
