import Link from "next/link";

interface Item {
  key: string;
  label: string;
  value: number;
  color: string;
  href: string;
}

/** Counts as bars; each row opens the list already filtered. */
export function Bars({ items }: { items: Item[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      {items.map((i) => (
        <Link key={i.key} href={i.href} className="bar-row" style={{ "--c": i.color } as React.CSSProperties}>
          <span>{i.label}</span>
          <span className="muted tabular small" style={{ alignSelf: "center" }}>
            {i.value.toLocaleString("pt-BR")}
          </span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(i.value / max) * 100}%`, display: "block" }} />
          </span>
        </Link>
      ))}
    </div>
  );
}
