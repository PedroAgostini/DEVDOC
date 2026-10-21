import {
  BookOpen,
  Code2,
  Compass,
  FileText,
  Sparkles,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const BY_SLUG: Record<string, LucideIcon> = {
  documentacao: BookOpen,
  prompt: Sparkles,
  codigo: Code2,
  "resolucao-de-problemas": Wrench,
  processo: Workflow,
  onboarding: Compass,
};

export function CategoryIcon({ slug, size = 16 }: { slug?: string | null; size?: number }) {
  const Icon = (slug && BY_SLUG[slug]) || FileText;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
