import type { EstadoGuia, EstadoRuta } from "../../types/models";

type BadgeSize = "sm" | "md";

const sizeClasses: Record<BadgeSize, string> = {
  sm: "rounded-full px-2 py-0.5 text-[10px] font-semibold",
  md: "rounded-full px-2.5 py-1 text-xs font-semibold",
};

const rutaColors: Record<string, string> = {
  EN_CURSO: "bg-emerald-100 text-emerald-700",
  COMPLETADA: "bg-slate-100 text-slate-600",
  PENDIENTE: "bg-amber-100 text-amber-700",
  CANCELADA: "bg-red-100 text-red-600",
};

const rutaLabels: Record<string, string> = {
  EN_CURSO: "En Curso",
  COMPLETADA: "Completada",
  PENDIENTE: "Pendiente",
  CANCELADA: "Cancelada",
};

const guiaColors: Record<string, string> = {
  ENTREGADO: "bg-emerald-100 text-emerald-700",
  INCIDENCIA: "bg-amber-100 text-amber-700",
  PENDIENTE: "bg-slate-100 text-slate-600",
};

function formatEstado(estado: string, uppercase: boolean) {
  const text = estado.replace(/_/g, " ");
  return uppercase ? text.toUpperCase() : text;
}

interface StatusBadgeProps {
  estado: string;
  colors: Record<string, string>;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
}

function StatusBadge({
  estado,
  colors,
  size = "md",
  uppercase = false,
  className = "",
}: StatusBadgeProps) {
  const tone = colors[estado] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap ${sizeClasses[size]} ${tone} ${className}`.trim()}
    >
      {formatEstado(estado, uppercase)}
    </span>
  );
}

export function EstadoRutaBadge({
  estado,
  size = "md",
  uppercase = false,
  className = "",
}: {
  estado: EstadoRuta | string;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
}) {
  const tone = rutaColors[estado] ?? "bg-slate-100 text-slate-600";
  let label = rutaLabels[estado] ?? formatEstado(estado, false);
  if (uppercase) label = label.toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap ${sizeClasses[size]} ${tone} ${className}`.trim()}
    >
      {label}
    </span>
  );
}

export function EstadoGuiaBadge({
  estado,
  size = "md",
  uppercase = false,
  className = "",
}: {
  estado: EstadoGuia | string;
  size?: BadgeSize;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <StatusBadge
      estado={estado}
      colors={guiaColors}
      size={size}
      uppercase={uppercase}
      className={className}
    />
  );
}
