import * as LucideIcons from "lucide-react";

export function IconPlaceholder({
  lucide,
  className,
  ...props
}) {
  const Icon = LucideIcons[lucide];

  if (!Icon) {
    return null;
  }

  return <Icon className={className} {...props} />;
}