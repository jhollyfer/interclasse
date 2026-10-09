/**
 * A página de referência da API.
 *
 * O Scalar entra pelo bundle standalone da CDN, pinado por versão. Instalar
 * `@scalar/api-reference` como dependência traria uma árvore de frontend para
 * dentro do build do backend só para servir um `<script>`, e o `node ace build`
 * teria de aprender a copiá-la.
 *
 * A versão é pinada de propósito: `@latest` faria a documentação mudar de
 * comportamento sem nenhum commit no repositório.
 */

const SCALAR_VERSION = '1.64.0'

const CDN = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`

/**
 * O chrome da interface fica em inglês: o Scalar traduz para `en`, `ru`, `es`,
 * `fr`, `de`, `zh-CN` e `ar`, e português não está na lista. O conteúdo -
 * resumo, descrição e mensagem de erro - é em português, que é o que importa.
 */
export function scalarPage(specUrl: string, title: string): string {
  const configuration = JSON.stringify({
    url: specUrl,
    theme: 'default',
    hideDownloadButton: false,
    // `components.schemas` existe para as operações referenciarem e para quem
    // gera cliente tipado. Como seção de menu ele só convida a ler a API pelo
    // formato dos dados, que é o oposto do que esta documentação descreve - o
    // contrato é a operação, não a entidade.
    hideModels: true,
  })

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${CDN}"></script>
    <script>
      Scalar.createApiReference('#app', ${configuration})
    </script>
  </body>
</html>
`
}
