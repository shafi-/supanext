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

export interface OrganizationSubscription {
  id: string
  organization_id: string
  plan_id: string
  status: 'active' | 'paused' | 'expired' | 'cancelled'
  billing_period: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export interface OrganizationSubscriptionView extends OrganizationSubscription {
  org_name: string
  plan_name: string
  price_monthly: number
  price_yearly: number
}

export interface SubscriptionHistory {
  id: string
  organization_id: string
  plan_id: string
  action: 'subscribed' | 'upgraded' | 'downgraded' | 'expired' | 'renewed' | 'cancelled' | 'paused' | 'payment'
  amount: number
  payment_status: 'paid' | 'pending' | 'failed'
  invoice_number: string | null
  notes: string | null
  created_at: string
}

export interface SubscriptionHistoryView extends SubscriptionHistory {
  org_name: string
  plan_name: string
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
