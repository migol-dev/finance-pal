export const ErrorCodes = {
  /** Auth: session expired */
  AUTH_SESSION_EXPIRED: 'AUTH_001',
  /** Auth: token refresh failed */
  AUTH_TOKEN_REFRESH_FAILED: 'AUTH_002',
  /** Auth: sign out failed */
  AUTH_SIGNOUT_FAILED: 'AUTH_003',
  /** Auth: user not authenticated */
  AUTH_NOT_AUTHENTICATED: 'AUTH_004',
  /** Auth: email/password change failed */
  AUTH_CREDENTIAL_CHANGE_FAILED: 'AUTH_005',

  /** DB: query returned error */
  DB_QUERY_FAILED: 'DB_001',
  /** DB: insert failed */
  DB_INSERT_FAILED: 'DB_002',
  /** DB: update failed */
  DB_UPDATE_FAILED: 'DB_003',
  /** DB: delete failed */
  DB_DELETE_FAILED: 'DB_004',
  /** DB: connection error */
  DB_CONNECTION_ERROR: 'DB_005',

  /** Sync: queue processing failed */
  SYNC_PROCESS_FAILED: 'SYNC_001',
  /** Sync: mutation exhausted retries */
  SYNC_MUTATION_FAILED: 'SYNC_002',
  /** Sync: rate limited */
  SYNC_RATE_LIMITED: 'SYNC_003',

  /** Import: invalid file format */
  IMPORT_INVALID_FORMAT: 'IMP_001',
  /** Import: file too large */
  IMPORT_FILE_TOO_LARGE: 'IMP_002',
  /** Import: validation error */
  IMPORT_VALIDATION_FAILED: 'IMP_003',

  /** Export: write failed */
  EXPORT_WRITE_FAILED: 'EXP_001',
  /** Export: share failed */
  EXPORT_SHARE_FAILED: 'EXP_002',

  /** Storage: localStorage unavailable */
  STORAGE_LOCAL_UNAVAILABLE: 'STR_001',
  /** Storage: IndexedDB error */
  STORAGE_INDEXED_DB_ERROR: 'STR_002',
  /** Storage: receipt file error */
  STORAGE_RECEIPT_ERROR: 'STR_003',

  /** Session: registration failed */
  SESSION_REGISTRATION_FAILED: 'SES_001',
  /** Session: heartbeat failed */
  SESSION_HEARTBEAT_FAILED: 'SES_002',

  /** General: unknown error */
  UNKNOWN: 'GEN_000',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly originalError?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      originalError?: unknown;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = options?.severity ?? 'error';
    this.context = options?.context;
    this.timestamp = new Date().toISOString();
    this.originalError = options?.originalError;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  getUserMessage(): string {
    const messages: Partial<Record<ErrorCode, string>> = {
      [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
      [ErrorCodes.AUTH_TOKEN_REFRESH_FAILED]: 'No se pudo renovar tu sesión. Vuelve a iniciar sesión.',
      [ErrorCodes.AUTH_SIGNOUT_FAILED]: 'Ocurrió un error al cerrar sesión. Intenta de nuevo.',
      [ErrorCodes.AUTH_NOT_AUTHENTICATED]: 'Debes iniciar sesión para realizar esta acción.',
      [ErrorCodes.AUTH_CREDENTIAL_CHANGE_FAILED]: 'No se pudo cambiar tu correo o contraseña.',
      [ErrorCodes.DB_QUERY_FAILED]: 'Error al consultar los datos. Intenta de nuevo.',
      [ErrorCodes.DB_INSERT_FAILED]: 'Error al guardar los datos. Intenta de nuevo.',
      [ErrorCodes.DB_UPDATE_FAILED]: 'Error al actualizar los datos. Intenta de nuevo.',
      [ErrorCodes.DB_DELETE_FAILED]: 'Error al eliminar los datos. Intenta de nuevo.',
      [ErrorCodes.DB_CONNECTION_ERROR]: 'Error de conexión con la base de datos.',
      [ErrorCodes.SYNC_PROCESS_FAILED]: 'Error al sincronizar con la nube.',
      [ErrorCodes.SYNC_MUTATION_FAILED]: 'Error al sincronizar un cambio con la nube.',
      [ErrorCodes.SYNC_RATE_LIMITED]: 'Demasiadas solicitudes. Espera un momento.',
      [ErrorCodes.IMPORT_INVALID_FORMAT]: 'El archivo no tiene un formato válido.',
      [ErrorCodes.IMPORT_FILE_TOO_LARGE]: 'El archivo es demasiado grande (máx 20 MB).',
      [ErrorCodes.IMPORT_VALIDATION_FAILED]: 'Los datos del archivo no son válidos.',
      [ErrorCodes.EXPORT_WRITE_FAILED]: 'No se pudo escribir el archivo de exportación.',
      [ErrorCodes.EXPORT_SHARE_FAILED]: 'No se pudo compartir la exportación.',
      [ErrorCodes.STORAGE_LOCAL_UNAVAILABLE]: 'El almacenamiento local no está disponible.',
      [ErrorCodes.STORAGE_INDEXED_DB_ERROR]: 'Error al acceder al almacenamiento interno.',
      [ErrorCodes.STORAGE_RECEIPT_ERROR]: 'Error al procesar el archivo del recibo.',
      [ErrorCodes.SESSION_REGISTRATION_FAILED]: 'Error al registrar la sesión del dispositivo.',
      [ErrorCodes.SESSION_HEARTBEAT_FAILED]: 'Error al mantener la sesión activa.',
      [ErrorCodes.UNKNOWN]: 'Ocurrió un error inesperado. Intenta de nuevo.',
    };
    return messages[this.code] ?? this.message;
  }
}

export function errorFromUnknown(error: unknown, code: ErrorCode = ErrorCodes.UNKNOWN, context?: Record<string, unknown>): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(code, error.message, { originalError: error, context });
  }
  return new AppError(code, String(error), { originalError: error, context });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  code?: ErrorCode;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

const MAX_LOG_ENTRIES = 200;
const logs: LogEntry[] = [];

function addLog(level: LogLevel, message: string, code?: ErrorCode, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    code,
    context,
    timestamp: new Date().toISOString(),
  };
  logs.push(entry);
  if (logs.length > MAX_LOG_ENTRIES) logs.shift();

  const prefix = code ? `[${code}]` : '';
  if (level === 'error') {
    console.error(`${prefix} ${message}`, context ?? '');
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`, context ?? '');
  } else {
    console.log(`${prefix} ${message}`, context ?? '');
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => addLog('debug', message, undefined, context),
  info: (message: string, context?: Record<string, unknown>) => addLog('info', message, undefined, context),
  warn: (message: string, context?: Record<string, unknown>) => addLog('warn', message, undefined, context),
  error: (message: string, code?: ErrorCode, context?: Record<string, unknown>) => addLog('error', message, code, context),
  appError: (error: AppError) => addLog('error', error.message, error.code, { ...error.context, severity: error.severity }),
  getLogs: (): LogEntry[] => [...logs],
};

export function handleError(error: unknown, context?: string): AppError {
  const appError = errorFromUnknown(error, undefined, context ? { context } : undefined);
  logger.appError(appError);
  return appError;
}

export function showUserError(error: unknown): string {
  const appError = errorFromUnknown(error);
  return appError.getUserMessage();
}
