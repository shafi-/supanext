import { supabaseManager } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { ServiceData, ServiceVoid } from '@/types'

/**
 * Base Repository Class
 * Provides standard CRUD operations and common database functionality
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  protected supabase = supabaseManager

  /**
   * Generic function to call Supabase RPC functions
   */
  protected async callRpc<T = any>(
    functionName: string,
    params?: Record<string, unknown>
  ): ServiceData<T> {
    return this.supabase.rpc<T>(functionName, params)
  }

  /**
   * Handle errors from Supabase operations
   */
  protected handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
    return 'An unknown error occurred'
  }

  /**
   * Check if user is authenticated
   */
  protected async requireAuth(): Promise<string> {
    const userId = await this.supabase.getUserId()
    if (!userId) {
      throw new Error('Authentication required')
    }
    return userId
  }

  /**
   * Get current user ID
   */
  protected async getCurrentUserId(): Promise<string | null> {
    return this.supabase.getUserId()
  }

  /**
   * Check if current user has specific role in organization
   */
  protected async hasRoleInOrganization(
    organizationId: string,
    role: string
  ): Promise<boolean> {
    const userId = await this.getCurrentUserId()
    if (!userId) return false

    const { data } = await this.callRpc<Database['public']['Views']['organization_view']['Row']>(
      'get_user_role',
      {
        check_user_id: userId,
        check_org_id: organizationId,
      }
    )

    // Check if user has the required role or higher
    const roleHierarchy = ['viewer', 'member', 'admin', 'owner']
    const userRoleIndex = roleHierarchy.indexOf(role)
    const currentRoleIndex = roleHierarchy.indexOf(data?.role || 'viewer')

    return currentRoleIndex >= userRoleIndex
  }

  /**
   * Check if current user is admin or owner of organization
   */
  protected async isOrgAdminOrOwner(organizationId: string): Promise<boolean> {
    const { data } = await this.callRpc<boolean>('is_admin_or_owner', {
      check_user_id: await this.getCurrentUserId(),
      check_org_id: organizationId,
    })

    return data || false
  }

  /**
   * Check if current user is member of organization
   */
  protected async isOrgMember(organizationId: string): Promise<boolean> {
    const { data } = await this.callRpc<boolean>('is_member', {
      check_user_id: await this.getCurrentUserId(),
      check_org_id: organizationId,
    })

    return data || false
  }

  /**
   * Create a new record (generic)
   * Note: This should primarily use database functions for security
   */
  protected async create<T>(
    table: string,
    data: Record<string, unknown>
  ): ServiceData<T> {
    try {
      const { data: result, error } = await this.supabase
        .getClient()
        .from(table as any)
        .insert(data as any)
        .select()
        .single()

      if (error) {
        return { data: null, error: this.handleError(error) }
      }

      return { data: result as T, error: null }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }

  /**
   * Read records with optional filters (generic)
   * Note: This should primarily use database functions for security
   */
  protected async find<T>(
    table: string,
    filters?: Record<string, unknown>,
    options?: {
      limit?: number
      offset?: number
      orderBy?: { column: string; ascending?: boolean }
    }
  ): ServiceData<T[]> {
    try {
      let query = this.supabase
        .getClient()
        .from(table as any)
        .select('*')

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        })
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error: this.handleError(error) }
      }

      return { data: data as T[], error: null }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }

  /**
   * Find single record by ID (generic)
   * Note: This should primarily use database functions for security
   */
  protected async findById<T>(
    table: string,
    id: string
  ): ServiceData<T> {
    try {
      const { data, error } = await this.supabase
        .getClient()
        .from(table as any)
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: this.handleError(error) }
      }

      return { data: data as T, error: null }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }

  /**
   * Update a record (generic)
   * Note: This should primarily use database functions for security
   */
  protected async update<T>(
    table: string,
    id: string,
    data: Record<string, unknown>
  ): ServiceData<T> {
    try {
      const { data: result, error } = await this.supabase
        .getClient()
        .from(table as any)
        .update(data as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { data: null, error: this.handleError(error) }
      }

      return { data: result as T, error: null }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }

  /**
   * Delete a record (generic)
   * Note: This should primarily use database functions for security
   */
  protected async delete(table: string, id: string): ServiceVoid {
    try {
      const { error } = await this.supabase
        .getClient()
        .from(table as any)
        .delete()
        .eq('id', id)

      if (error) {
        return { error: this.handleError(error) }
      }

      return { error: null }
    } catch (error) {
      return { error: this.handleError(error) }
    }
  }

  /**
   * Soft delete a record (update with deleted_at timestamp)
   * Note: This should primarily use database functions for security
   */
  protected async softDelete(
    table: string,
    id: string
  ): ServiceVoid {
    try {
      const { error } = await this.supabase
        .getClient()
        .from(table as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id)

      if (error) {
        return { error: this.handleError(error) }
      }

      return { error: null }
    } catch (error) {
      return { error: this.handleError(error) }
    }
  }

  /**
   * Count records with optional filters
   */
  protected async count(
    table: string,
    filters?: Record<string, unknown>
  ): ServiceData<number> {
    try {
      let query = this.supabase
        .getClient()
        .from(table as any)
        .select('*', { count: 'exact', head: true })

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      const { count, error } = await query

      if (error) {
        return { data: null, error: this.handleError(error) }
      }

      return { data: count || 0, error: null }
    } catch (error) {
      return { data: null, error: this.handleError(error) }
    }
  }
}