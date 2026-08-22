# Sistema de Gestão Operacional & Comercial (Diário de Bordo - Supervisão Inside Sales)

**Documentação Técnica Atualizada** • *Última revisão & deploy:* **22/08/2026**

Aplicação web corporativa de nível de produção (Production-Ready) para gestão de ocorrências operacionais, passagens de turno, gestão e auditoria de **Solicitações de Desconto Comercial**, controle rigoroso de orçamento mensal (**Budget**) por supervisora e gerente, monitoramento de SLA e liberação gerencial com chaves de segurança criptografadas.

---

## 1. Atualizações e Melhorias Aplicadas em 22/08/2026

### 🛡️ 1.1. Arquitetura de Segurança Criptográfica Avançada (Anti-Vazamento)
- **Eliminação de Senhas em Texto Puro (Plain Text Free):** Nenhuma credencial permanece gravada em texto puro no código-fonte.
- **Salt Individualizado + Digestão SHA-256:** A validação é realizada mediante hash criptográfico com Salt único contra ataques de dicionário e tabelas Rainbow.
- **Isolamento Rígido de Escopos de Acesso:**
  - **Senha Administrativa de Banco:** `M1kh43l@23` (Exclusiva para Reset e Restauração de Banco de Dados).
  - **Senha Comercial de Aprovação:** `11M0rc3g0@23` (Exclusiva para Aprovação/Reprovação de Descontos e Liberações Gerenciais).
- **Proteção Contra Timing Attacks:** Comparação temporal em tempo constante (`comparacaoTempoConstante`), impedindo vazamento de caracteres por tempo de resposta.
- **Sanitização XSS Aprofundada:** Bloqueio de injeção de HTML/JS malicioso em todos os campos de texto com limite máximo de caracteres (Anti-DoS).

### 📱 1.2. Adaptação Mobile-First com Aparência de App Nativo
- **Navegação Inferior Mobile (Bottom Navigation Bar):** Barra de navegação fixa com efeito de vidro fosco (`backdrop-blur`) e ícones de toque otimizados para smartphones.
- **Suporte a Safe Area Insets:** Compatibilidade total com o notch do iPhone e barras de gestos do Android (`viewport-fit=cover`, `env(safe-area-inset-bottom)`).
- **Acessibilidade Touch:** Áreas clicáveis padronizadas com mínimo de 44px de altura, rolagem horizontal sem barra visível (`no-scrollbar`) e feedback tátil (`active:scale-95`).
- **PWA Ready:** Meta tags para fullscreen, título do app na tela inicial e barra de status translúcida configuradas.

### 💰 1.3. Recalibração Orçamentária Mensal (Budget)
- **Teto da Supervisão (Débora Rodrigues):** Atualizado para **R$ 700,00 / mês**.
- **Reserva do Gerente (Heder Santos):** Atualizada para **R$ 200,00 / mês** (liberações gerenciais diretas).
- **Teto Consolidado do Departamento:** Mantido em **R$ 900,00 / mês** (R$ 700,00 + R$ 200,00).

---

## 2. Pilares de Engenharia & Qualidade

### 🛡️ Pilar 1: Conformidade com Regras de Negócio & Cálculos Financeiros
- **Ciclo Mensal:** Renovação automática no dia 1º de cada mês com contagem regressiva de dias.
- **Modalidades de Desconto:**
  - **Adesão:** Valor cheio fixo de **R$ 200,00**. Desconto informado em R$ (R$ 0,00 a R$ 200,00).
  - **Plano Mensal:** Valor cheio digitável. Desconto informado em percentual com **trava estrita de teto de 20,0%**.
- **Precisão Financeira:** Módulo `src/utils/finance.ts` que opera internamente em centavos inteiros antes das divisões e subtrações, eliminando imprecisões do padrão IEEE 754.

### 📱 Pilar 2: Responsividade e Experiência do Usuário
- **Visualização Adaptativa:** Cards verticais dinâmicos em telas menores (< 768px) e Data Table corporativa densa em telas maiores (>= 768px).
- **Exportação Inteligente:** Botão de exportação contextual no cabeçalho (exporta Descontos, Ocorrências ou Fechamentos conforme a aba ativa).

### 🔒 Pilar 3: Resiliência de Dados & Conexão
- **Persistência Híbrida Supabase + Cache Local:** Conexão nativa com PostgreSQL Supabase com fallback transparente para `LocalStorage`.
- **Backup Automático Pré-Reset:** Toda operação administrativa de zeramento gera um backup de segurança instantâneo antes da limpeza.

---

## 3. Estrutura dos Módulos Principais

```
src/
├── components/
│   ├── discounts/
│   │   ├── ApprovalModal.tsx             # Modal de aprovação com validação criptográfica SHA-256
│   │   ├── BudgetPanel.tsx               # Painel orçamentário (Débora R$ 700, Gerente R$ 200)
│   │   ├── DiscountBIDashboard.tsx       # Gráficos analíticos e indicadores de conversão
│   │   ├── DiscountRequestForm.tsx       # Formulário com validação de placa Mercosul e teto
│   │   ├── DiscountRequestsTable.tsx     # Tabela Desktop e Cards Mobile com SLA
│   │   ├── ManagerDirectReleaseModal.tsx # Modal de liberação direta da reserva gerencial
│   │   └── RejectionModal.tsx            # Modal de recusa com parecer obrigatório
│   ├── DiscountRequestsSection.tsx       # Orquestrador da aba de Descontos
│   ├── OccurrenceForm.tsx                # Formulário de Ocorrências com sanitização XSS
│   ├── OccurrenceHistory.tsx             # Histórico e gestão de status de ocorrências
│   ├── ShiftPassoverSection.tsx          # Passagem de bastão e pendências de turno
│   ├── DatabaseErrorModal.tsx            # Diagnóstico, backup e reset seguro do banco
│   └── Header.tsx                        # Cabeçalho corporativo com status e abas
├── data/
│   ├── discountData.ts                   # Constantes de equipes, tetos (R$ 700/R$ 200) e CSV
│   └── mockData.ts                       # Registros iniciais e categorias
├── services/
│   ├── dbService.ts                      # Operações de Ocorrências, Passagens e Diagnóstico
│   └── discountService.ts                # Operações de Desconto, cálculo de saldos e cotas
├── utils/
│   ├── finance.ts                        # Operações financeiras de alta precisão em centavos
│   ├── security.ts                       # Hashes SHA-256, Salts criptográficos e Sanitização XSS
│   ├── statisticalAnalysis.ts            # Cálculo de Z-Score e anomalias de ocorrências
│   └── discountAnalytics.ts              # Indicadores estatísticos de desconto
└── types.ts                              # Tipos TypeScript
```

---

## 4. Dicionário de Tipos Principais

### `SolicitacaoDesconto`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único da solicitação |
| `dataHoraSolicitacao` | `string` (ISO) | Carimbo de data e hora do envio |
| `cliente` | `string` | Nome ou Razão Social do cliente (sanitizado) |
| `supervisora` | `string` | Supervisora responsável ('Débora Rodrigues') |
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

## 5. Configuração e Manutenção

### Executar Localmente
```bash
npm install
npm run dev
```

### Variáveis de Ambiente (`.env.example`)
```env
# Configurações opcionais do Supabase (opera com fallback em cache local se ausente)
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### Autorização e Perfis
- **Aprovação de Descontos / Liberação Direta:** Senha do Gerente Heder Santos.
- **Manutenção e Reset do Banco de Dados:** Senha Administrativa de Segurança.
