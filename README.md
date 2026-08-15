# Sistema de Gestão Comercial e Solicitações de Desconto

Aplicação web corporativa de nível de produção (Production-Ready) para gestão, aprovação e auditoria de **Solicitações de Desconto Comercial**, controle de orçamento mensal (**Budget**) por supervisora e gerente, monitoramento de SLA e liberação gerencial com chave de segurança.

---

## 1. Pilares de Engenharia & Qualidade

### 🛡️ Pilar 1: Conformidade com Regras de Negócio & Cálculos Financeiros
- **Teto Mensal Global:** R$ 900,00 por ciclo mensal (renovação no dia 1º de cada mês).
- **Limites Individuais de Orçamento:**
  - **Débora Rodrigues (Supervisora):** R$ 400,00 / mês.
  - **Marília Farias (Supervisora):** R$ 400,00 / mês.
  - **Heder Santos (Reserva Gerencial):** R$ 100,00 / mês para liberações diretas ou exceções de teto.
- **Modalidades de Desconto:**
  - **Adesão:** Valor cheio fixo e inalterável de **R$ 200,00**. O desconto informado é em R$ (R$ 0,00 a R$ 200,00).
  - **Plano Mensal:** Valor cheio digitável pelo consultor. O desconto informado é em percentual (%) com **bloqueio estrito de teto de 20,0%**.
- **Precisão Financeira (Anti-Floating-Point Bug):** Módulo `src/utils/finance.ts` que converte todas as operações para números inteiros em centavos antes de calcular porcentagens e subtrações, prevenindo problemas do padrão IEEE 754.

---

### 📱 Pilar 2: Responsividade Mobile-First
- **Visualização em Cards Mobile (`< 768px`):** Layout otimizado em cards verticais com todas as informações contextuais (cliente, placa formatada, equipe, valores cheios e com desconto, SLA e ações rápidas).
- **Tabela Corporativa Desktop (`>= 768px`):** Grid corporativo denso de alta performance com ordenação e filtros múltiplos.
- **Acessibilidade Touch:** Áreas clicáveis e botões de ação com altura mínima de 44px (`touch-manipulation`).
- **Cross-Browser:** Compatibilidade total com Google Chrome, Mozilla Firefox, Safari (iOS/macOS), Microsoft Edge e Opera.

---

### 🔒 Pilar 3: Segurança & Resiliência
- **Sanitização de Inputs (Anti-XSS):** Todos os campos de texto (`cliente`, `justificativa`, `motivo`, `parecer`) são tratados por `sanitizeTextInput` antes da persistência.
- **Autenticação Gerencial:** Aprovações e liberações diretas exigem validação de credencial de segurança gerencial do Gerente Heder Santos.
- **Resiliência de Banco de Dados:** Conexão nativa com Supabase via API REST com fallback automático e transparente para `LocalStorage`, mantendo a aplicação funcional mesmo offline ou com instabilidades de rede.

---

## 2. Estrutura de Componentes

```
src/
├── components/
│   ├── discounts/
│   │   ├── ApprovalModal.tsx             # Modal de aprovação com autenticação por senha e parecer
│   │   ├── BudgetPanel.tsx               # Painel fixo de orçamento mensal com barras de progresso
│   │   ├── DiscountBIDashboard.tsx       # Gráficos analíticos de desempenho e conversão
│   │   ├── DiscountRequestForm.tsx       # Formulário de solicitação com validação de placa e teto
│   │   ├── DiscountRequestsTable.tsx     # Tabela Desktop + Cards Mobile com monitoramento de SLA
│   │   ├── ManagerDirectReleaseModal.tsx # Modal de liberação direta da reserva gerencial
│   │   └── RejectionModal.tsx            # Modal de recusa com parecer formal obrigatório
│   ├── DiscountRequestsSection.tsx       # Componente orquestrador da aba de Descontos
│   ├── Header.tsx                        # Cabeçalho global com status da conexão Supabase/Offline
│   └── ...
├── data/
│   └── discountData.ts                   # Constantes de hierarquia, tetos e exportação CSV
├── services/
│   ├── discountService.ts                # Singleton de persistência, cálculo de saldos e CRUD
│   └── supabaseClient.ts                 # Cliente de conexão segura com Supabase
├── utils/
│   ├── finance.ts                        # Cálculos matemáticos precisos em centavos
│   └── security.ts                       # Sanitização XSS e verificação de senha de segurança
└── types.ts                              # Definições de tipos TypeScript
```

---

## 3. Dicionário de Variáveis de Estado e Tipos

### `SolicitacaoDesconto`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único da solicitação |
| `dataHoraSolicitacao` | `string` (ISO) | Carimbo de data e hora do envio |
| `cliente` | `string` | Nome ou Razão Social do cliente (sanitizado) |
| `supervisora` | `string` | Supervisora responsável ('Débora Rodrigues' ou 'Marília Farias') |
| `consultor` | `string` | Nome do consultor de vendas vinculado |
| `placa` | `string` | Placa do veículo validada (Mercosul `ABC1D23` ou Padrão `ABC-1234`) |
| `tipoDesconto` | `'Adesão' \| 'Plano'` | Modalidade do desconto aplicado |
| `valorCheio` | `number` | Valor nominal integral do serviço |
| `descontoInput` | `number` | Valor digitado (R$ na Adesão ou % no Plano) |
| `valorDescontoCalculado`| `number` | Desconto efetivo deduzido do orçamento em R$ |
| `percentualDesconto` | `number` | Porcentagem equivalente de desconto |
| `valorFinal` | `number` | Valor a ser cobrado do cliente após o desconto |
| `justificativa` | `string` | Motivo comercial fornecido pelo consultor |
| `status` | `StatusDesconto` | `'Aguardando Aprovação' \| 'Aprovado' \| 'Negado'` |
| `dataHoraAprovacao` | `string?` (ISO) | Carimbo de data e hora da decisão gerencial |
| `aprovador` | `string?` | Nome do gestor responsável pela decisão |
| `parecer` | `string?` | Parecer formal registrado na decisão |
| `tipoRegistro` | `'Padrao' \| 'LiberacaoGerencial'` | Origem da solicitação |

---

### `BudgetState`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `tetoGeral` | `number` | Teto global (R$ 900,00) |
| `totalUtilizado` | `number` | Total de descontos aprovados no mês corrente |
| `saldoRestanteGeral` | `number` | Saldo global disponível no mês |
| `debora` | `SupervisoraBudget` | Saldo individual da equipe Débora (Teto R$ 400,00) |
| `marilia` | `SupervisoraBudget` | Saldo individual da equipe Marília (Teto R$ 400,00) |
| `reservaGerente` | `number` | Saldo da reserva do Gerente Heder Santos (R$ 100,00) |
| `ciclo` | `BudgetCycleInfo` | Metadados do ciclo mensal e dias até renovação |

---

## 4. Guia de Manutenção e Configuração

### Executar Localmente
```bash
npm install
npm run dev
```

### Variáveis de Ambiente (`.env`)
```env
# Configurações opcionais do Supabase (se ausentes, a aplicação opera em modo LocalStorage seguro)
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### Senha de Segurança Gerencial
A liberação e aprovação de descontos requer a senha do Gerente Heder Santos: `11M0rc3g0@23`.
