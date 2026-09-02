# Sistema de Gestão Operacional & Comercial (Diário de Bordo - Supervisão Inside Sales)

**Documentação Técnica Atualizada** • *Última revisão & deploy:* **02/09/2026**

Aplicação web corporativa de nível de produção (*Production-Ready*) para gestão de ocorrências operacionais, passagens de turno, gestão e auditoria de **Solicitações de Desconto Comercial**, controle de orçamento mensal (**Budget**) por supervisora e gerência, além do novo módulo operacional de **Solicitações de Vistoria Veicular e Controle de Campo (Vistoriadores Danilo & Lucas)**, monitoramento de SLA, validação estatística de anomalias (Z-Score) e liberação com chaves de segurança criptografadas.

---

## 1. Atualizações e Novas Funcionalidades (Revisão 02/09/2026)

### 🚗 1.1. Novo Módulo: Solicitações de Vistoria Veicular & Operação de Campo
- **Designação de Vistoriadores de Campo:** Roteamento de vistorias entre os vistoriadores credenciados (**Danilo** e **Lucas**).
- **Validação Rigorosa de Placas Automotivas:** Algoritmo integrado em tempo real para identificação e validação de formatos:
  - Padrão Mercosul (`ABC1D23` / `BRA2E19`)
  - Padrão Tradicional (`ABC-1234`)
- **Controle Financeiro de Taxa de Adesão:**
  - Definição do valor acordado em reais (R$).
  - Alternância de status de recebimento com um toque: **"Adesão Já Paga"** vs. **"A Receber pelo Vistoriador"** em campo.
  - Painéis com totalizador financeiro em tempo real (*Valor Total*, *Recebido em Conta* e *A Receber em Campo*).
- **Integração de Hiperlinks Externos e Geolocalização:**
  - Link de localização do Google Maps com atalho direto para GPS.
  - Campo dedicado para *LINK VISTORIA* (Laudos gerados por sistemas externos).
  - Campo dedicado para *LINK PAGAMENTO* (Faturas e links de checkout).
- **Fluxo de Decisão Técnica e Parecer:**
  - Emissão de Laudo de Aprovação com parecer técnico circunstanciado.
  - Registro formal de Reprovação por não-conformidade veicular.
  - Histórico completo com data, horário, responsável e parecer emitido.

### 📱 1.2. Ergonomia Mobile-First & Cards Operacionais Touch-First
- **Substituição de Tabelas por Cards Verticais em Dispositivos Móveis (`< md`):** Eliminação de scrolls horizontais complexos no celular; os vistoriadores e líderes visualizam fichas verticais estruturadas com badges de alta legibilidade.
- **Ações Rápidas com Touch Targets Padronizados (44px+):**
  - Botão de discagem telefônica direta (`tel:+55...`).
  - Botão de contato direto via **WhatsApp (`wa.me`)** com mensagem contextual pré-formatada contendo os dados do associado e do veículo.
  - Atalho de navegação GPS via Google Maps com abertura segura.
- **Navegação Inferior Mobile Integrada:** Barra inferior com efeito de vidro fosco (*backdrop-blur*) contendo acesso direto às 5 seções do sistema: **Ocorrências**, **Descontos**, **Vistorias**, **BI & Métricas** e **Turno**.

### 🛡️ 1.3. Blindagem de Segurança & Prevenção de Injeções
- **Higienização de Hiperlinks (`sanitizeSafeUrl`):** Bloqueio estrito contra injeções de protocolos perigosos (`javascript:`, `data:`, `vbscript:`, `file:`), garantindo que apenas URLs legítimas com protocolo `http://` ou `https://` sejam abertas, sempre com `rel="noopener noreferrer"`.
- **Prevenção de XSS e Anti-DoS (`sanitizeTextInput`):** Limpeza e truncamento de strings em todos os formulários antes da gravação no banco de dados.
- **Autenticação Criptográfica com Salt e SHA-256:** Operações críticas e logins protegidos por hash criptográfico unidirecional com tempo de comparação constante (`timing-attack safe`).
- **Timeout Automático de Inatividade:** Encerramento seguro de sessão após 10 minutos de inatividade do operador.

### 📊 1.4. Exportação Inteligente Multicontexto
- O botão corporativo de **Exportação CSV** no cabeçalho detecta dinamicamente a aba em uso e gera o arquivo correspondente devidamente formatado para o Excel/Google Sheets:
  - Aba Vistorias ➔ `vistorias_insidesales_YYYY-MM-DD.csv`
  - Aba Descontos ➔ `solicitacoes_desconto_YYYY-MM-DD.csv`
  - Aba Passagem de Turno ➔ `passagens_bastao_YYYY-MM-DD.csv`
  - Aba Ocorrências/BI ➔ `ocorrencias_insidesales_YYYY-MM-DD.csv`

---

## 2. Pilares de Engenharia & Arquitetura

### 🛡️ Pilar 1: Conformidade com Regras de Negócio & Cálculos Financeiros
- **Ciclo Mensal de Descontos:** Renovação automática no dia 1º de cada mês com contagem regressiva de dias.
- **Modalidades de Desconto:**
  - **Adesão:** Valor cheio fixo de **R$ 200,00**. Desconto informado em R$ (R$ 0,00 a R$ 200,00).
  - **Plano Mensal:** Valor cheio digitável. Desconto informado em percentual com **trava estrita de teto de 20,0%**.
- **Precisão Financeira:** Módulo `src/utils/finance.ts` que opera internamente em centavos inteiros antes das divisões e subtrações, eliminando imprecisões do padrão IEEE 754.

### 📱 Pilar 2: Responsividade e Experiência do Usuário
- **Visualização Adaptativa:** Cards verticais dinâmicos em telas menores (< 768px) e Data Table corporativa densa em telas maiores (>= 768px).
- **Acessibilidade Touch:** Áreas clicáveis padronizadas com mínimo de 44px de altura, rolagem suave e suporte a safe area insets (notches de iPhone e barras de gestos).

### 🔒 Pilar 3: Resiliência de Dados & Conexão
- **Persistência Híbrida Supabase + Cache Local:** Conexão nativa com PostgreSQL Supabase com fallback transparente para `LocalStorage`.
- **Backup Automático Pré-Reset:** Toda operação administrativa de zeramento gera um snapshot de segurança com script SQL de recuperação antes da limpeza.

---

## 3. Estrutura dos Módulos Principais

```
src/
├── components/
│   ├── auth/
│   │   └── LoginScreen.tsx               # Tela de autenticação com timeout e seleção de perfil
│   ├── discounts/
│   │   ├── ApprovalModal.tsx             # Modal de aprovação com validação criptográfica SHA-256
│   │   ├── BudgetPanel.tsx               # Painel orçamentário (Supervisão R$ 700, Gerente R$ 200)
│   │   ├── DiscountBIDashboard.tsx       # Gráficos analíticos e indicadores de conversão
│   │   ├── DiscountRequestForm.tsx       # Formulário com validação de placa e teto de 20%
│   │   ├── DiscountRequestsTable.tsx     # Tabela Desktop e Cards Mobile com SLA
│   │   ├── ManagerDirectReleaseModal.tsx # Modal de liberação direta da reserva gerencial
│   │   └── RejectionModal.tsx            # Modal de recusa com parecer obrigatório
│   ├── inspections/
│   │   ├── InspectionApprovalModal.tsx   # Modal de aprovação técnica com confirmação de adesão
│   │   ├── InspectionDetailsModal.tsx    # Visualizador completo de laudos, GPS e contatos
│   │   ├── InspectionRejectionModal.tsx  # Modal de reprovação com justificativa técnica
│   │   ├── InspectionRequestForm.tsx     # Formulário de vistoria (Placa Mercosul/Tradicional, GPS e Adesão)
│   │   └── InspectionRequestsTable.tsx   # Tabela analítica Desktop e Cards Operacionais Touch Mobile
│   ├── DiscountRequestsSection.tsx       # Orquestrador da aba de Descontos
│   ├── InspectionRequestsSection.tsx     # Orquestrador da aba de Vistorias Veiculares
│   ├── OccurrenceForm.tsx                # Formulário de Ocorrências com sanitização XSS
│   ├── OccurrenceHistory.tsx             # Histórico e gestão de status de ocorrências
│   ├── AnalyticsDashboard.tsx            # Painel BI com motor Z-Score de anomalias
│   ├── ShiftPassoverSection.tsx          # Passagem de bastão e pendências de turno
│   ├── DatabaseErrorModal.tsx            # Diagnóstico, backup e reset seguro do banco
│   └── Header.tsx                        # Cabeçalho corporativo com status e abas
├── data/
│   ├── discountData.ts                   # Constantes de equipes, tetos, regex de placas e CSV
│   └── mockData.ts                       # Registros iniciais de ocorrências e categorias
├── services/
│   ├── authService.ts                    # Gerenciamento de credenciais, sessões e RBAC
│   ├── dbService.ts                      # Operações de Ocorrências, Passagens e Diagnóstico
│   ├── discountService.ts                # Operações de Desconto, cálculo de saldos e cotas
│   └── inspectionService.ts              # Persistência e auditoria de Vistorias (Supabase/Local)
├── utils/
│   ├── csvInspectionExport.ts            # Gerador de planilha CSV para Vistorias
│   ├── finance.ts                        # Operações financeiras de alta precisão em centavos
│   ├── security.ts                       # Hashes SHA-256, Sanitização XSS e URLs seguras
│   ├── statisticalAnalysis.ts            # Cálculo de Z-Score e anomalias de ocorrências
│   └── discountAnalytics.ts              # Indicadores estatísticos de desconto
└── types.ts                              # Tipos TypeScript consolidados
```

---

## 4. Dicionário de Tipos Principais

### `SolicitacaoVistoria`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único da vistoria |
| `dataHoraSolicitacao` | `string` (ISO) | Carimbo de data e hora do cadastro |
| `dataVistoria` | `string` (YYYY-MM-DD) | Data agendada para a vistoria presencial |
| `horarioVistoria` | `string` (HH:mm) | Horário agendado para o atendimento |
| `vistoriador` | `'Danilo' \| 'Lucas'` | Vistoriador designado para o atendimento em campo |
| `nomeAssociado` | `string` | Nome completo do associado/cliente |
| `contato` | `string` | Telefone com DDD (com atalhos para WhatsApp e ligação) |
| `modeloCarro` | `string` | Modelo, marca e versão do veículo |
| `placa` | `string` | Placa validada (Mercosul ou Tradicional) |
| `tipoPlaca` | `'Mercosul' \| 'Tradicional' \| 'Inválida'` | Padrão identificado da placa |
| `valorAdesao` | `number` | Valor da taxa de adesão em R$ |
| `adesaoPaga` | `boolean` | `true` = Já paga em conta; `false` = A receber em campo |
| `localizacaoMaps` | `string` | Link seguro para visualização no Google Maps |
| `linkVistoria` | `string` | Hiperlink para laudo gerado por sistema externo |
| `linkPagamento` | `string` | Hiperlink para fatura/checkout de pagamento |
| `solicitante` | `string?` | Consultor ou líder responsável pelo agendamento |
| `status` | `StatusVistoria` | `'Aguardando Vistoria' \| 'Aprovado' \| 'Reprovado'` |
| `dataHoraAprovacao` | `string?` (ISO) | Carimbo de data/hora da conclusão do laudo |
| `parecer` | `string?` | Parecer técnico circunstanciado em caso de aprovação |
| `motivoReprovacao` | `string?` | Justificativa técnica em caso de reprovação |
| `aprovador` | `string?` | Nome do vistoriador ou gestor que concluiu a vistoria |

---

### `SolicitacaoDesconto`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `string` | Identificador único da solicitação |
| `dataHoraSolicitacao` | `string` (ISO) | Carimbo de data e hora do envio |
| `cliente` | `string` | Nome ou Razão Social do cliente (sanitizado) |
| `supervisora` | `string` | Supervisora responsável ('Débora Rodrigues') |
| `consultor` | `string` | Nome do consultor de vendas vinculado |
| `placa` | `string` | Placa do veículo validada (Mercosul ou Padrão Tradicional) |
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
| `tipoRegistro` | `'SolicitacaoSupervisao' \| 'LiberacaoGerencial'` | Origem da solicitação |

---

## 5. Configuração e Execução

### Executar em Desenvolvimento
```bash
npm install
npm run dev
```

### Build de Produção
```bash
npm run build
```

### Variáveis de Ambiente (`.env.example`)
```env
# Configurações do Supabase (opera com fallback em LocalStorage se não configurado)
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### Autorização e Perfis
- **Aprovação de Descontos e Liberações Gerenciais:** Perfil Gerencial (Heder Santos).
- **Vistorias e Laudos Técnicos:** Vistoriadores Danilo e Lucas / Supervisão.
- **Manutenção e Reset do Banco de Dados:** Senha Administrativa de Segurança com geração de ponto de restauração instantâneo.
