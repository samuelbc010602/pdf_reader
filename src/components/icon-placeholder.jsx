import React from "react";
import * as Icons from "lucide-react";

export function IconPlaceholder({ name, className, ...props }) {
  // If no name is provided, show a default safe icon
  if (!name) {
    return <Icons.FileText className={`w-4 h-4 ${className || ""}`} {...props} />;
  }

  // Normalize string format (e.g. "arrow-left" -> "ArrowLeft" or check direct match)
  const cleanName = typeof name === "string" ? name.trim() : "";
  
  // Try direct lookup or pascal case conversion
  let IconComponent = Icons[cleanName];
  
  if (!IconComponent) {
    const pascalCase = cleanName
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    IconComponent = Icons[pascalCase];
  }

  // If still not found, render a clean fallback icon instead of a question mark
  if (!IconComponent) {
    return <Icons.HelpCircle className={`w-4 h-4 text-muted-foreground ${className || ""}`} {...props} />;
  }

  return <IconComponent className={`w-4 h-4 ${className || ""}`} {...props} />;
}