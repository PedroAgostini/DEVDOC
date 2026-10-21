// Creates the onboarding library: tool presentation, usage guide, one doc per level,
// per operation and per department. Usage:
//   node --env-file=.env.local scripts/seed-onboarding.mjs autor@empresa.com [--limpar]
// --limpar deletes EVERY document (and its images) before creating the new ones.
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const reset = args.includes("--limpar");
if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/seed-onboarding.mjs autor@empresa.com [--limpar]");
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: author, error: authorError } = await sb
  .from("members")
  .select("id")
  .eq("email", email.trim().toLowerCase())
  .single();
if (authorError || !author) {
  console.error(`Não achei a pessoa ${email} em members. Crie o Master antes.`);
  process.exit(1);
}

if (reset) {
  const { data: folders } = await sb.storage.from("doc-images").list("", { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await sb.storage.from("doc-images").list(folder.name, { limit: 1000 });
    if (files?.length) await sb.storage.from("doc-images").remove(files.map((f) => `${folder.name}/${f.name}`));
  }
  const del = await sb.from("documents").delete().not("id", "is", null);
  if (del.error) throw del.error;
  await sb.from("search_misses").delete().gt("id", 0);
  console.log("Documentos, imagens e buscas antigas removidos.");
}

const [{ data: cats }, { data: ops }, { data: deps }] = await Promise.all([
  sb.from("categories").select("id,slug"),
  sb.from("operations").select("id,name,slug").order("sort"),
  sb.from("departments").select("id,name,slug").order("sort"),
]);
const onboarding = cats.find((c) => c.slug === "onboarding")?.id ?? null;

/* Content ----------------------------------------------------------------------------- */

const docs = [];

docs.push({
  key: "apresentacao",
  title: "Conheça o DEVDOC",
  summary: "O que é a ferramenta, para que serve e tudo o que ela faz.",
  tags: ["onboarding", "devdoc"],
  body: `O DEVDOC é a base de conhecimento do time. Aqui ficam a documentação, os prompts, os códigos e o registro de como resolvemos problemas, organizados por operação, departamento e cliente.

## Por que ele existe

Conhecimento que fica só na cabeça de alguém ou perdido em conversa some quando mais precisamos dele. O DEVDOC resolve isso de dois jeitos:

- **Achar em segundos.** Tudo é buscável, filtrável e organizado por operação e departamento.
- **Escrever sem complicação.** O editor é visual, com modelos prontos para cada tipo de documento. Ninguém precisa saber markdown.

## O que você encontra aqui

| Categoria | Para que serve |
| --- | --- |
| Documentação | Explicar como algo funciona, passo a passo |
| Prompt | Prompts de IA prontos, com campos para preencher |
| Código | Trechos de código reutilizáveis, com botão de copiar |
| Resolução de problemas | O que deu errado, por que e como foi corrigido |
| Processo | Como o time trabalha: etapas, responsáveis e prazos |
| Onboarding | Guias como este, para quem está chegando |

## Funcionalidades

**Para achar**
- Busca com Ctrl K em qualquer tela, que ignora acentos
- Filtros por categoria, operação, departamento, cliente, autor, tag e período
- Painel geral e painel de cada operação, com favoritos e "continue de onde parou"

**Para escrever**
- Editor visual com barra de ferramentas e menu que abre ao digitar /
- Modelos por categoria, que já trazem a estrutura do documento
- Imagens por colar, arrastar ou escolher do computador
- Blocos de código com destaque e escolha de linguagem
- Links entre documentos: digite [[ e escolha o documento
- Rascunho salvo sozinho e histórico de versões a cada publicação

**Para usar no dia a dia**
- Prompts com variáveis {{assim}}: preencha ao lado e copie pronto
- Botão de copiar em todo bloco de código
- Exportar em .md, .zip com imagens ou PDF, e importar arquivos .md e .zip

**Para manter tudo atualizado**
- Cada documento tem um responsável e um prazo de revisão
- O painel mostra o que está com a revisão vencida
- Gestores veem métricas: mais vistos, mais copiados e buscas que não acharam nada

## Quem vê o quê

Cada documento escolhe quem pode ler: todos, a partir de um nível, grupos (cada operação e cada departamento é um grupo), pessoas específicas ou só o autor. Documento privado não é lido nem por Admin nem por Master.

## Próximos passos

1. Leia @@guia@@.
2. Leia o guia do seu nível de acesso: @@nivel-operacao@@, @@nivel-gestor@@, @@nivel-admin@@ ou @@nivel-master@@ (cada um aparece só a partir do nível dele).
3. Abra o onboarding da sua operação e do seu departamento, na barra lateral.`,
});

docs.push({
  key: "guia",
  title: "Como usar o DEVDOC: guia rápido",
  summary: "Do primeiro acesso ao primeiro documento publicado, em 15 minutos.",
  tags: ["onboarding", "devdoc", "guia"],
  body: `Este guia mostra o caminho completo: entrar, achar, ler, copiar e escrever. Se ainda não conhece a ferramenta, comece por @@apresentacao@@.

## Seus primeiros 15 minutos

- [ ] Entrar com Google ou com o link de acesso que chegou por e-mail
- [ ] Escolher o tema claro ou escuro no rodapé da barra lateral
- [ ] Abrir o painel da sua operação na barra lateral
- [ ] Buscar algo com Ctrl K
- [ ] Marcar um documento com a estrela de favorito
- [ ] Criar e publicar seu primeiro documento

## 1. Entrar

- **Com Google:** use a conta da empresa.
- **Primeiro acesso por e-mail:** na tela de login, clique em "Primeiro acesso ou esqueceu a senha?", receba o link e crie sua senha.
- Só entra quem foi liberado por um Admin ou Master. Se aparecer "sem acesso", fale com eles.

## 2. Achar

- **Ctrl K** abre a busca em qualquer tela. Ela procura no título, no resumo, nas tags e no texto, sem se importar com acentos.
- **Documentos**, na barra lateral, abre a lista com filtros. Os filtros ficam no endereço da página: copie o link para mandar a busca pronta para alguém.
- **Operações e Departamentos**, na barra lateral, levam aos documentos de cada área. Os grupos podem ser recolhidos clicando no nome.

## 3. Ler e copiar

- Em blocos de código, use o botão **Copiar** no canto do bloco.
- Em prompts com variáveis, preencha os campos em **Preencher o prompt** e clique em **Copiar preenchido**.
- **Exportar** baixa o documento em .md, .zip com imagens ou PDF.
- **Mencionado em** mostra outros documentos que apontam para este.

## 4. Escrever

1. Clique em **Novo documento** e escolha o tipo. O modelo daquela categoria já vem preenchido.
2. Dê um título e um resumo de uma linha: eles aparecem nas listas e na busca.
3. Escreva usando a barra de ferramentas, ou digite **/** para ver todos os blocos: títulos, listas, checklist, código, tabela, imagem e destaque.
4. Para ligar outro documento, digite **[[** e escolha na lista.
5. Para inserir imagem, cole com Ctrl V, arraste ou use o botão de imagem.
6. No painel da direita, escolha categoria, operação, departamento, clientes, tags e **quem pode ver**.
7. Clique em **Publicar**.

Tudo é salvo sozinho enquanto você escreve. Até publicar, o documento é um rascunho que só você vê. Depois de publicado, novas alterações também ficam em rascunho até você clicar em **Publicar alterações**.

## 5. Manter atualizado

- Cada documento tem um **responsável** e um prazo de revisão.
- Quando o prazo vence, ele aparece em **Para revisar** no painel. Abra, confira e clique em **Marcar como revisado**.
- O **Histórico** guarda cada versão publicada e permite restaurar uma versão antiga.
- Excluir manda para a **Lixeira**, onde o documento fica 30 dias antes de sumir.

## Boas práticas

- Um documento, um assunto. Se ficou grande, divida e ligue com [[.
- Título que alguém buscaria: "Erro 504 no checkout" é melhor que "Problema de sexta".
- Use tags para o que atravessa áreas, como o nome de uma ferramenta.
- Escolha "Só eu" para anotações pessoais e mude depois, se quiser compartilhar.`,
});

const LEVELS = [
  {
    key: "nivel-operacao",
    title: "DEVDOC para o nível Operação",
    min: "operacao",
    summary: "O que você pode fazer no DEVDOC e como aproveitar melhor no dia a dia.",
    body: `Este é o guia de quem está no nível **Operação**, o nível de quem produz e consome conhecimento no dia a dia.

## O que você pode fazer

- **Ler** todo documento liberado para você: os públicos, os do seu nível, os dos seus grupos (suas operações e departamentos) e os compartilhados diretamente com você.
- **Criar** documentos e prompts, publicar e editar os seus.
- **Editar documentos de outras pessoas** quando elas colocarem você como coeditor.
- **Favoritar**, exportar (.md, .zip, PDF) e importar arquivos .md e .zip.
- **Escolher quem vê** cada documento seu: todos, um nível, grupos, pessoas ou só você.
- **Revisar** os documentos de que você é responsável quando o prazo vencer.

## O que fica com outros níveis

- Editar documentos de outras pessoas sem ser coeditor: Gestor da operação, Admin e Master.
- Liberar acesso para novas pessoas e mexer em operações, departamentos e categorias: Admin e Master.
- Ver métricas de uso: Gestor e acima.

## Como escolher quem vê

| Opção | Use quando |
| --- | --- |
| Todos | O conteúdo serve para qualquer pessoa do time |
| A partir de um nível | É assunto de gestão, por exemplo |
| Grupos | É da sua operação ou do seu departamento |
| Pessoas específicas | Vale para poucas pessoas |
| Só eu | Anotação pessoal ou rascunho de ideia |

## Rotina sugerida

- [ ] Ao resolver um problema, registre em "Resolução de problemas" no mesmo dia
- [ ] Ao criar um prompt que funcionou bem, salve como "Prompt" com variáveis
- [ ] Antes de perguntar no chat, procure com Ctrl K
- [ ] Uma vez por semana, confira se há algo seu em "Para revisar"

Guia completo de uso: @@guia@@.`,
  },
  {
    key: "nivel-gestor",
    title: "DEVDOC para Gestores",
    min: "gestor",
    summary: "Como cuidar da base de conhecimento da sua operação.",
    body: `Este guia é para quem está no nível **Gestor**. Além de tudo o que o nível Operação faz (veja @@nivel-operacao@@), o Gestor cuida da qualidade do conhecimento da sua operação.

## O que muda para você

- **Editar qualquer documento da sua operação**, mesmo sem ser autor ou coeditor (exceto os privados).
- **Gerenciar as pessoas da operação** no painel da operação: adicionar e remover membros.
- **Fixar documentos** no topo do painel da operação, com o botão de fixar no documento.
- **Ver métricas** em Métricas, na barra lateral.
- **Acompanhar revisões:** o painel "Para revisar" mostra também os documentos vencidos da sua operação.

## Métricas que valem atenção

- **Mais vistos:** o que o time mais consulta. Mantenha esses impecáveis.
- **Mais copiados:** prompts e códigos que viraram ferramenta de trabalho.
- **Sem visitas:** candidatos a revisar, juntar com outro ou arquivar.
- **Buscas sem resultado:** cada termo é um documento que falta escrever.

## Rotina sugerida

- [ ] Semanal: zerar a lista "Para revisar" da operação
- [ ] Semanal: olhar "Buscas sem resultado" e pedir os documentos que faltam
- [ ] Mensal: revisar os fixados do painel da operação
- [ ] Ao entrar alguém novo: adicionar a pessoa à operação e indicar o onboarding da operação
- [ ] Ao sair alguém: pedir a um Master a transferência dos documentos dessa pessoa

## Boas práticas

- Fixe no máximo 5 documentos: o que todo mundo da operação precisa ver primeiro.
- Defina um responsável real para cada documento importante.
- Prefira atualizar um documento antigo a criar um novo sobre o mesmo assunto.`,
  },
  {
    key: "nivel-admin",
    title: "DEVDOC para Admins",
    min: "admin",
    summary: "Liberar acesso, organizar a estrutura e manter a casa em ordem.",
    body: `Este guia é para quem está no nível **Admin**. O Admin cuida de quem entra e de como o conteúdo se organiza. Veja também @@nivel-gestor@@, porque o Admin pode fazer tudo o que o Gestor faz, em todas as operações.

## Administração

Fica no ícone de ajustes, no rodapé da barra lateral.

| Aba | O que você faz |
| --- | --- |
| Pessoas | Liberar acesso (convite por e-mail), definir nível, operações e departamentos, desativar |
| Operações | Criar, renomear e definir a cor de cada operação |
| Departamentos | Criar, renomear e definir a cor de cada departamento |
| Clientes | Cadastrar clientes e dizer qual operação atende cada um |
| Categorias | Editar nome, cor, modelo e revisão padrão de cada categoria |
| Grupos | Criar grupos extras que cruzam operações e departamentos |

## Liberar acesso para alguém

1. Em Pessoas, clique em **Liberar acesso**.
2. Preencha e-mail, nome, nível, operações e departamentos.
3. A pessoa recebe um convite por e-mail, ou entra com Google, ou usa "Primeiro acesso" na tela de login.

Admins liberam os níveis **Operação** e **Gestor**. Para criar outro Admin ou Master, peça a um Master.

## Modelos e revisão

Em Categorias, o **modelo** é o texto que já aparece quando alguém cria um documento daquela categoria. A **revisão padrão** define de quanto em quanto tempo os novos documentos daquela categoria precisam ser revisados.

## Limites importantes

- Admin **não lê documentos privados** ("Só eu") de ninguém.
- Excluir uma operação só funciona sem documentos ligados a ela.
- Desativar uma pessoa bloqueia o acesso na hora. Os documentos dela continuam no lugar até um Master transferir.

## Rotina sugerida

- [ ] Ao entrar alguém: liberar acesso no mesmo dia, com operações e departamentos certos
- [ ] Ao sair alguém: desativar e avisar um Master para transferir os documentos
- [ ] Mensal: revisar os modelos das categorias com os Gestores`,
  },
  {
    key: "nivel-master",
    title: "DEVDOC para Masters",
    min: "master",
    summary: "Responsabilidades de quem tem o nível mais alto de acesso.",
    body: `Este guia é para quem está no nível **Master**. O Master pode tudo o que o Admin faz (veja @@nivel-admin@@), mais as ações que mexem com o próprio controle de acesso.

## O que só o Master faz

- **Criar e remover Admins e outros Masters.** Pode haver mais de um Master; recomendamos pelo menos dois, para nunca depender de uma pessoa só.
- **Transferir documentos** de alguém que saiu da empresa: em Administração > Pessoas, edite a pessoa desativada e escolha quem recebe. A transferência move autoria e responsabilidade **sem abrir o conteúdo**, inclusive os privados.

## Saída de uma pessoa

1. Desative a pessoa em Administração > Pessoas (bloqueia o acesso na hora).
2. Na mesma tela, transfira os documentos para quem assume o assunto.
3. Peça ao novo responsável para conferir os documentos que herdou.

## Segurança

- As permissões ficam no banco de dados. Esconder um botão não basta e não é o que protege o conteúdo.
- A chave de serviço do Supabase dá acesso total ao banco. Ela fica só nas variáveis de ambiente do servidor (Vercel) e nunca deve ser compartilhada.
- Documentos privados não são lidos nem pelo Master. Isso é proposital.

## Rotina sugerida

- [ ] Trimestral: revisar a lista de Admins e Masters
- [ ] Trimestral: conferir pessoas desativadas com documentos ainda não transferidos
- [ ] Ao mudar a estrutura da empresa: alinhar operações, departamentos e categorias com os Admins`,
  },
];
for (const l of LEVELS) {
  docs.push({
    key: l.key,
    title: l.title,
    summary: l.summary,
    tags: ["onboarding", "devdoc", "acesso"],
    visibility: l.min === "operacao" ? "all" : "level",
    min_level: l.min,
    body: l.body,
  });
}

const OP_FOCUS = {
  inovacao: "experimentos, protótipos e testes de ferramentas novas",
  adm: "rotinas administrativas, compras, contratos e fornecedores",
  diretoria: "decisões, diretrizes e comunicados da liderança",
};

for (const op of ops ?? []) {
  const focus = OP_FOCUS[op.slug];
  docs.push({
    key: `op-${op.slug}`,
    title: `Onboarding da operação ${op.name}`,
    summary: `Primeiros passos para quem chega na operação ${op.name}.`,
    tags: ["onboarding", "operacao"],
    operation: op.id,
    body: `Bem-vindo à operação **${op.name}**. Este documento reúne o que você precisa para começar, e o painel da operação (na barra lateral) mostra o resto: documentos fixados, clientes atendidos e pessoas.${focus ? `\n\nA ${op.name} concentra ${focus}.` : ""}

## A completar pelo gestor

> Preencha esta seção e apague este aviso: ela é o que a pessoa nova mais vai ler.

- **Objetivo da operação:**
- **Clientes atendidos:** (os clientes atribuídos à operação já aparecem no painel)
- **Rituais:** reuniões, horários e canais
- **Ferramentas:** sistemas e acessos necessários
- **Quem procurar para cada assunto:**

## Primeira semana

- [ ] Pedir a um Admin para entrar na operação ${op.name} no DEVDOC
- [ ] Ler os documentos fixados no painel da operação
- [ ] Conhecer os clientes atendidos pela operação
- [ ] Ler o onboarding do seu departamento
- [ ] Registrar a primeira dúvida resolvida como "Resolução de problemas"

## O que documentar nesta operação

- **Processos** de entrega e aprovação com os clientes
- **Resolução de problemas** de cada cliente, para não resolver duas vezes a mesma coisa
- **Prompts** que funcionaram bem para os clientes da operação
- **Códigos** e configurações reutilizáveis

Documentos da operação que valem para todos podem ficar visíveis para "Todos". O que é só da equipe, use "Grupos" e escolha ${op.name}.

Antes de começar, leia também @@guia@@.`,
  });
}

const DEP_CONTENT = {
  web: {
    store: ["padrões de código e estrutura de projetos", "passo a passo de deploy e publicação de sites", "checklist de publicação (SEO, performance, formulários)", "bugs resolvidos e suas causas"],
    prompt: "Revise este código {{linguagem}} procurando bugs, problemas de acessibilidade e de performance. Explique cada ponto e sugira a correção.",
  },
  "social-media": {
    store: ["tom de voz de cada cliente", "checklist de publicação", "calendário e formatos por rede", "legendas e roteiros que performaram bem"],
    prompt: "Escreva 3 legendas para {{rede}} sobre {{tema}}, no tom de voz de {{cliente}}, com chamada para ação e até 5 hashtags.",
  },
  traducao: {
    store: ["glossário de termos por cliente", "guia de estilo e regras de cada idioma", "checklist de revisão", "dúvidas recorrentes de tradução"],
    prompt: "Traduza o texto abaixo de {{idioma_origem}} para {{idioma_destino}}, mantendo o tom {{tom}} e respeitando este glossário: {{glossario}}.",
  },
  "trafego-pago": {
    store: ["padrão de nomenclatura de campanhas", "checklist de configuração de pixel e eventos", "estruturas de campanha que funcionaram", "modelos de relatório para clientes"],
    prompt: "Crie 5 variações de anúncio para {{produto}}, com público {{publico}} e objetivo {{objetivo}}. Cada uma com título, texto principal e chamada.",
  },
  audiovisual: {
    store: ["padrões de exportação por plataforma", "organização de pastas e nomes de arquivo", "checklist de gravação e de entrega", "roteiros modelo"],
    prompt: "Escreva um roteiro de {{duracao}} segundos para {{plataforma}} sobre {{tema}}, com gancho nos 3 primeiros segundos e indicação de cenas.",
  },
  design: {
    store: ["guias de marca de cada cliente", "padrões de entrega e exportação", "checklist de revisão antes de enviar", "referências e decisões de projeto"],
    prompt: "Liste 5 direções visuais para {{peca}} de {{cliente}}, considerando o público {{publico}}. Para cada uma: paleta, tipografia e referência.",
  },
  "gestao-estrategica": {
    store: ["frameworks de diagnóstico e planejamento", "modelos de apresentação estratégica", "aprendizados de projetos anteriores", "pesquisas de mercado"],
    prompt: "Faça uma análise SWOT de {{empresa}} no segmento {{segmento}}, com 3 itens por quadrante e uma recomendação prioritária.",
  },
  "gestao-de-projetos": {
    store: ["ritos do time e da relação com clientes", "fluxo de aprovação de entregas", "modelos de cronograma e status", "onboarding de novos clientes"],
    prompt: "Transforme estas anotações de reunião em um resumo com decisões, próximos passos, responsáveis e prazos: {{anotacoes}}.",
  },
  comercial: {
    store: ["roteiro de abordagem e qualificação", "perguntas de diagnóstico", "modelos de proposta", "objeções comuns e respostas"],
    prompt: "Escreva uma mensagem de primeiro contato para {{empresa}}, do segmento {{segmento}}, citando a dor {{dor}} e propondo uma conversa de 20 minutos.",
  },
  closer: {
    store: ["roteiro de reunião de fechamento", "objeções de fechamento e respostas", "condições comerciais e regras de desconto", "follow-ups que funcionaram"],
    prompt: "Escreva um follow-up para {{cliente}} depois da proposta enviada em {{data}}, retomando o benefício {{beneficio}} e sugerindo um próximo passo claro.",
  },
  rh: {
    store: ["processo de admissão e desligamento", "políticas e benefícios", "onboarding de pessoas", "modelos de comunicação interna"],
    prompt: "Escreva um comunicado interno sobre {{assunto}}, em tom {{tom}}, com o que muda, a partir de quando e a quem procurar em caso de dúvida.",
  },
  financeiro: {
    store: ["fluxo de aprovação de despesas e orçamentos", "rotina de fechamento mensal", "emissão de notas e cobranças", "dúvidas recorrentes de outros times"],
    prompt: "Explique em linguagem simples, para quem não é da área, como funciona {{processo}} e quais documentos são necessários.",
  },
  inovacao: {
    store: ["experimentos em andamento e seus resultados", "protótipos e ferramentas testadas", "como propor uma ideia nova", "aprendizados que viraram padrão"],
    prompt: "Proponha um experimento de 2 semanas para testar {{ideia}}, com hipótese, métrica de sucesso, custo estimado e critério para seguir ou parar.",
  },
  ceo: {
    store: ["visão, missão e prioridades do ano", "decisões importantes e seus motivos", "comunicados da liderança", "princípios de como a empresa trabalha"],
    prompt: "Transforme estes pontos em um comunicado para o time inteiro, claro e direto, explicando o contexto e o que muda: {{pontos}}.",
  },
};

for (const dep of deps ?? []) {
  const c = DEP_CONTENT[dep.slug] ?? {
    store: ["processos do departamento", "resolução de problemas", "prompts úteis", "modelos e referências"],
    prompt: "Resuma {{assunto}} em 5 pontos práticos para alguém que está chegando no departamento.",
  };
  docs.push({
    key: `dep-${dep.slug}`,
    title: `Onboarding do departamento ${dep.name}`,
    summary: `O que o departamento ${dep.name} guarda no DEVDOC e por onde começar.`,
    tags: ["onboarding", "departamento"],
    department: dep.id,
    body: `Bem-vindo ao departamento **${dep.name}**. Todo documento marcado com o departamento ${dep.name} aparece em Departamentos > ${dep.name}, na barra lateral.

## A completar pelo gestor

> Preencha esta seção e apague este aviso.

- **O que o departamento faz:**
- **Ferramentas e acessos:**
- **Quem procurar para cada assunto:**
- **Documentos essenciais:** digite [[ para ligar os documentos que toda pessoa nova precisa ler

## Primeira semana

- [ ] Confirmar com um Admin que você está no departamento ${dep.name} no DEVDOC
- [ ] Abrir Departamentos > ${dep.name} e ler os documentos mais recentes
- [ ] Ler o onboarding da sua operação
- [ ] Salvar nos favoritos os documentos que você vai usar todo dia

## O que este departamento guarda aqui

${c.store.map((s) => `- ${s.charAt(0).toUpperCase()}${s.slice(1)}`).join("\n")}

Para algo que só o departamento deve ver, escolha "Grupos" e selecione ${dep.name}.

## Prompt de partida

Um exemplo de prompt com variáveis. Preencha os campos ao lado e copie pronto:

${c.prompt}

Guia completo de uso: @@guia@@.`,
  });
}

/* Write ------------------------------------------------------------------------------- */

const now = Date.now();
const ids = new Map();
for (const [i, d] of docs.entries()) {
  const at = new Date(now - (docs.length - i) * 60000).toISOString();
  const { data, error } = await sb
    .from("documents")
    .insert({
      title: d.title,
      summary: d.summary,
      content_md: d.body,
      status: "published",
      category_id: onboarding,
      operation_id: d.operation ?? null,
      department_id: d.department ?? null,
      author_id: author.id,
      owner_id: author.id,
      visibility: d.visibility ?? "all",
      min_level: d.min_level ?? "operacao",
      tags: d.tags,
      version: 1,
      review_interval_months: 6,
      published_at: at,
    })
    .select("id")
    .single();
  if (error) throw new Error(`${d.title}: ${error.message}`);
  ids.set(d.key, { id: data.id, title: d.title, at });
}

// Resolve @@key@@ into Markdown links, then record version 1 with the final text.
for (const d of docs) {
  const own = ids.get(d.key);
  const body = d.body.replace(/@@([a-z0-9-]+)@@/g, (_, key) => {
    const target = ids.get(key);
    return target ? `[${target.title}](/d/${target.id})` : key;
  });
  const up = await sb.from("documents").update({ content_md: body }).eq("id", own.id);
  if (up.error) throw new Error(`${d.title}: ${up.error.message}`);
  const ver = await sb.from("document_versions").insert({
    document_id: own.id,
    version: 1,
    title: d.title,
    summary: d.summary,
    content_md: body,
    author_id: author.id,
    created_at: own.at,
  });
  if (ver.error) throw new Error(`${d.title}: ${ver.error.message}`);
}

console.log(`${docs.length} documentos de onboarding criados.`);
