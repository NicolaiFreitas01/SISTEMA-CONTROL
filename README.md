# LABIRINEX CONTROL

Sistema de gestão COD em React, TypeScript, Tailwind CSS, componentes acessíveis no padrão shadcn/ui (Radix + CVA), Recharts, Lucide e Supabase.

## Executar

Requer Node.js 22.12+ ou 24 e npm. Use o checkout existente; tarefas na nuvem já são isoladas e não precisam de worktrees.

```bash
cd /workspace/SISTEMA-CONTROL
npm ci --cache /workspace/.npm-cache
npm run dev
```

A tela inicial oferece login quando o Supabase está configurado. **Abrir demonstração interativa** funciona sem serviços externos. A demonstração contém dados fictícios, é identificada em todas as páginas e persiste apenas em `localStorage` (`labirinex-demo`). Para reiniciá-la, remova essa chave no navegador. Nunca é copiada para a conta real.

## Conectar o Supabase

1. Crie um projeto em Supabase, mantenha o cadastro por e-mail habilitado e obtenha sua URL pública e chave **publishable/anon** em Project Settings → API.
2. Execute **uma vez**, no SQL Editor do projeto, o arquivo `supabase/migrations/202610200001_initial.sql`. A migração não foi aplicada a um serviço hospedado nesta entrega porque ainda não existe projeto configurado.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Alternativamente, cadastre essas variáveis nas configurações do ambiente de nuvem. URL e chave publicável são configurações públicas do cliente. **Nunca use `service_role` nem chave secreta no frontend.**
4. Reinicie o Vite. Configure a URL do site e os redirecionamentos de autenticação no Supabase para o domínio onde publicar o aplicativo. Crie uma conta e confirme o e-mail se a confirmação estiver habilitada.
5. Faça um pedido de teste na conta real, confirme frete, registre despacho e confirme pagamento. Recarregue e confirme os registros no financeiro e nas tabelas do Supabase. Esse teste com Supabase hospedado ainda está pendente.

Sem as duas variáveis, o aplicativo não tenta enviar pedidos reais. Não há login fictício ou senha padrão. O cadastro real inicia sem vendas, despesas, leads ou metas; somente quatro conjuntos e dezesseis criativos de configuração são preparados.

## O que foi implementado

- Dashboard reativo com filtros de datas, receita/resultado diários, comparativos, indicadores e alertas de CPA, prejuízo, atraso, devoluções e estouro de orçamento.
- Pedidos em tabela e Kanban: cadastro, edição, busca, status, atribuição, rastreio, histórico, pagamentos, despacho, reembolso parcial e exportação CSV. Exclusão apenas antes de lançamentos.
- Eventos financeiros com data efetiva e registro único por pedido/tipo. Alterar um status **não** confirma pagamento nem gera custos. Valores e atribuição ficam bloqueados após um lançamento para preservar o histórico.
- Financeiro: entradas/saídas, demonstrativo gerencial, calendário de movimentos, despesas fixas/variáveis identificadas e projeções separadas. Despesas fixas não são repetidas sem confirmação de uma ocorrência real.
- Tráfego: orçamento por conjunto, pausar/ativar, gasto e métricas manuais, importação CSV, CPA/CPC/CTR/ROAS e receita atribuída. Pode excluir lançamento de tráfego para corrigi-lo. Não misture totais do conjunto e detalhes por criativo no mesmo dia.
- Criativos: cadastro/edição de URL HTTPS de mídia, pausa, atribuição, resultado e ranking com amostra mínima de cinco fretes pagos. A mídia é aberta no link original; upload e armazenamento de arquivos não estão implementados.
- Funil: leads com identificador comercial, atualização de etapa, atribuição e indicadores dos eventos financeiros. Não armazene informações médicas.
- Simulador por pedidos ou investimento/CPA, sliders, cenários e taxas configuráveis. Considera um produto por pedido e despacho de todos os pedidos com frete pago. É projeção, não garantia.
- Metas mensais de receita/resultado/líquido, progresso, média necessária, projeção e estimativa ideal de entregas.
- Relatórios agrupados por dia, semana, mês, conjunto, criativo, cidade ou status. Exportações CSV, Excel e PDF; resumo para copiar e colar no WhatsApp. Não envia mensagens automaticamente.
- Analista determinístico com fórmulas transparentes e temas reconhecidos. Não há modelo de IA, Meta Ads ou WhatsApp conectado.

## Regras financeiras

Valores monetários são BRL. Padrões: produto R$ 97, frete antecipado total R$ 29, custo unitário **com envio** R$ 29. Quantidade multiplica preço e custo, não o frete total informado no pedido.

- Receita bruta = fretes confirmados + produtos efetivamente pagos + outras entradas.
- Custo = quantidade de unidades despachadas × custo unitário com envio. **Não desconta frete novamente.**
- Resultado operacional estimado = receita − custo de despacho − tráfego real − demais despesas, tributos, taxas e reembolsos registrados.
- Resultado líquido gerencial coincide com o operacional enquanto não houver ajustes contábeis adicionais. Não é apuração fiscal nem contabilidade por competência. Um saldo inicial de caixa/contas bancárias não foi implementado; o fluxo mostra a variação líquida dos eventos registrados.
- Receita bruta preserva recebimentos originais; reembolsos são saídas separadas e reduzem o resultado.
- CPA = gasto real / pedidos com frete confirmado; CPA por entrega = gasto real / entregas pagas. Denominador zero retorna zero, acompanhado de ausência de conversões na interface.
- Receita e despesa entram no período da movimentação, não no da criação do pedido. Taxas de entrega do período podem superar 100% se pagamentos se referirem a envios de um período anterior; não são métricas por coorte.
- Tráfego é somado diretamente dos lançamentos de métricas, sem repetir o mesmo gasto no livro de despesas. Orçamento planejado não vira despesa automática.
- Receita por cidade/status não recebe rateio arbitrário de anúncios; CPA/ROAS não se aplicam nesses agrupamentos. Status do relatório é o atual.

## Banco, segurança e arquitetura

`workspaces` guarda um agregado JSONB versionado por usuário. A RPC `save_workspace` grava atomicamente esse agregado, suas projeções relacionais (`adsets`, `creatives`, `orders`, `financial_entries`, `traffic`) e uma revisão de auditoria. Leads, metas, configurações e histórico operacional são coleções do agregado. Conjuntos representam a campanha Meta Ads inicial; uma entidade de campanha múltipla/API externa é evolução futura.

Todas as tabelas têm RLS de leitura por proprietário; gravações diretas são revogadas. A RPC exige `auth.uid()`, usa bloqueio transacional e revisão otimista, valida valores, referências, reembolsos e duplicação, e impede remover ou modificar lançamentos financeiros anteriores. FKs incluem o proprietário. Nunca se usa `service_role` no navegador. Usuários não compartilham acesso nesta versão; não há convites nem papéis de equipe.

A versão atual carrega o espaço inteiro e grava um agregado por alteração, adequado a uma operação inicial. Para alto volume, migrar o cliente a comandos incrementais, paginação e agregação no servidor. Cada revisão de auditoria contém o estado completo, inclusive dados pessoais; planeje retenção, backups e acesso administrativo antes de produção. Conflitos em outra aba pedem recarregar; não sobrescrevem silenciosamente.

## Verificar

```bash
npm test
npm run build
npm audit --omit=dev
```

Os testes de domínio cobrem os três exemplos obrigatórios, inversão por CPA, datas, quantidade, duplicação, reembolsos e ausência de divisões por zero. Os testes de banco executam a migração em PostgreSQL via PGlite com `auth.uid()` de teste: RPC, tabelas relacionais, concorrência, RLS entre duas contas, anonimato e imutabilidade. Isso não substitui validar Auth/API no Supabase hospedado.

Smoke de navegador (inicie o Vite antes):

```bash
npm run dev
# Em outro terminal, com Chromium instalado:
CHROMIUM_PATH=/usr/bin/chromium npm run smoke
```

Opcionalmente ajuste `BASE_URL` (padrão interno `http://127.0.0.1:5173`) e `ARTIFACT_DIR` (padrão `/tmp/labirinex-validation`). O smoke cria registros **apenas na demonstração** em um contexto isolado de navegador, percorre as páginas, testa o ciclo financeiro e persistência local e verifica responsividade. Nunca usa contas reais.

## Publicar o aplicativo

`npm run build` gera `dist/`. Hospede esses arquivos por HTTPS, com as variáveis públicas corretas presentes na compilação. Configure os domínios de Auth no Supabase. Não há backend Node para iniciar: autenticação e persistência usam a API Supabase com RLS. A publicação do ambiente de desenvolvimento é uma ação separada nas configurações da nuvem; código e testes locais não significam que o aplicativo já está publicado.
