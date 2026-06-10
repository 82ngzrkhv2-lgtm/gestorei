export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '4rem 1.5rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Termos de Uso</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Última atualização: Junho de 2026 (v1.0)</p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>1. O que o Gestorei É e NÃO É</h2>
        <p style={{ marginBottom: '1rem' }}>O Gestorei é uma <strong>ferramenta de organização e gestão financeira</strong> focada em trazer clareza para suas receitas e despesas através de automações, limites e painéis informativos.</p>
        <p>O Gestorei <strong>NÃO É</strong> um banco, não é uma corretora de valores, não é uma instituição de pagamento e não presta consultoria de investimentos ou serviços contábeis legais.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>2. Responsabilidade do Usuário</h2>
        <p style={{ marginBottom: '1rem' }}>Todas as decisões financeiras tomadas com base nos insights e dados apresentados pelo Gestorei são de sua exclusiva responsabilidade.</p>
        <p>A precisão dos gráficos, limites e relatórios gerados depende puramente e exclusivamente dos dados que você insere ou conecta à plataforma.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>3. Limitação de Garantias</h2>
        <p style={{ marginBottom: '1rem' }}>O sistema é fornecido "no estado em que se encontra", sem garantias explícitas de geração de lucro, alcance exato de resultados financeiros ou precisão absoluta decorrente de falhas sistêmicas.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>4. Integrações de Terceiros e Automações</h2>
        <p style={{ marginBottom: '1rem' }}>Ao utilizar certas funcionalidades do Gestorei, você interage com integrações de terceiros, como provedores de nuvem (Supabase), gateways de pagamento (Kiwify) e infraestruturas de mensageria (WhatsApp / Evolution API).</p>
        <p>Você compreende e aceita que o sistema poderá evoluir, implementando novas automações, algoritmos de Inteligência Artificial para leitura de extratos ou análises preditivas, e novos mecanismos de notificação que ajudarão na execução do serviço contratado.</p>
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>5. Modificações nestes Termos</h2>
        <p style={{ marginBottom: '1rem' }}>Podemos atualizar estes Termos ocasionalmente. Se ocorrerem mudanças materiais, você será notificado no sistema e será <strong>obrigado a aceitar os novos termos</strong> para continuar utilizando a plataforma.</p>
      </section>

    </div>
  )
}
