export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: 'active' | 'paused' | 'expired' | 'canceled'
  billing_period: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export interface UserSubscriptionView extends UserSubscription {
  user_email: string
  user_display_name: string | null
  plan_name: string
  price_monthly: number
  price_yearly: number
}

export interface CurrentSubscription {
  id: string
  plan_id: string
  plan_name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  features: string[]
  status: string
  billing_period: string
  current_period_start: string
  current_period_end: string
}

export interface CreatePlanDto {
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: string[]
}

export interface UpdatePlanDto {
  name?: string
  description?: string
  price_monthly?: number
  price_yearly?: number
  features?: string[]
  is_active?: boolean
}

export interface SubscribeDto {
  plan_id: string
  billing_period: 'monthly' | 'yearly'
}
