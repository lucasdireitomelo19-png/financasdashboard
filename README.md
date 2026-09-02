# 💰 Finanças Dashboard

Dashboard pessoal para concentrar toda a sua vida financeira: gastos, entradas
fixas e variáveis, recorrências (aluguel, salário, assinaturas) e uma carteira
de investimentos com evolução de patrimônio. Funciona como um app instalável
("PWA") tanto no iPhone quanto no PC, com os dados sincronizados na nuvem
entre os dois — o que você lançar em um aparelho aparece no outro.

## Stack

- **React + TypeScript + Vite** (frontend)
- **Tailwind CSS v4** (estilo)
- **Supabase** (autenticação por e-mail/senha + banco de dados Postgres com
  Row Level Security — cada usuário só enxerga seus próprios dados)
- **Recharts** (gráficos)
- **vite-plugin-pwa** (app instalável no iPhone/Android/PC, funciona offline)

## 1. Criar o projeto no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **New Project**, escolha um nome e uma senha para o banco (guarde
   essa senha, mas ela não é usada pelo app — é só do painel do Supabase).
3. Aguarde o projeto ser provisionado (leva ~1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**, cole todo o conteúdo
   do arquivo [`supabase/schema.sql`](./supabase/schema.sql) deste repositório
   e clique em **Run**. Isso cria todas as tabelas (categorias, transações,
   recorrências, investimentos) já com as permissões de segurança configuradas.
5. Vá em **Project Settings** → **API**. Copie:
   - **Project URL**
   - **anon public key** (chave pública, segura para usar no frontend)
6. (Opcional, recomendado) Em **Authentication** → **Providers** → **Email**,
   você pode desativar a confirmação por e-mail ("Confirm email") se quiser
   entrar imediatamente após criar a conta, sem precisar clicar em um link de
   confirmação.
7. Para o **"Esqueci minha senha"** funcionar depois de publicar o app: vá em
   **Authentication** → **URL Configuration** e adicione a URL do seu app
   publicado (ex: `https://seu-app.vercel.app/**`) em **Redirect URLs**. Sem
   isso, o link do e-mail de recuperação não confirma a sessão corretamente.

## 2. Configurar o projeto localmente

```bash
npm install
cp .env.example .env
```

Edite o `.env` e cole a URL e a chave que você copiou do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON-PUBLICA
```

Rode o app localmente:

```bash
npm run dev
```

Abra `http://localhost:5173`, crie sua conta (e-mail + senha) e comece a usar.

## 3. Publicar para acessar do iPhone e do PC

Para acessar de qualquer lugar (inclusive do iPhone) você precisa publicar o
app em uma URL pública com HTTPS. A forma mais simples e gratuita é a
[Vercel](https://vercel.com):

1. Suba este repositório para o GitHub (se ainda não estiver lá).
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e
   importe o repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do `.env`:
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Clique em **Deploy**. Em ~1 minuto você terá uma URL do tipo
   `https://seu-app.vercel.app`.

Qualquer outro serviço de hospedagem de site estático (Netlify, Cloudflare
Pages, GitHub Pages, etc.) também funciona — o comando de build é
`npm run build` e a pasta gerada é `dist/`.

### Instalar como app no iPhone

1. Abra a URL publicada no **Safari** do iPhone.
2. Toque no ícone de compartilhar (quadrado com seta para cima).
3. Toque em **"Adicionar à Tela de Início"**.

O app abre em tela cheia, com ícone próprio, como um aplicativo nativo.

### Instalar como app no PC

No Chrome/Edge, abra a URL publicada e clique no ícone de instalar que
aparece na barra de endereço (ou menu → "Instalar app"). Ele abre em uma
janela própria, sem as abas do navegador.

## Funcionalidades

- **Lançamentos**: registre gastos e entradas, com categoria, forma de
  pagamento, data e observações. Marque como "variável" entradas/gastos que
  não são fixos (freelas, bônus, gastos não planejados).
- **Filtros**: filtre lançamentos por tipo, categoria, forma de pagamento,
  período e texto livre, direto na tela de Lançamentos.
- **Recorrentes**: cadastre gastos e entradas de valor fixo (aluguel, salário,
  assinaturas) com frequência semanal/mensal/anual. O app gera os
  lançamentos automaticamente nas datas certas.
- **Categorias**: totalmente customizáveis (ícone, cor e nome), separadas
  entre gastos e entradas, com um conjunto inicial já pronto.
- **Investimentos**: cadastre cada posição (renda fixa, ações, fundos, FIIs,
  cripto, previdência, etc.), registre aportes, resgates, rendimentos e
  ajustes de valor, e acompanhe o ganho (R$ e %) e a alocação da carteira.
- **Recomendações**: um mini-quiz define seu perfil de investidor
  (conservador/moderado/arrojado) e compara sua alocação atual com uma
  alocação-alvo sugerida (gráfico radar), além de um diagnóstico financeiro
  automático (reserva de emergência, taxa de poupança, concentração da
  carteira, gastos fixos vs. renda) gerado por regras a partir dos seus
  próprios dados. É conteúdo educacional, não uma recomendação de
  investimento individualizada.
- **Contas**: cartões de crédito (com dia de fechamento/vencimento, fatura
  atual e anterior, e controle de "paga/pendente") e vale-refeição/alimentação
  (VR/VA) com crédito mensal, saldo disponível e ciclo próprios. Lançamentos
  podem ser ligados a uma conta para entrar automaticamente na fatura/saldo
  certos.
- **Compras parceladas**: marque um gasto como parcelado (2x a 60x) e o app
  gera automaticamente cada parcela no mês certo, ligadas entre si.
- **Orçamento por categoria**: defina um limite mensal opcional por categoria
  de gasto, com barra de progresso e alerta ao se aproximar/estourar.
- **Metas de economia**: crie metas (viagem, reserva, o que for) e registre
  aportes/retiradas, acompanhando o progresso até o valor-alvo.
- **Insights automáticos**: comparação de gastos por categoria mês a mês e
  detecção de lançamentos fora do padrão, gerados por regras a partir dos
  seus dados (sem IA).
- **Dashboard/cockpit**: patrimônio líquido (investimentos + saldo VR −
  parcelas futuras comprometidas) com projeção dos próximos meses baseada na
  sua taxa de poupança real, saldo do mês, entradas x saídas, gastos por
  categoria e evolução dos últimos 6 meses.
- **Recuperar senha**: fluxo completo de "esqueci minha senha" por e-mail.
- **Notificações**: sino no topo com alertas calculados a partir dos seus
  dados — fatura perto de fechar/vencer, saldo do VR acabando, orçamento
  estourado, recorrência prestes a ser cobrada. Ficam só dentro do app (não
  chegam como push no celular).
- **Barra de comando (⌘K)**: aperte Cmd/Ctrl+K (ou o botão de lupa flutuante
  no mobile) para abrir um atalho rápido — lançar gasto/entrada, ir para
  qualquer tela ou buscar um lançamento, tudo digitando.
- **Sincronizado**: como os dados ficam no Supabase (nuvem), tudo que você
  lança no PC aparece no iPhone e vice-versa.

## Scripts

```bash
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção (pasta dist/)
npm run preview   # servir o build de produção localmente
npm run lint      # checagem de lint
```

## Estrutura do banco de dados

Veja [`supabase/schema.sql`](./supabase/schema.sql) para o schema completo.
Resumo das tabelas:

- `categories` — categorias de gasto/entrada (nome, ícone, cor)
- `transactions` — todos os lançamentos (gastos e entradas)
- `recurring_templates` — modelos de recorrência (o app gera as `transactions`
  automaticamente a partir daqui)
- `investments` — cada investimento/posição da carteira
- `investment_movements` — aportes, resgates, rendimentos e ajustes de cada
  investimento
- `investor_profiles` — resultado do quiz de perfil de investidor (uma linha
  por usuário)
- `payment_accounts` — cartões de crédito e vales (VR/VA)
- `credit_card_bill_payments` — marca se a fatura de um determinado ciclo do
  cartão já foi paga
- `category_budgets` — limite mensal opcional por categoria
- `savings_goals` / `savings_goal_contributions` — metas de economia e seus
  aportes/retiradas

Todas as tabelas têm Row Level Security (RLS) habilitado: cada usuário só
consegue ler e escrever seus próprios dados.

> **Já tem o projeto configurado e só quer pegar a tabela nova?** Basta
> rodar o `supabase/schema.sql` de novo no SQL Editor — ele usa
> `create table if not exists` e `drop policy if exists`/`create policy` em
> tudo, então é seguro rodar por cima do que já existe sem perder dados.
