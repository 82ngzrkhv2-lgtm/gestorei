export type AccountType = 'personal' | 'business' | 'ads' | 'investment' | 'card' | 'reserve' | 'agency' | 'other'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type CategoryType = 'income' | 'expense' | 'both'
export type AlertType = 'low_balance' | 'over_goal' | 'expense_spike' | 'net_negative'
export type TransactionSource = 'manual' | 'whatsapp' | 'api'
export type GoalType = 'patrimonio' | 'faturamento' | 'economia' | 'investimento' | 'reserva' | 'pessoal' | 'empresarial'
export type GoalStatus = 'in_progress' | 'completed' | 'delayed'

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
  transaction_type: TransactionType
  amount: number
  description: string | null
  date: string
  source: TransactionSource
  transfer_group_id?: string | null
  source_account_id?: string | null
  destination_account_id?: string | null
  created_at: string
  // joins
  account?: Account
  category?: Category
  source_account?: Account
  destination_account?: Account
}

export interface FinancialLimit {
  id: string
  user_id: string
  account_id: string | null
  category_id: string | null
  monthly_limit: number
  current_usage: number
  alert_threshold: number
  created_at: string
  account?: Account
  category?: Category
}

export interface FinancialGoal {
  id: string
  user_id: string
  account_id: string | null
  title: string
  description: string | null
  target_amount: number
  current_amount: number
  goal_type: GoalType
  start_date: string
  end_date: string | null
  status: GoalStatus
  created_at: string
  account?: Account
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

export interface UserPreferences {
  user_id: string
  default_dashboard_view: string
  remember_last_view: boolean
  last_dashboard_view: string | null
  created_at?: string
  updated_at?: string
}


