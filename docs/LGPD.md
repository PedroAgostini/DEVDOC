# DEVDOC e a LGPD

Registro das operações de tratamento de dados pessoais do DEVDOC (LGPD, art. 37) e de como cada princípio e direito é atendido. Público: jurídico e encarregado de dados (DPO).

> Este documento descreve o sistema como ele foi construído. Não é parecer jurídico. As bases legais sugeridas e os campos marcados para preencher precisam ser validados pelo jurídico ou pelo DPO da empresa.

## 1. Agentes de tratamento (preencher)

Depois de preencher aqui, copie controlador e encarregado para `src/lib/legal.ts`: o aviso de privacidade mostra esses dados automaticamente.

| Papel | Quem |
| --- | --- |
| Controlador | Empresa que disponibiliza o DEVDOC ao time |
| Encarregado (DPO) | |
| Operador: banco, login e arquivos | Supabase (região do projeto: conferir; recomendado São Paulo, `sa-east-1`) |
| Operador: hospedagem | Vercel (execução fixada em São Paulo, `gru1`) |
| Login com Google | Google, apenas para confirmar a identidade de quem escolhe entrar com Google |

## 2. Inventário de dados

Titulares: pessoas do time com acesso ao DEVDOC.

| Dado | Finalidade | Base legal proposta (art. 7) | Retenção | Quem acessa |
| --- | --- | --- | --- | --- |
| Nome, e-mail, foto (do Google ou enviada no perfil) | Identificar quem entra e a autoria | Execução de contrato (V) | Enquanto ativo; depois, até pedido de eliminação | Pessoas com acesso ao DEVDOC |
| Nível, operações, departamentos | Aplicar permissões | Execução de contrato (V) | Enquanto ativo | Pessoas com acesso; edição só por Admin e Master |
| Documentos escritos (autoria, datas, versões) | Base de conhecimento do time | Legítimo interesse (IX) | Até exclusão; lixeira de 30 dias | Conforme a visibilidade de cada documento |
| Visitas e cópias, pseudonimizadas | Métricas agregadas de uso | Legítimo interesse (IX) | 12 meses | Gestores e acima, só de forma agregada |
| Buscas sem resultado, pseudonimizadas | Descobrir o que falta documentar | Legítimo interesse (IX) | 90 dias | Gestores e acima |
| Lista de documentos abertos | "Continue de onde parou" | Legítimo interesse (IX) | 12 meses | Só a própria pessoa |
| Trilha de auditoria (quem mudou acessos) | Segurança e prestação de contas | Legítimo interesse (IX) e cumprimento de obrigação (II), art. 46 e art. 48 | 5 anos | Só Masters |
| Credenciais de login | Autenticação | Execução de contrato (V) | Enquanto a conta existir | Ninguém: só o hash bcrypt fica guardado |
| Segundo fator (app autenticador) | Verificação em duas etapas | Execução de contrato (V) e dever de segurança (art. 46) | Enquanto a conta existir; apagado na redefinição | Ninguém: o segredo fica no Supabase Auth |

**Dados sensíveis (art. 11):** o sistema não pede nenhum. Orientar o time a não registrar, nos documentos, dados pessoais de clientes ou de terceiros sem necessidade. Se for preciso, usar a visibilidade mais restrita possível.

**Por que essas bases.** Cadastro, login e permissões existem porque a pessoa trabalha para a empresa: execução do contrato de trabalho ou de prestação de serviços (V). Consentimento (I) não serve aqui, porque a relação de trabalho tira a liberdade de recusar. Autoria, métricas, buscas, histórico e auditoria não são indispensáveis ao contrato, mas atendem a um interesse legítimo da empresa com baixo impacto: o teste de balanceamento está em [juridico/LIA.md](juridico/LIA.md), para revisão e assinatura.

## 3. Princípios (art. 6) e como o sistema os atende

| Princípio | Como |
| --- | --- |
| Finalidade e adequação | Dados usados só para acesso, autoria, permissões e métricas internas |
| Necessidade | Cadastro mínimo; métricas sem identificar a pessoa (hash); retenção curta para dados de uso |
| Livre acesso | Página "Privacidade e meus dados" com o botão "Baixar meus dados" (JSON) |
| Qualidade | Admin e Master corrigem cadastro; a pessoa pede correção a eles |
| Transparência | Aviso de privacidade público em `/privacidade`, com link na tela de login |
| Segurança e prevenção | Ver [SEGURANCA.md](SEGURANCA.md): RLS em todas as tabelas, privado inacessível a administradores, cabeçalhos de segurança, auditoria |
| Não discriminação | Métricas são agregadas e não avaliam pessoas |
| Responsabilização | Trilha de auditoria, este registro e o plano de incidentes |

## 4. Direitos dos titulares (art. 18) e como atender

| Direito | Como atender |
| --- | --- |
| Confirmação e acesso | A própria pessoa baixa seus dados em Privacidade e meus dados. Visitas, cópias e buscas pseudonimizadas não podem ser ligadas a ela e por isso não entram na exportação |
| Correção | Admin ou Master edita em Administração > Pessoas |
| Anonimização, bloqueio ou eliminação | Ver procedimento abaixo |
| Portabilidade | Exportação JSON de "Baixar meus dados" e exportação dos documentos em .md e .zip |
| Informação sobre compartilhamento | Aviso de privacidade, seção "Com quem" |
| Revogação de consentimento | Não se aplica enquanto o consentimento não for a base legal; se passar a ser, desativar o acesso |

### Procedimento de eliminação

1. **Desativar** a pessoa em Administração > Pessoas, o que bloqueia o acesso na hora.
2. **Transferir** os documentos que precisam continuar para outro responsável. O Master faz isso, sem abrir o conteúdo.
3. **Excluir os documentos privados** que restarem da pessoa, se o pedido incluir esse conteúdo.
4. **Remover o cadastro.** Um Master exclui a pessoa em members, pelo SQL Editor, com `delete from public.members where email = '...'`. A auditoria registra a remoção.
5. **Remover a conta de login** em Supabase > Authentication > Users.
6. **Registrar o atendimento:** data, pedido e o que foi feito.

Registros de visitas, cópias e buscas já são pseudonimizados e expiram sozinhos (12 meses e 90 dias). A trilha de auditoria é mantida por 5 anos para prestação de contas. Justificar essa retenção com o jurídico.

## 5. Transferência internacional

O código fixa a execução na Vercel em São Paulo (`gru1`). Confirmar a região do projeto Supabase: se estiver fora do Brasil, há transferência internacional de dados. Mesmo em São Paulo, suporte, registros e suboperadores dos provedores podem estar fora do Brasil. O roteiro para aceitar e arquivar os DPAs e a decisão sobre as cláusulas-padrão da ANPD (Resolução CD/ANPD nº 19/2024) estão em [juridico/DPA.md](juridico/DPA.md).

## 6. Pendências para o jurídico e o DPO

- [ ] Preencher a seção 1: controlador, encarregado e contatos, e copiar para `src/lib/legal.ts`.
- [ ] Validar as bases legais da seção 2 e revisar e assinar o [LIA](juridico/LIA.md).
- [ ] Confirmar a região do Supabase e, se preciso, formalizar a transferência internacional.
- [ ] Revisar e aprovar o texto do aviso de privacidade (`src/app/privacidade/page.tsx`, versão 1.0) e registrar a data em `noticeApprovedOn` no `src/lib/legal.ts`.
- [ ] Aceitar, arquivar e registrar os DPAs da Supabase e da Vercel, seguindo o [roteiro](juridico/DPA.md).
- [ ] Definir a política interna sobre o que pode e o que não pode ser registrado nos documentos (dados de clientes).
- [ ] Preencher os contatos do plano de incidentes em [SEGURANCA.md](SEGURANCA.md).
