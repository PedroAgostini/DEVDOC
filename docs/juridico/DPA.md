# Termos de tratamento de dados (DPA) com os operadores

**Status:** roteiro para o jurídico formalizar. O DEVDOC usa dois operadores (LGPD, art. 5º, VII, e art. 39): Supabase e Vercel. Os dois oferecem um DPA padrão. A tarefa aqui é aceitar, arquivar e registrar, e decidir o que falta para a transferência internacional.

## 1. Supabase (banco, login e arquivos)

Conferido em 26/10/2026 na página oficial, https://supabase.com/legal/dpa:

- O DPA **complementa e faz parte dos Termos de Serviço** da Supabase. Vale desde o aceite dos termos, sem assinatura separada.
- Inclui as **cláusulas-padrão da União Europeia** (Decisão 2021/914, módulos 2 e 3), com adendos do Reino Unido e da Suíça. A importadora é a Supabase Pte. Ltd. (Singapura).
- Lista de suboperadores: https://supabase.com/legal/customer-resources/subprocessor-list. Mudanças são avisadas com pelo menos 30 dias. Dá para assinar o aviso nessa página.

**Passos**
1. Confirmar que a conta da Supabase está em nome da empresa (organização com e-mail corporativo), e não de uma pessoa.
2. Salvar em PDF a versão atual do DPA e da lista de suboperadores e arquivar com o jurídico.
3. Assinar o aviso de mudanças da lista de suboperadores com o e-mail do DPO.
4. Se o jurídico exigir um DPA assinado à parte, pedir ao suporte da Supabase.

## 2. Vercel (hospedagem)

**Conferir na página oficial** (não foi possível abrir durante esta revisão): https://vercel.com/legal/dpa.

- O plano gratuito (Hobby) é para uso pessoal e não comercial. Para uso da empresa, o projeto precisa estar em um time no **plano Pro** ou superior, em nome da empresa.
- Confirmar na página como o DPA se aplica ao plano contratado e salvar o PDF.
- A execução está fixada em São Paulo (`gru1`, no `vercel.json`), mas registros e suporte podem sair do Brasil.

**Passos**
1. Criar ou confirmar o time da empresa no plano Pro e mover o projeto para ele.
2. Salvar em PDF o DPA e a lista de suboperadores da Vercel e arquivar.
3. Restringir o acesso ao projeto ao time de TI (ver [SEGURANCA.md](../SEGURANCA.md)).

## 3. Google (só no login com Google)

O Google apenas confirma a identidade de quem escolhe entrar com a conta Google. Se a empresa usa Google Workspace, o aditivo de tratamento de dados do Workspace é aceito pela TI no Admin Console da empresa, nas configurações legais e de conformidade da conta. Confirmar com a TI.

## 4. Transferência internacional (ponto de decisão do jurídico)

O Regulamento de Transferência Internacional (Resolução CD/ANPD nº 19/2024) prevê, como mecanismo principal, as **cláusulas-padrão contratuais aprovadas pela ANPD**, que devem ser incorporadas aos contratos. As cláusulas da União Europeia dos DPAs acima **não substituem automaticamente** as da ANPD.

Caminhos para o jurídico avaliar:

1. **Projeto Supabase em São Paulo** (`sa-east-1`) e Vercel em `gru1`: reduz a transferência ao que os provedores fazem em suporte, registros e suboperadores, mas não a elimina.
2. **Pedir aos provedores** a incorporação das cláusulas-padrão da ANPD ao contrato.
3. **Registrar a análise de risco** se a empresa decidir seguir com os DPAs padrão, e acompanhar se a ANPD reconhecer a equivalência das cláusulas europeias.

## 5. Registro (preencher)

| Operador | Documento | Versão ou data | Aceito por | Data do aceite | Onde está arquivado |
| --- | --- | --- | --- | --- | --- |
| Supabase | DPA (parte dos Termos de Serviço) | | | | |
| Supabase | Lista de suboperadores | | | | |
| Vercel | DPA | | | | |
| Vercel | Lista de suboperadores | | | | |
| Google | Aditivo do Workspace (se houver) | | | | |
