import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { getMe } from "@/lib/data";
import { fullDay } from "@/lib/format";
import { LEGAL } from "@/lib/legal";

export const metadata = { title: "Privacidade e seus dados" };

const RETENTION = [
  ["Cadastro (nome, e-mail, foto, nível, operações, departamentos)", "Enquanto a pessoa tiver acesso. Depois de desativada, até a exclusão pedida ao Master"],
  ["Documentos que você escreve", "Até você ou um responsável excluir. Na lixeira, 30 dias"],
  ["Visitas e cópias (pseudonimizadas)", "12 meses"],
  ["Lista de documentos que você abriu (continue de onde parou)", "12 meses"],
  ["Buscas que não acharam nada (pseudonimizadas)", "90 dias"],
  ["Trilha de auditoria de acessos e permissões", "5 anos"],
];

export default async function PrivacyPage() {
  const me = await getMe();
  const { controller, dpo } = LEGAL;
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px 96px" }}>
      <Link href={me ? "/" : "/login"} className="btn btn-quiet btn-sm" style={{ marginLeft: -12 }}>
        <ArrowLeft size={16} /> {me ? "Voltar ao DEVDOC" : "Voltar ao login"}
      </Link>

      <article className="glass panel" style={{ marginTop: 16, padding: "clamp(24px, 4vw, 48px)" }}>
        <h1 className="display" style={{ fontSize: "clamp(32px, 4vw, 44px)" }}>Privacidade e seus dados</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          Como o DEVDOC trata dados pessoais, em linguagem direta, conforme a Lei Geral de Proteção de Dados (Lei
          13.709/2018).
        </p>

        {me && (
          <div className="notice" style={{ marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 220 }}>
              Você pode baixar, a qualquer momento, uma cópia dos dados pessoais que o DEVDOC guarda sobre você.
            </span>
            <a className="btn btn-primary btn-sm" href="/api/meus-dados" download>
              <Download size={16} /> Baixar meus dados
            </a>
          </div>
        )}

        <div className="prose" style={{ marginTop: 32 }}>
          <h2>Quem trata os dados</h2>
          {controller.name ? (
            <p>
              A controladora dos dados é <strong>{controller.name}</strong>
              {controller.cnpj && <>, CNPJ {controller.cnpj}</>}
              {controller.address && <>, com sede em {controller.address}</>}, empresa que disponibiliza o DEVDOC ao time.
            </p>
          ) : (
            <p>A empresa que disponibiliza o DEVDOC ao time é a controladora dos dados.</p>
          )}
          {dpo.name || dpo.email ? (
            <p>
              Encarregado de proteção de dados (DPO): {dpo.name && <strong>{dpo.name}</strong>}
              {dpo.name && dpo.email && ", "}
              {dpo.email && <a href={`mailto:${dpo.email}`}>{dpo.email}</a>}. Dúvidas e pedidos sobre seus dados vão para
              ele, ou para um Master do DEVDOC, que encaminha.
            </p>
          ) : (
            <p>
              Dúvidas e pedidos sobre seus dados vão para o encarregado de proteção de dados (DPO) indicado pela empresa,
              ou para um Master do DEVDOC, que encaminha.
            </p>
          )}

          <h2>Quais dados</h2>
          <ul>
            <li><strong>Cadastro:</strong> nome, e-mail, foto do Google (se você entrar com Google), nível de acesso, operações e departamentos.</li>
            <li><strong>Conteúdo:</strong> os documentos que você escreve, com autoria, datas e versões.</li>
            <li><strong>Uso:</strong> visitas e cópias de documentos e buscas sem resultado. Esses registros guardam um código irreversível no lugar da sua identidade (pseudonimização com hash SHA-256 e segredo), e só servem para números agregados.</li>
            <li><strong>Acesso:</strong> quem liberou ou mudou permissões, guardado na trilha de auditoria.</li>
          </ul>
          <p>O DEVDOC não pede dados sensíveis. Não registre dados pessoais de clientes ou terceiros nos documentos sem necessidade.</p>

          <h2>Para que</h2>
          <ul>
            <li>Dar acesso só a quem foi liberado e aplicar quem pode ver cada documento.</li>
            <li>Mostrar autoria, histórico de versões e responsáveis pela revisão.</li>
            <li>Gerar métricas agregadas de uso para manter a documentação útil.</li>
            <li>Investigar e responder a incidentes de segurança.</li>
          </ul>

          <h2>Com base em quê</h2>
          <ul>
            <li><strong>Cadastro, login e permissões:</strong> execução do contrato de trabalho ou de prestação de serviços com você (LGPD, art. 7º, V).</li>
            <li><strong>Documentos, métricas de uso e buscas sem resultado:</strong> legítimo interesse da empresa em manter a base de conhecimento útil (art. 7º, IX), com dados pseudonimizados e retenção curta.</li>
            <li><strong>Trilha de auditoria:</strong> legítimo interesse e o dever de manter medidas de segurança (art. 7º, IX, e art. 46).</li>
          </ul>

          <h2>Com quem</h2>
          <p>
            Os dados ficam em provedores contratados pela empresa, que atuam como operadores: Supabase (banco de dados,
            login e arquivos) e Vercel (hospedagem do site). Se você entrar com Google, o Google confirma sua
            identidade. Os dados não são vendidos nem compartilhados para outros fins. Esses provedores podem tratar
            parte dos dados fora do Brasil, sempre com contratos que exigem o mesmo nível de proteção da LGPD.
          </p>

          <h2>Segurança</h2>
          <ul>
            <li>Senhas nunca são guardadas em texto: o serviço de login guarda só o hash (bcrypt).</li>
            <li>Todo acesso pede um segundo fator: o código de um app autenticador no seu celular.</li>
            <li>Quem pode ver cada documento é verificado no próprio banco de dados, em toda leitura.</li>
            <li>Documentos privados não são lidos nem por administradores.</li>
            <li>Conexões sempre criptografadas (HTTPS) e imagens servidas só para quem pode ver o documento.</li>
          </ul>

          <h2>Por quanto tempo</h2>
          <table>
            <thead>
              <tr>
                <th>Dado</th>
                <th>Prazo</th>
              </tr>
            </thead>
            <tbody>
              {RETENTION.map(([what, when]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td>{when}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Seus direitos</h2>
          <p>Pelo artigo 18 da LGPD, você pode:</p>
          <ul>
            <li>Confirmar que tratamos seus dados e acessar uma cópia (botão “Baixar meus dados”, acima).</li>
            <li>Corrigir dados incompletos ou desatualizados (peça a um Admin ou Master).</li>
            <li>Pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários.</li>
            <li>Saber com quem os dados são compartilhados e revogar consentimentos, quando for o caso.</li>
          </ul>
          <p>
            Pedidos são respondidos pelo encarregado (DPO) da empresa. Documentos que fazem parte do trabalho do time
            podem ser mantidos e transferidos para outro responsável, sem expor seu conteúdo privado.
          </p>

          <h2>Mudanças</h2>
          <p>Este aviso pode ser atualizado. Mudanças relevantes são comunicadas ao time.</p>
          <p className="muted small">
            Versão {LEGAL.noticeVersion}
            {LEGAL.noticeApprovedOn && <>, de {fullDay(LEGAL.noticeApprovedOn)}</>}.
          </p>
        </div>
      </article>
    </main>
  );
}
