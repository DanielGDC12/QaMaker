/**
 * Restrição de domínio da Agência FG.
 *
 * O e-mail vem do ID token assinado pela Google, então confiar no claim
 * `email` é seguro. NÃO dependemos do claim `hd`. Esta verificação é a fonte
 * única de verdade e é aplicada no login (callback) E em toda requisição
 * autenticada (proxy + route handlers).
 */
export const FG_DOMAIN = "@agenciafg.com.br";

export function isAgenciaFGEmail(
  email: string | null | undefined
): email is string {
  if (!email) return false;
  return email.toLowerCase().endsWith(FG_DOMAIN);
}
