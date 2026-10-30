/** Para onde voltar depois de entrar, quando o guard barrou alguém no meio. */
export type RedirectSearch = {
  redirect?: string
}

/**
 * Valida o `?redirect=` da tela de autenticação.
 *
 * À mão, e não com um schema Zod: a regra é de caminho (`/`, nunca `//` nem
 * `/\`), não de forma, e o `validateSearch` do roteador precisa devolver o
 * objeto limpo, sem lançar.
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
