# Plano de segurança do DEVDOC

Este documento descreve como o DEVDOC protege as informações, o que precisa estar configurado nos serviços de nuvem e o que fazer se houver suspeita de vazamento. Público: TI, Masters do DEVDOC e o encarregado de dados (DPO).

## 1. Onde ficam os dados

| Camada | Serviço | O que guarda |
| --- | --- | --- |
| Aplicação | Vercel (região `gru1`, São Paulo, fixada em `vercel.json`) | Nada persistente; executa o site |
| Banco de dados | Supabase Postgres | Pessoas, documentos, permissões, métricas, auditoria |
| Login | Supabase Auth | Contas, senhas em hash (bcrypt), sessões |
| Arquivos | Supabase Storage, bucket privado `doc-images` | Imagens dos documentos |
| Código | GitHub `DEVDOC-PROD` (privado) | Código-fonte, sem segredos |

## 2. Controles implementados

### Acesso
- **Só entra quem foi liberado.** Um gatilho no banco recusa a criação de qualquer conta cujo e-mail não esteja cadastrado e ativo.
- **Desativar bloqueia na hora.** Toda permissão depende de a pessoa estar ativa, mesmo que ela ainda tenha uma sessão aberta.
- **Permissões no banco (RLS).** Todas as tabelas públicas têm Row Level Security. Quem pode ler ou editar é decidido no Postgres a cada consulta, não na interface. Verificação: nenhuma tabela pública sem RLS.
- **Privado é privado.** Documentos "Só eu" não são lidos nem por Admin nem por Master. A transferência de posse feita pelo Master não abre o conteúdo.
- **Menor privilégio no compartilhamento.** Só o autor (ou um Admin, nunca em documento privado) muda grupos, pessoas e coeditores de um documento. Coeditores editam o texto, mas não ampliam o acesso.
- **Cadastro protegido.** Cada pessoa troca só a própria foto e a senha. Nome, nível e grupos ficam com Admin e Master; o e-mail, só com Master, e a troca é registrada na auditoria.
- **Senhas fortes.** Mínimo de 10 caracteres, com minúsculas, maiúsculas e números (na tela e no serviço de login).
- **Verificação em duas etapas para todos.** Depois da senha ou do Google, todo acesso pede o código de um app autenticador (TOTP). A regra vale no banco: até a sessão chegar ao nível `aal2`, as funções de permissão tratam a pessoa como desconhecida, então uma senha roubada não lê nada, nem pela API. Quem perde o celular pede a um Admin (ou a um Master, se for Admin ou Master) para redefinir; a redefinição encerra as sessões abertas e fica na auditoria.

### Dados
- **Pseudonimização com hash.** Visitas, cópias e buscas sem resultado não guardam quem foi. Guardam um SHA-256 do identificador da pessoa somado a um segredo aleatório de 256 bits, que fica no schema `private` e não é acessível pela API. Sem o segredo, o hash não pode ser revertido nem ligado à pessoa.
- **Senhas** nunca passam pelo código do DEVDOC em texto guardado: o Supabase Auth armazena só o hash bcrypt.
- **Retenção mínima** (limpeza diária automática): buscas sem resultado em 90 dias; visitas e cópias em 12 meses; histórico de "continue de onde parou" em 12 meses; auditoria em 5 anos; lixeira em 30 dias.
- **Fotos de perfil** ficam no bucket privado `avatars`: só membros veem, e cada pessoa só envia ou apaga a própria. O banco recusa como foto qualquer link externo, o que impede imagens de rastreamento.
- **Imagens protegidas.** O bucket é privado; cada imagem só é entregue a quem pode ler o documento dela. Apenas PNG, JPG, WEBP e GIF, até 10 MB. SVG é recusado, porque pode carregar script.

### Aplicação
- **Sem HTML no markdown.** O leitor não interpreta HTML bruto, e links `javascript:` são descartados, o que impede XSS pelo conteúdo dos documentos.
- **Cabeçalhos de segurança** em todas as páginas: Content Security Policy (só scripts do próprio site, nada de iframes), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Sem scripts de terceiros.** As fontes são servidas pelo próprio site e a compressão de imagens roda localmente, sem baixar código de CDN.
- **Redirecionamento seguro** depois do login: só caminhos do próprio site, nunca `//outro-site`.
- **Ações do servidor** protegidas contra CSRF pela verificação de origem do Next.js.
- **Chave de serviço** (`SUPABASE_SERVICE_ROLE_KEY`) usada só no servidor, em um módulo que não pode ser importado pelo navegador.
- **Dependências** auditadas com `pnpm audit --prod`; o `postcss` interno do Next.js foi forçado para a versão corrigida.

### Rastreabilidade
- **Trilha de auditoria**, visível só para Masters e sem possibilidade de edição. Ela registra:
  - acesso liberado, desativado ou reativado, e mudanças de nível;
  - operações e departamentos atribuídos ou removidos;
  - mudança de visibilidade e compartilhamentos com pessoas e grupos;
  - coedição, transferência de posse, lixeira, restauração e exclusão.

  Documentos privados aparecem sem título.

## 3. Configuração obrigatória na nuvem

Itens que dependem dos painéis e não ficam no código. Conferir antes de liberar o acesso ao time e revisar a cada trimestre.

**Supabase**
- [ ] Região do projeto em São Paulo (`sa-east-1`). Se não estiver, avaliar migração ou registrar a transferência internacional no [LGPD.md](LGPD.md).
- [ ] Authentication > Sign In / Providers > E-mail: senha mínima de 10 caracteres, com minúsculas, maiúsculas e números.
- [ ] Ativar a proteção contra senhas vazadas (Leaked Password Protection), disponível no plano Pro.
- [ ] Authentication > Multi-Factor: app autenticador (TOTP) ativado para cadastro e verificação. O DEVDOC exige o segundo fator de todos; sem isso ativo, ninguém consegue entrar.
- [ ] URL Configuration: Site URL e Redirect URLs apenas com o domínio oficial.
- [ ] SMTP próprio da empresa para os e-mails de convite e acesso.
- [ ] Database > Extensions: `pg_cron` ativo (limpeza da lixeira e retenção).
- [ ] Backups diários ativos; no plano Pro, considerar o Point-in-Time Recovery.
- [ ] Nunca compartilhar a chave `service_role/secret`; ela fica só na Vercel.

**Vercel**
- [ ] Variáveis `SUPABASE_SERVICE_ROLE_KEY` e as demais só nos ambientes necessários. A chave de serviço nunca com prefixo `NEXT_PUBLIC_`.
- [ ] Domínio com HTTPS (automático) e redirecionamento de `http` para `https`.
- [ ] Acesso ao projeto restrito ao time de TI.

**GitHub**
- [ ] `DEVDOC-PROD` privado, com proteção da branch `main`.
- [ ] Secret scanning e Dependabot ativos.
- [ ] O repositório público de portfólio nunca recebe arquivos `.env`. O `.gitignore` já bloqueia `.env*` e `supabase/.temp`.

## 4. Gestão de acessos

- **Entrada:** Admin libera o acesso com o nível mínimo necessário e só as operações e departamentos da pessoa.
- **Mudança de função:** ajustar nível, operações e departamentos no mesmo dia.
- **Saída:**
  1. Desativar no mesmo dia, o que bloqueia o acesso na hora.
  2. O Master transfere os documentos.
  3. Se for pedida a eliminação dos dados, remover o cadastro e a conta de login, conforme o [LGPD.md](LGPD.md).
- **Revisão trimestral:** Master revisa a lista de Admins e Masters, as pessoas desativadas e a aba Auditoria.

## 5. Resposta a incidente de vazamento

Considere incidente qualquer suspeita de acesso indevido, perda ou exposição de dados: chave publicada por engano, conta comprometida, documento sensível compartilhado com quem não devia, entre outros.

| Fase | O que fazer | Responsável |
| --- | --- | --- |
| 1. Detectar e registrar | Anotar o que foi visto, quando e por quem. Não apagar evidências. | Quem percebeu |
| 2. Conter (primeiras horas) | Desativar as contas envolvidas no DEVDOC. Se um celular com o app autenticador foi perdido ou roubado, usar "Redefinir verificação em duas etapas" em Administração > Pessoas. Encerrar sessões (Supabase > Authentication > Users > Sign out, ou excluir as linhas do usuário em `auth.sessions`). Se uma chave vazou, girar as chaves de API do Supabase e atualizar a Vercel. Mudar a visibilidade de documentos expostos. | Master + TI |
| 3. Avaliar | Usar a aba Auditoria e os logs do Supabase (Logs > Auth, API, Postgres) para saber o que foi acessado, por quem e desde quando. Classificar os dados afetados e o risco aos titulares. | TI + DPO |
| 4. Comunicar | Se houver risco ou dano relevante aos titulares, comunicar a ANPD e os titulares afetados (LGPD art. 48). O Regulamento de Comunicação de Incidente (Resolução CD/ANPD nº 15/2024) prevê prazo de 3 dias úteis a partir do conhecimento do incidente. Confirmar prazos e conteúdo com o jurídico. | DPO + jurídico |
| 5. Corrigir | Remover a causa: corrigir permissão, código ou configuração. Restaurar dados de backup se preciso. | TI |
| 6. Aprender | Registrar o incidente, a causa e as medidas tomadas. Guardar o registro por, no mínimo, 5 anos. | DPO |

### Contatos (preencher)

| Papel | Nome | Contato |
| --- | --- | --- |
| Encarregado (DPO) | | |
| Master do DEVDOC (titular) | | |
| Master do DEVDOC (substituto) | | |
| TI responsável pela Vercel e pelo Supabase | | |

### Rotação de segredos

1. No Supabase, em Project Settings > API Keys, gerar novas chaves e revogar as antigas.
2. Atualizar na Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` e fazer um novo deploy.
3. Atualizar o `.env.production.local` de quem administra os scripts.
4. Conferir na aba Auditoria e nos logs se houve uso após a rotação.

## 6. Verificações periódicas

- **A cada mudança de dependências:** `pnpm audit --prod`.
- **A cada nova tabela:** confirmar que ela tem RLS. Consulta no SQL Editor: `select tablename from pg_tables where schemaname = 'public' and not rowsecurity;` deve voltar vazia.
- **Trimestral:** revisar a seção 3, os acessos (seção 4) e a aba Auditoria.
