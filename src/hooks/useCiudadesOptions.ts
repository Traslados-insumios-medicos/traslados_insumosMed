import { useEffect, useState } from "react";
import { api } from "../services/api";

import type { SelectOption } from "../components/ui/selectTypes";

export type { SelectOption };

/** Opciones de ciudades distintas registradas en clientes (para SearchableSelect). */
export function useCiudadesOptions() {
  const [options, setOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    api
      .get<string[]>("/clientes/ciudades")
      .then((r) =>
        setOptions(r.data.map((c) => ({ value: c, label: c }))),
      )
      .catch(() => {});
  }, []);

  return options;
}
