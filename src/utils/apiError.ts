export interface ApiValidationError {
  message?: string;
  path?: string | string[];
}

export interface ApiErrorBody {
  message?: string;
  errors?: ApiValidationError[];
}

export function getApiErrorBody(err: unknown): ApiErrorBody | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) {
    return undefined;
  }
  return (err as { response?: { data?: ApiErrorBody } }).response?.data;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorBody(err)?.message ?? fallback;
}

export function getApiErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("response" in err)) {
    return undefined;
  }
  return (err as { response?: { status?: number } }).response?.status;
}

/**
 * Clasifica errores de Axios del flujo de login en mensajes específicos
 * para el usuario, diferenciando entre errores de credenciales,
 * conectividad, timeout y errores del servidor.
 *
 * Axios expone las siguientes propiedades para errores sin respuesta HTTP:
 *   - err.code === "ERR_NETWORK"   → backend caído / sin internet
 *   - err.code === "ECONNABORTED"  → timeout de la petición
 *   - err.response === undefined   → cualquier error sin respuesta del servidor
 */
export function getLoginErrorMessage(err: unknown): {
  message: string;
  /** true si el error es de autenticación (credenciales inválidas / inactivo) */
  isAuthError: boolean;
} {
  if (typeof err !== "object" || err === null) {
    return {
      message: "Ocurrió un error inesperado. Intente nuevamente.",
      isAuthError: false,
    };
  }

  const axiosErr = err as {
    response?: { status?: number; data?: { message?: string } };
    code?: string;
    message?: string;
  };

  // Caso 1: El servidor respondió — clasificar por HTTP status
  if (axiosErr.response !== undefined) {
    const status = axiosErr.response.status;
    const backendMsg = axiosErr.response.data?.message ?? "";

    if (status === 401) {
      return {
        message: "Usuario o contraseña incorrectos.",
        isAuthError: true,
      };
    }

    if (status === 403) {
      // El caso "inactivo" lo maneja LoginPage por separado; aquí cae lo demás
      return {
        message: backendMsg || "Acceso denegado.",
        isAuthError: true,
      };
    }

    if (status !== undefined && status >= 500) {
      return {
        message: "Ocurrió un error interno del servidor. Intente más tarde.",
        isAuthError: false,
      };
    }

    // Otro status (ej. 422, 429)
    return {
      message: backendMsg || "El servidor rechazó la solicitud.",
      isAuthError: false,
    };
  }

  // Caso 2: Sin respuesta del servidor — error de red / timeout
  const code = axiosErr.code ?? "";
  const rawMessage = axiosErr.message ?? "";

  if (
    code === "ECONNABORTED" ||
    rawMessage.toLowerCase().includes("timeout")
  ) {
    return {
      message: "El servidor tardó demasiado en responder. Intente nuevamente.",
      isAuthError: false,
    };
  }

  if (
    code === "ERR_NETWORK" ||
    rawMessage.toLowerCase().includes("network error") ||
    rawMessage.toLowerCase().includes("failed to fetch")
  ) {
    return {
      message:
        "No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.",
      isAuthError: false,
    };
  }

  // Caso 3: Error inesperado sin más información
  return {
    message: "Ocurrió un error inesperado. Intente nuevamente.",
    isAuthError: false,
  };
}

