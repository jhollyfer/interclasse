/** Para onde voltar depois de entrar, quando o guard barrou alguém no meio. */
export type RedirectSearch = {
  redirect?: string
}

/**
 * Valida o `?redirect=` da tela de autenticação.
 *
 * À mão, e não com o `lib/validator.ts`: o `validateSearch` do roteador é
 * síncrono e o `validate` do VineJS devolve promessa. Nem via Standard Schema
 * dá - o roteador aceita a interface e continua exigindo resposta síncrona.
 *
 * Mora fora de `routes/` para poder ser testado sem que o gerador da árvore de
 * rotas trate o arquivo de teste como uma rota.
 */
export function validateRedirectSearch(
  search: Record<string, unknown>,
): RedirectSearch {
  const value = search.redirect

  if (typeof value !== 'string') return {}

  // Só caminho interno. `https://evil.com` é óbvio, mas `//evil.com` também é
  // navegação externa: o navegador o lê como "mesmo protocolo, outro host".
  // Sem esta linha, um link com `?redirect=` leva o usuário para fora logo
  // depois de ele digitar a senha, e a barra de endereços não denuncia nada.
  if (!value.startsWith('/') || value.startsWith('//')) return {}

  // `\` no lugar de `/` é a variação que os navegadores normalizam de volta
  // para `//`, e que passa por uma checagem feita só sobre a barra.
  if (value.startsWith('/\\')) return {}

  return { redirect: value }
}
