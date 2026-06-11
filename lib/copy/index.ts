/**
 * Dicionário de Microcopy Humana do Gestorrei
 * O foco é soar como um assistente calmo, não um banco digital.
 */

export const COPY = {
  dashboard: {
    greeting: (name: string) => `Olá, ${name}.`,
    retention: {
      first_day: 'Vamos registrar sua primeira movimentação.',
      done_today: 'Tudo organizado por hoje.',
      idle_few_days: 'Vamos atualizar seu fluxo?',
      default: 'Seu fluxo está em ordem.'
    },
    balance_title: 'Seu dinheiro hoje',
    expenses_title: 'Pra onde seu dinheiro foi',
    incomes_title: 'Entrou e saiu',
    empty_history: 'Seu fluxo está limpo hoje.',
    empty_subtitle: 'Quando registrar algo, aparece aqui.'
  },
  accounts: {
    empty: 'Crie seu espaço.'
  },
  actions: {
    new_transaction: 'Nova movimentação',
    category: 'Categoria'
  },
  transactions: {
    empty_title: 'Nenhuma movimentação por enquanto.',
    empty_subtitle: 'Seu histórico começa aos poucos.'
  },
  feedback: {
    saved: 'Movimentação salva.',
    organized: 'Organizado.',
    all_clear: 'Tudo certo por aqui.',
    no_pendencies: 'Sem pendências por enquanto.'
  }
}
