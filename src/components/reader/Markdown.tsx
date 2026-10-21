import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { slugify } from "@/lib/markdown";
import { CodeBlock } from "./CodeBlock";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** Wraps {{variables}} outside code in a styled token. */
function rehypeVariables() {
  const VAR = /\{\{\s*[^{}\n]{1,60}?\s*\}\}/g;
  function walk(node: HastNode) {
    if (!node.children) return;
    if (node.tagName === "code" || node.tagName === "pre") return;
    const out: HastNode[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value && VAR.test(child.value)) {
        VAR.lastIndex = 0;
        let last = 0;
        for (const m of child.value.matchAll(VAR)) {
          if (m.index! > last) out.push({ type: "text", value: child.value.slice(last, m.index) });
          out.push({
            type: "element",
            tagName: "span",
            properties: { className: ["var-token"] },
            children: [{ type: "text", value: m[0] }],
          });
          last = m.index! + m[0].length;
        }
        if (last < child.value.length) out.push({ type: "text", value: child.value.slice(last) });
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  }
  return (tree: HastNode) => walk(tree);
}

const components: Components = {
  pre({ node, children }) {
    const code = (node as unknown as HastNode)?.children?.find((c) => c.tagName === "code");
    const classes = (code?.properties?.className as string[] | undefined) ?? [];
    const lang = classes.find((c) => c.startsWith("language-"))?.slice(9);
    const inner =
      children && typeof children === "object" && "props" in (children as React.ReactElement)
        ? (children as React.ReactElement<{ children: React.ReactNode }>).props.children
        : children;
    return (
      <CodeBlock language={lang} text={textOf(code).replace(/\n$/, "")}>
        <code>{inner}</code>
      </CodeBlock>
    );
  },
  h2({ node, children }) {
    return <h2 id={slugify(textOf(node as unknown as HastNode))}>{children}</h2>;
  },
  h3({ node, children }) {
    return <h3 id={slugify(textOf(node as unknown as HastNode))}>{children}</h3>;
  },
  a({ href, children }) {
    const external = href?.startsWith("http");
    const internal = href?.startsWith("/d/");
    return (
      <a
        href={href}
        className={internal ? "doc-link" : undefined}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  img({ src, alt }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />;
  },
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }], rehypeVariables]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
