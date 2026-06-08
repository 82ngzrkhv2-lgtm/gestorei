export type AccountType = 'personal' | 'business' | 'ads' | 'investment' | 'card' | 'reserve' | 'agency' | 'other'
export type TransactionType = 'income' | 'expense'
export type CategoryType = 'income' | 'expense' | 'both'
export type AlertType = 'low_balance' | 'over_goal' | 'expense_spike' | 'net_negative'
export type TransactionSource = 'manual' | 'whatsapp' | 'api'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  color: string
  icon: string
  balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  icon: string
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  date: string
  source: TransactionSource
  created_at: string
  // joins
  account?: Account
  category?: Category
}

export interface MonthlyGoal {
  id: string
  user_id: string
  account_id: string | null
  category_id: string | null
  month: string
  target_amount: number
  created_at: string
  account?: Account
  category?: Category
}

export interface Alert {
  id: string
  user_id: string
  account_id: string | null
  type: AlertType
  threshold: number | null
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
  account?: Account
}

export interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netPL: number
}

export interface ActiveAlert {
  type: AlertType
  accountId?: string
  accountName?: string
  message: string
  severity: 'warning' | 'critical'
}
