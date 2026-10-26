# Teste de legítimo interesse (LIA) do DEVDOC

**Status:** rascunho para validação do jurídico e do encarregado (DPO). Não vale como registro até ser revisado, ajustado e assinado.

Base: LGPD, art. 7º, IX, e art. 10, e o *Guia Orientativo: Hipóteses legais de tratamento de dados pessoais, Legítimo Interesse*, da ANPD (fevereiro de 2024), que organiza o teste em três fases: finalidade, necessidade e balanceamento, com salvaguardas.

Escopo: os tratamentos do DEVDOC para os quais o [LGPD.md](../LGPD.md) propõe o legítimo interesse. Cadastro, login e permissões ficam na execução do contrato (art. 7º, V) e não entram aqui.

| # | Tratamento | Dados |
| --- | --- | --- |
| A | Autoria e histórico dos documentos | Nome e foto do autor, datas, versões |
| B | Métricas de uso | Visitas e cópias, pseudonimizadas (SHA-256 com segredo) |
| C | Buscas sem resultado | Termo buscado, pseudonimizado |
| D | "Continue de onde parou" | Documentos abertos pela própria pessoa |
| E | Trilha de auditoria | Quem liberou, mudou ou removeu acessos e quando |

## Fase 1. Finalidade

| # | Interesse da empresa | É legítimo? | Situação concreta |
| --- | --- | --- | --- |
| A | Saber quem escreveu e quem responde por cada documento, para tirar dúvidas e manter o conteúdo atualizado | Sim, ligado à operação normal do negócio | Cada documento tem autor e responsável pela revisão |
| B | Saber quais documentos são úteis e quais estão abandonados | Sim, melhoria do serviço interno | Painel de métricas para Gestores, só com números agregados |
| C | Descobrir o que o time procura e ainda não está documentado | Sim, melhoria do serviço interno | Lista dos termos mais buscados sem resultado |
| D | Facilitar a volta a um documento aberto antes | Sim, em benefício da própria pessoa | Lista vista só pela própria pessoa |
| E | Prevenir e investigar acessos indevidos e prestar contas | Sim, segurança da informação (art. 46) | Aba Auditoria, visível só para Masters |

Nenhuma finalidade é vigiar o desempenho individual. O sistema não oferece relatório por pessoa.

## Fase 2. Necessidade

| # | Dado mínimo? | Alternativa menos invasiva |
| --- | --- | --- |
| A | Sim: nome e foto opcional | Documentos anônimos impediriam saber a quem perguntar e quem revisa |
| B | Sim: não guarda quem foi, só um código irreversível sem o segredo | O código permite contar pessoas distintas sem saber quem são; é a forma mínima |
| C | Sim: guarda o termo e um código, não a pessoa | Nenhuma: o termo é o próprio dado útil |
| D | Sim: só o documento e o horário | Nenhuma; a lista só serve à própria pessoa |
| E | Sim: ação, data e e-mail de quem foi afetado. Documento privado aparece sem título | Sem registrar o autor da ação, não há prestação de contas |

## Fase 3. Balanceamento

**Expectativa da pessoa.** Em uma base de conhecimento interna, quem trabalha na empresa espera que a autoria apareça e que o uso seja medido de forma agregada. O aviso de privacidade (`/privacidade`) informa tudo isso, com link na tela de login.

**Impacto nos direitos.** Baixo. Não há dados sensíveis, nem decisão automatizada, nem avaliação individual, nem compartilhamento com terceiros além dos operadores (Supabase e Vercel).

**Riscos e como são reduzidos (salvaguardas):**

- Pseudonimização com hash e segredo guardado fora da API.
- Retenção curta: buscas em 90 dias; visitas, cópias e histórico em 12 meses; auditoria em 5 anos.
- Acesso restrito: métricas para Gestor e acima, auditoria só para Master.
- Documentos privados não são lidos por administradores, nem aparecem com título na auditoria.
- Transparência: aviso de privacidade e "Baixar meus dados".
- Oposição: a pessoa pode pedir ao DPO, que avalia cada caso (art. 18, § 2º).

**Conclusão proposta:** o interesse legítimo da empresa prevalece, com as salvaguardas acima, para os tratamentos A a E.

## Revisão

Refazer este teste se mudar a finalidade, entrar um dado novo ou mudar a retenção. No mínimo uma vez por ano.

| Papel | Nome | Data | Assinatura |
| --- | --- | --- | --- |
| Encarregado (DPO) | | | |
| Jurídico | | | |
| Responsável pelo DEVDOC (Master) | | | |
