interface Props {
  /** sm: inline en botones; md: secciones; lg: pantalla completa */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

export function LoadingSpinner({ size = "lg", className = "" }: Props) {
  if (size === "lg") {
    return (
      <div
        className={`flex items-center justify-center py-16 ${className}`.trim()}
      >
        <span
          className={`material-symbols-outlined animate-spin text-primary ${sizeClass.lg}`}
        >
          progress_activity
        </span>
      </div>
    );
  }
  return (
    <span
      className={`material-symbols-outlined animate-spin text-primary ${sizeClass[size]} ${className}`.trim()}
    >
      progress_activity
    </span>
  );
}
