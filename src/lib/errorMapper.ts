/**
 * Maps internal database and storage errors to user-friendly messages.
 * Logs only error codes for debugging - never sensitive data.
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'Erro ao processar solicitação';
  }

  // Extract error properties
  const err = error as { code?: string; message?: string };
  const code = err.code;
  const message = err.message?.toLowerCase() || '';

  // PostgreSQL error codes
  if (code === '23505') return 'Este valor já está em uso';
  if (code === '23503') return 'Registro relacionado não encontrado';
  if (code === '42501') return 'Permissão negada';
  if (code === '22P02') return 'Formato de dados inválido';
  if (code === '23502') return 'Campo obrigatório não preenchido';
  if (code === '22003') return 'Valor numérico fora do intervalo permitido';
  if (code === '42P01') return 'Erro de configuração do sistema';
  if (code === 'PGRST') return 'Erro de comunicação com o servidor';

  // Storage-related errors
  if (message.includes('storage')) return 'Erro ao processar arquivo';
  if (message.includes('bucket')) return 'Erro ao acessar armazenamento';
  if (message.includes('upload')) return 'Erro ao enviar arquivo';

  // Auth-related errors
  if (message.includes('auth') || message.includes('permission') || message.includes('policy')) {
    return 'Permissão negada';
  }

  // Duplicate key errors
  if (message.includes('duplicate') || message.includes('unique')) {
    return 'Este valor já está em uso';
  }

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'Erro de conexão. Verifique sua internet';
  }

  // Default safe message
  return 'Erro ao processar solicitação';
}
