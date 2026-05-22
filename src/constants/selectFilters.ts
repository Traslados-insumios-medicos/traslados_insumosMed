import type { SelectOption } from "../components/ui/selectUi";

export const ESTADO_RUTA_FILTER_OPTIONS: SelectOption[] = [
  { value: "", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CURSO", label: "En Curso" },
  { value: "COMPLETADA", label: "Completada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const TIPO_CLIENTE_FILTER_OPTIONS: SelectOption[] = [
  { value: "", label: "Todos" },
  { value: "PRINCIPAL", label: "Principales" },
  { value: "SECUNDARIO", label: "Secundarios" },
];
