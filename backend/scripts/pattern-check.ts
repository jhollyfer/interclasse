/**
 * Cobra as convencoes de `_padroes/backend.md` e `_padroes/arquitetura.md` que o ESLint nao alcanca.
 *
 * O ESLint ja cobra as quatro regras de escrita (ternario, `any`, `as`,
 * `interface`) e a proibicao de `new` em servico. O que sobra e o que depende de
 * saber *onde* o arquivo esta e *como ele se chama* — nome de classe derivado do
 * caminho, camada que nao pode importar outra, envelope de paginacao, escopo de
 * soft delete. Regra de lint nao resolve isso sem inventar um plugin; um script
 * de 300 linhas resolve.
 *
 * Cada regra aponta a secao da regua que a origina, para que a mensagem de erro
 * leve a decisao junto e nao so ao sintoma. O que e deste projeto - isencoes
 * nomeadas, chaves de ambiente fora do leitor, arquivos de FORMA - mora em
 * `scripts/pattern-check.config.json`.
 *
 * Uso:
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts            # reprova
 *   node --import @poppinss/ts-exec scripts/pattern-check.ts --report   # so mede
 */

import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'

type Achado = {
  arquivo: string
  linha: number
  regra: string
  secao: string
  mensagem: string
}

const RAIZ = resolve(dirname(new URL(import.meta.url).pathname), '..')

/** Uma entrada de `newAllowlist` da config. */
type EntradaNew = {
  /** O simbolo construido com `new`. */
  simbolo: string
  /** Onde o uso vive. Aceita `**` e `*`. */
  arquivo: string
  /** Por que aquele `new` e legitimo. */
  motivo: string
}

type Config = {
  /** Chave que nunca passa por `env.get()`, com o motivo. Secao 6. */
  envForaDoLeitor: Record<string, string>
  newAllowlist: EntradaNew[]
  softDeleteExempt: string[]
  forma: string[]
}

const CONFIG: Config = JSON.parse(
  await readFile(join(RAIZ, 'scripts/pattern-check.config.json'), 'utf8')
)

/** Diretorios que a regua exige mesmo vazios. Secao 1.1. */
const DIRETORIOS_OBRIGATORIOS = [
  'app/core',
  'app/features',
  'app/exceptions',
  'app/models',
  'app/services',
  'app/middleware',
  'app/guards',
  'app/policies',
]

const IGNORADOS = new Set(['node_modules', 'build', '.adonisjs', 'tmp', '.git', 'coverage'])

async function arquivosTs(dir: string): Promise<string[]> {
  const encontrados: string[] = []
  let entradas
  try {
    entradas = await readdir(dir, { withFileTypes: true })
  } catch {
    return encontrados
  }

  for (const entrada of entradas) {
    if (IGNORADOS.has(entrada.name)) continue
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      encontrados.push(...(await arquivosTs(caminho)))
      continue
    }
    if (entrada.name.endsWith('.ts')) encontrados.push(caminho)
  }

  return encontrados
}

/**
 * Remove comentario de linha e de bloco antes de casar padrao. Sem isto, todo
 * exemplo dentro de um JSDoc — e este projeto tem muitos — viraria violacao.
 */
function semComentarios(fonte: string): string {
  const semBloco = fonte.replace(/\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
  return semBloco.replace(/(^|[^:])\/\/.*$/gm, (_casado, prefixo: string) => prefixo)
}

function linhaDe(fonte: string, indice: number): number {
  return fonte.slice(0, indice).split('\n').length
}

/** `paginate.controller.ts` -> `Paginate`. */
function verboDoArquivo(arquivo: string): string {
  const nome = basename(arquivo).replace(/\.(controller|use-case)\.ts$/, '')
  return nome
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('')
}

/** `certification-grants` -> `certificationGrants`. */
function camel(segmento: string): string {
  const partes = segmento.split('-')
  return partes[0] + partes.slice(1).map(pascal).join('')
}

/** `course-modules` -> `CourseModules`. */
function pascal(segmento: string): string {
  return segmento
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('')
}

/**
 * O singular provavel de um segmento de diretorio.
 *
 * Heuristica, e assumida como tal: e por isso que ela nao decide sozinha - a
 * regra aceita o segmento com e sem ela.
 */
function singular(segmento: string): string {
  if (segmento.endsWith('ies')) return `${segmento.slice(0, -3)}y`
  if (/(sses|shes|ches)$/.test(segmento)) return segmento.slice(0, -2)
  if (segmento.endsWith('s') && !segmento.endsWith('ss')) return segmento.slice(0, -1)
  return segmento
}

/**
 * Os nomes que o caminho autoriza: um com o ultimo diretorio como esta no disco,
 * outro com ele no singular. Fora de `app/features/` nao ha caminho de onde
 * derivar, e a regra nao se aplica.
 */
function nomesDerivados(relativo: string, sufixo: string): string[] {
  const dentro = relativo.split('app/features/')[1]
  if (dentro === undefined) return []

  const partes = dentro.split('/')
  // A pasta da acao repete o verbo e nao entra no nome da classe:
  // `administrator/users/archive/archive.controller.ts` -> `AdministratorUserArchiveController`.
  const pasta = partes[partes.length - 2]
  const arquivo = basename(relativo).replace(/\.(controller|use-case)\.ts$/, '')
  let dirs = partes.slice(0, -1)
  if (pasta === arquivo) dirs = partes.slice(0, -2)
  if (dirs.length === 0) return []

  const verbo = verboDoArquivo(relativo)
  const literal = dirs.map(pascal).join('')
  const ultimo = dirs.length - 1
  const comSingular = dirs
    .map((d, i) => {
      if (i === ultimo) return pascal(singular(d))
      return pascal(d)
    })
    .join('')

  return [...new Set([`${literal}${verbo}${sufixo}`, `${comSingular}${verbo}${sufixo}`])]
}

type Regra = {
  nome: string
  secao: string
  /** Casa no fonte ja sem comentarios. */
  padrao: RegExp
  mensagem: string
  /** Quando presente, a regra so roda nos arquivos cujo caminho casa. */
  escopo?: RegExp
}

const REGRAS: Regra[] = [
  {
    nome: 'policy-fora-do-bouncer',
    secao: '4.6',
    // A policy e checada pelo controller com `ctx.bouncer.with(Policy)`; o caso
    // de uso recebe o registro ja autorizado e nao conhece policy nenhuma.
    escopo: /\.use-case\.ts$/,
    padrao: /from\s+'#policies\//,
    mensagem:
      'policy nao entra no caso de uso: o controller checa com `ctx.bouncer.with(Policy).authorize(...)`',
  },
  {
    nome: 'policy-injetada',
    secao: '4.6',
    escopo: /app\/(?:features|services|middleware)\//,
    padrao: /\bprivate\s+readonly\s+\w+\s*:\s*\w+Policy\b/,
    mensagem:
      'policy nao se injeta nem se chama direto; o unico caminho e `ctx.bouncer` (authorize/allows/denies/execute)',
  },
  {
    nome: 'vine-fora-do-core',
    secao: '4.4',
    // O `vine` configurado (mensagens pt-BR, transform de data) sai de
    // `#core/validator`; importar a lib direto pula essa configuracao.
    escopo: /^(?!app\/core\/validator\.ts$)(?:app|start|database|commands|tests)\//,
    padrao: /from\s+'@vinejs\/vine'/,
    mensagem: 'importe `vine` (e `Infer`) de `#core/validator`, nunca de `@vinejs/vine`',
  },
  {
    nome: 'validator-fora-do-recurso',
    secao: '4.4',
    // `app/core/` fica de fora: `response.ts` declara em VineJS o contrato de
    // resposta que nao deriva de model, e isso nao e validator de entrada.
    escopo: /^app\/(?!core\/).*(?<!\.validator)\.ts$/,
    padrao: /\bvine\.create\(/,
    mensagem:
      'validator mora em `app/features/<modulo>/<recurso>/<recurso>.validator.ts` (ou e global em `app/core/validator.ts`)',
  },
  {
    nome: 'serializer-de-contexto',
    secao: '4.5',
    padrao: /\b(?:ctx|context)\.serialize\b/,
    mensagem:
      '`context.serialize` foi removido junto com o `api_provider`; o envelope e `{ meta, data }` montado no caso de uso',
  },
  {
    nome: 'paginacao-constante-local',
    secao: '4.5',
    escopo: /app\/features\//,
    padrao: /^\s*const\s+(?:PAGE|PER_PAGE)\s*=/m,
    mensagem: 'default de paginacao nao se redeclara por caso de uso',
  },
  {
    nome: 'actor-como-id',
    secao: '4.3',
    escopo: /\.use-case\.ts$/,
    padrao: /\bactor\s*:\s*string\b/,
    mensagem: '`actor` e o objeto `User`, nao o id — a policy recebe (actor, target)',
  },
  {
    nome: 'throw-em-use-case',
    secao: '4.2',
    escopo: /\.use-case\.ts$/,
    padrao: /^(?!.*\/\/).*?\bthrow\s+HTTPException\./m,
    mensagem: 'falha de negocio e `left(HTTPException...)`, nunca `throw`',
  },
  {
    nome: 'core-importa-camada-acima',
    secao: '1.3',
    escopo: /app\/core\//,
    padrao: /from\s+'#(?:features|services)\//,
    mensagem: '`app/core/` nao importa de features nem de services',
  },
  {
    nome: 'service-importa-feature',
    secao: '1.3',
    escopo: /app\/services\//,
    // `#features/_shared.<tema>` fica de fora: e o lugar declarado da funcao pura
    // compartilhada, e importa-la nao acopla o service a nenhuma feature. O que a
    // regra recusa e depender de um modulo — `#features/administrator/...`.
    padrao: /from\s+'#features\/(?!_shared\.)/,
    mensagem: '`app/services/` nao importa de um modulo de features (so de `_shared.<tema>`)',
  },
]

function aplicarRegras(relativo: string, fonte: string): Achado[] {
  const achados: Achado[] = []
  const limpo = semComentarios(fonte)

  for (const regra of REGRAS) {
    if (regra.escopo !== undefined && !regra.escopo.test(relativo)) continue
    const casado = regra.padrao.exec(limpo)
    if (casado === null) continue
    achados.push({
      arquivo: relativo,
      linha: linhaDe(limpo, casado.index),
      regra: regra.nome,
      secao: regra.secao,
      mensagem: regra.mensagem,
    })
  }

  return achados
}

/**
 * A classe exportada deriva do caminho inteiro, e nao so do verbo.
 *
 * O sufixo sozinho deixava passar o que mais aparecia: `EnrollmentUpdateController`
 * num arquivo de `administrator/enrollments/` termina em `UpdateController` e
 * mesmo assim perde o modulo. Sem o modulo o nome nao diz de qual grupo de rota a
 * classe e - e `administrator/enrollments` e `storefront/enrollments` sao dois
 * casos de uso diferentes sobre a mesma tabela, com autorizacao diferente.
 *
 * A singularizacao continua sendo heuristica, e por isso ela **nao decide**: a
 * regra aceita tanto o segmento como esta no disco quanto a forma singular dele.
 * As duas derivam do caminho de forma deterministica; qual das duas o projeto usa
 * e escolha de estilo, e nenhuma delas permite esquecer o modulo.
 */
function conferirNomeDeClasse(relativo: string, fonte: string): Achado[] {
  const ehController = relativo.endsWith('.controller.ts')
  const ehUseCase = relativo.endsWith('.use-case.ts')
  if (!ehController && !ehUseCase) return []
  if (relativo.includes('.spec.')) return []

  const limpo = semComentarios(fonte)
  const declaracao = /export\s+default\s+class\s+([A-Za-z0-9_]+)/.exec(limpo)
  if (declaracao === null) return []

  const nome = declaracao[1]
  let sufixo = 'UseCase'
  if (ehController) sufixo = 'Controller'

  const aceitos = nomesDerivados(relativo, sufixo)
  if (aceitos.length === 0) return []
  if (aceitos.includes(nome)) return []

  return [
    {
      arquivo: relativo,
      linha: linhaDe(limpo, declaracao.index),
      regra: 'nome-de-classe',
      secao: '3',
      mensagem: `classe \`${nome}\` deveria ser \`${aceitos.join('` ou `')}\`, derivado do caminho`,
    },
  ]
}

/**
 * Acao e pasta, sempre: `<recurso>/<acao>/<acao>.{controller,use-case,spec}.ts`
 * (_padroes/arquitetura.md §3). E onde a spec da acao mora e onde quem procura
 * "arquivar usuario" encontra tudo.
 */
function conferirPastaDaAcao(relativo: string): Achado[] {
  if (!relativo.startsWith('app/features/')) return []
  const casado = /([a-z-]+)\.(?:controller|use-case)\.ts$/.exec(relativo)
  if (casado === null) return []
  if (basename(dirname(relativo)) === casado[1]) return []

  return [
    {
      arquivo: relativo,
      linha: 1,
      regra: 'acao-fora-de-pasta',
      secao: 'arquitetura 3',
      mensagem: `mova para \`${dirname(relativo)}/${casado[1]}/${basename(relativo)}\``,
    },
  ]
}

/**
 * Uma feature nao importa de outra (secao 1.3): o compartilhado vai para
 * `_shared.<tema>` ou para um service. O dono de um arquivo e o recurso -
 * `administrator/users` -, ou o modulo quando ele e o proprio recurso
 * (`account`, `storages`).
 */
function conferirImportEntreFeatures(relativo: string, fonte: string): Achado[] {
  if (!relativo.startsWith('app/features/')) return []
  const partes = relativo.slice('app/features/'.length).split('/')
  if (partes.length < 2) return []

  let dono = partes.slice(0, -1)
  const pasta = dono[dono.length - 1]
  const arquivo = basename(relativo).replace(/\.(controller|use-case|validator)\.ts$/, '')
  if (pasta === arquivo && !relativo.endsWith('.validator.ts')) dono = dono.slice(0, -1)
  const prefixo = `${dono.join('/')}/`

  const achados: Achado[] = []
  const limpo = semComentarios(fonte)
  for (const casado of limpo.matchAll(/from\s+'#features\/([^']+)'/g)) {
    const alvo = casado[1] ?? ''
    if (alvo.includes('_shared.')) continue
    if (`${alvo}/`.startsWith(prefixo)) continue
    achados.push({
      arquivo: relativo,
      linha: linhaDe(limpo, casado.index),
      regra: 'feature-importa-feature',
      secao: '1.3',
      mensagem: `\`${dono.join('/')}\` importa \`#features/${alvo}\`; o compartilhado vai para \`_shared.<tema>\` ou service`,
    })
  }
  return achados
}

/** Model em `app/models/` usa kebab-case. Secao 3. */
function conferirNomeDeModel(relativo: string): Achado[] {
  if (!relativo.startsWith('app/models/')) return []
  if (!basename(relativo).includes('_')) return []
  const sugerido = basename(relativo).replace(/_/g, '-')
  return [
    {
      arquivo: relativo,
      linha: 1,
      regra: 'model-snake-case',
      secao: '3',
      mensagem: `model usa kebab-case: renomeie para \`${sugerido}\``,
    },
  ]
}

/**
 * Toda chave lida por `env.get()` e declarada no schema, e vice-versa. Secao 6.
 *
 * Chave declarada que nenhum codigo le e chave morta, e sai. A excecao e o que
 * nunca passa pelo leitor - `PORT` e `HOST` (lidas por `@adonisjs/core`),
 * `NODE_ENV` e `TZ` -, listado em `envForaDoLeitor` da config com o motivo.
 *
 * A leitura ignora comentario: um bloco de driver comentado em `config/` nao e
 * uma chave de verdade.
 */
async function conferirEnv(arquivos: string[]): Promise<Achado[]> {
  const schema = await readFile(join(RAIZ, 'start/env.ts'), 'utf8').catch(() => '')
  if (schema === '') return []
  const schemaLimpo = semComentarios(schema)

  const declaradas = new Set<string>()
  for (const casado of schemaLimpo.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:/gm)) {
    const chave = casado[1]
    if (chave !== undefined) declaradas.add(chave)
  }

  const achados: Achado[] = []
  const lidas = new Set<string>()

  for (const arquivo of arquivos) {
    const relativo = relative(RAIZ, arquivo)
    if (relativo === 'start/env.ts') continue
    const limpo = semComentarios(await readFile(arquivo, 'utf8'))

    for (const casado of limpo.matchAll(/env\.get\(\s*'([A-Z][A-Z0-9_]*)'/g)) {
      const chave = casado[1]
      if (chave === undefined) continue
      if (!lidas.has(chave) && !declaradas.has(chave)) {
        achados.push({
          arquivo: relativo,
          linha: linhaDe(limpo, casado.index),
          regra: 'env-sem-schema',
          secao: '6',
          mensagem: `\`${chave}\` e lida aqui e nao esta declarada em \`start/env.ts\``,
        })
      }
      lidas.add(chave)
    }
  }

  for (const chave of declaradas) {
    if (lidas.has(chave)) continue
    if (chave in CONFIG.envForaDoLeitor) continue
    achados.push({
      arquivo: 'start/env.ts',
      linha: linhaDe(schemaLimpo, schemaLimpo.indexOf(chave)),
      regra: 'env-sem-leitor',
      secao: '6',
      mensagem: `\`${chave}\` nao e lida por nenhum \`env.get()\`; remova, ou registre em \`envForaDoLeitor\` com o motivo`,
    })
  }

  return achados
}

async function conferirDiretorios(): Promise<Achado[]> {
  const achados: Achado[] = []
  for (const dir of DIRETORIOS_OBRIGATORIOS) {
    try {
      await readdir(join(RAIZ, dir))
    } catch {
      achados.push({
        arquivo: dir,
        linha: 1,
        regra: 'diretorio-obrigatorio',
        secao: '1.1',
        mensagem: 'diretorio transversal nasce presente, mesmo vazio',
      })
    }
  }
  return achados
}

/**
 * Um caminho do config, como o de `use-case` sob `app/features`, virando
 * expressao.
 *
 * Duas estrelas seguidas de barra casam qualquer profundidade, inclusive
 * nenhuma; uma estrela sozinha casa dentro de um segmento so. E o minimo que os
 * tres caminhos da lista pedem.
 */
function padraoDeCaminho(glob: string): RegExp {
  const corpo = glob
    .split('**/')
    .map((trecho) => trecho.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
    .join('(?:.*/)?')
  return new RegExp(`^${corpo}$`)
}

/**
 * Toda entrada de `newAllowlist` descreve um uso que existe.
 *
 * O ESLint ja recusa `new X()` onde `X` termina em Service, UseCase, Policy ou
 * Controller (secao 2.1). O config e onde as excecoes ficam nomeadas com o
 * motivo ao lado, e o que se cobra aqui e o outro lado da lista: entrada sem uso.
 *
 * Existe porque a lista era letra morta — nenhuma funcao a lia. Uma excecao que
 * ninguem exerce nao e excecao, e uma afirmacao falsa sobre o codigo; e quem le
 * a regua acredita nela. Foi assim que `Bouncer` ficou anos na lista descrevendo
 * uma chamada que nenhum caso de uso fazia.
 */
async function conferirNewAllowlist(fontes: Map<string, string>): Promise<Achado[]> {
  const achados: Achado[] = []

  for (const entrada of CONFIG.newAllowlist) {
    const alvo = padraoDeCaminho(entrada.arquivo)
    const uso = new RegExp(`\\bnew\\s+${entrada.simbolo}\\s*\\(`)

    let usada = false
    for (const [relativo, fonte] of fontes) {
      if (!alvo.test(relativo)) continue
      if (!uso.test(fonte)) continue
      usada = true
      break
    }

    if (usada) continue
    achados.push({
      arquivo: 'scripts/pattern-check.config.json',
      linha: 1,
      regra: 'allowlist-de-new-sem-uso',
      secao: '2.1',
      mensagem: `\`newAllowlist\` isenta \`new ${entrada.simbolo}\` em \`${entrada.arquivo}\`, e nao ha esse uso; tire a entrada ou corrija o caminho`,
    })
  }

  return achados
}

/**
 * Soft delete passa por `withScopes(notDeleted)`, nunca por `whereNull` escrito
 * a mao.
 *
 * A regra da secao 4.8, cobrada. Eram 273 repeticoes nos tres projetos quando
 * ela nasceu, e o custo delas nao era o teclado: filtro escrito a mao depende de
 * alguem lembrar, e a consulta que esquece devolve registro arquivado sem
 * avisar. Centralizado, nao ha o que esquecer.
 *
 * `app/models/` fica de fora porque e la que o scope mora - e o corpo dele que
 * escreve o `whereNull`, uma vez. As demais excecoes sao nomeadas em
 * `softDeleteExempt` no config, e sao sempre a mesma situacao: consulta sobre
 * `LucidModel` generico, tipo em que scope nomeado nao existe.
 */
async function conferirSoftDelete(fontes: Map<string, string>): Promise<Achado[]> {
  const isentos = new Set(CONFIG.softDeleteExempt)
  const achados: Achado[] = []
  const padrao = /whereNull\(\s*'(?:deletedAt|deleted_at)'\s*\)/

  for (const [relativo, fonte] of fontes) {
    if (relativo.startsWith('app/models/')) continue
    if (isentos.has(relativo)) continue

    const casado = padrao.exec(fonte)

    if (casado === null) continue

    achados.push({
      arquivo: relativo,
      linha: linhaDe(fonte, casado.index),
      regra: 'soft-delete-sem-scope',
      secao: '4.8',
      mensagem:
        'troque por `withScopes((scopes) => scopes.notDeleted())`; se a consulta e sobre `LucidModel` generico, nomeie o arquivo em `softDeleteExempt`',
    })
  }

  return achados
}

/**
 * Os caminhos FORMA do config existem neste repositorio.
 *
 * FORMA e a categoria do meio da secao 5: mesma API publica e mesma estrutura,
 * conteudo por dominio. `sync:check` nao os cobra por sha256 justamente porque o
 * conteudo difere - e por isso ninguem cobrava nada, e um projeto podia perder o
 * arquivo inteiro sem reprovar.
 *
 * Presenca e o que da para cobrar sem inventar: se `app/services/slug.service.ts`
 * sumir de um dos tres, a regra aponta em vez de a diferenca aparecer no dia em
 * que alguem for procurar o service que os irmaos tem.
 */
async function existe(caminho: string): Promise<boolean> {
  try {
    await access(caminho)
    return true
  } catch {
    return false
  }
}

async function conferirForma(): Promise<Achado[]> {
  const achados: Achado[] = []

  for (const caminho of CONFIG.forma) {
    if (await existe(join(RAIZ, caminho))) continue

    achados.push({
      arquivo: 'scripts/pattern-check.config.json',
      linha: 1,
      regra: 'forma-ausente',
      secao: '5',
      mensagem: `\`${caminho}\` e FORMA no config e nao existe aqui; crie o arquivo ou tire o caminho de \`forma\``,
    })
  }

  return achados
}

/**
 * O caso de uso declara `type Payload` e `type Response = Either<...>`.
 *
 * Nao e estetica: os dois tipos sao o contrato do caso de uso, e sao o que faz o
 * controller irmao e o `openapi/introspect.ts` saberem o que entra e o que sai.
 * Usar o tipo do validator direto na assinatura funciona ate o dia em que o caso
 * de uso precisa de um campo a mais - `actor`, quase sempre -, e ai a mudanca
 * acontece na assinatura em vez de no alias, onde ninguem procura.
 *
 * `type Payload` so e exigido quando `execute` recebe alguma coisa: um caso de
 * uso sem entrada nao tem payload que declarar, e exigir o alias vazio seria
 * cerimonia.
 *
 * Nao coberto por `_doc-lib/` - e convencao deste padrao, secao 4.2.
 */
function conferirFormaDoUseCase(relativo: string, fonte: string): Achado[] {
  if (!relativo.endsWith('.use-case.ts')) return []
  if (!relativo.includes('app/features/')) return []

  const limpo = semComentarios(fonte)
  const achados: Achado[] = []

  const execute = /async execute\(([^)]*)\)/.exec(limpo)
  const recebeAlgo = execute !== null && execute[1].trim().length > 0

  if (recebeAlgo && !/^type Payload\b/m.test(limpo)) {
    achados.push({
      arquivo: relativo,
      linha: linhaDe(limpo, execute.index),
      regra: 'use-case-sem-payload',
      secao: '4.2',
      mensagem:
        'declare `type Payload` no topo e use-o na assinatura; o tipo do validator direto nao tem onde receber `actor`',
    })
  }

  const response = /^type Response = Either</m.exec(limpo)

  if (response === null) {
    achados.push({
      arquivo: relativo,
      linha: 1,
      regra: 'use-case-sem-response',
      secao: '4.2',
      mensagem: 'declare `type Response = Either<HTTPException, T>` no topo',
    })
  }

  return achados
}

/**
 * Todo controller e alcancavel por alguma rota.
 *
 * O registro em `.adonisjs/server/controllers.ts` e derivado do **sistema de
 * arquivos**, e nao das rotas: existir ali nao quer dizer estar exposto. E os
 * outros guardas leem o `openapi.json`, que so tem rota registrada - entao um
 * recurso inteiro sem rota passava por todos eles.
 *
 * Passou: quatro controllers e quatro casos de uso de avaliacao de cliente, num
 * projeto onde a contagem ainda fechava por coincidencia (234 controllers, 234
 * operacoes, porque quatro controllers roteados serviam duas rotas cada).
 *
 * Codigo inalcancavel nao e neutro. Aquele tinha derivado do padrao enquanto
 * ninguem via - usava `userId: string` onde a secao 4.3 pede o objeto `User` -,
 * e um dia ressurgiria parecendo pronto.
 */
async function conferirRota(arquivos: string[]): Promise<Achado[]> {
  const rotas = await readFile(join(RAIZ, 'start/routes.ts'), 'utf8')
  const achados: Achado[] = []

  for (const arquivo of arquivos) {
    const relativo = relative(RAIZ, arquivo)
    if (!relativo.endsWith('.controller.ts')) continue

    const dentro = relativo.split('app/features/')[1]
    if (dentro === undefined) continue

    const partes = dentro.split('/')
    const verbo = pascal(partes[partes.length - 1].replace('.controller.ts', ''))
    const chave = ['controllers', ...partes.slice(0, -1).map(camel), verbo].join('.')

    // Limite de identificador, e nao `includes`: `controllers.account.Show`
    // casaria dentro de `controllers.account.ShowX`, e a regra daria verde para
    // um controller que nenhuma rota alcanca. Foi o que o sensor pegou na
    // primeira versao desta funcao.
    const referencia = new RegExp(`${chave.replace(/\./g, '\\.')}(?![A-Za-z0-9_])`)

    if (referencia.test(rotas)) continue

    achados.push({
      arquivo: relativo,
      linha: 1,
      regra: 'controller-sem-rota',
      secao: '1.2',
      mensagem: `nenhuma rota referencia \`${chave}\`; registre a rota ou apague o arquivo e o caso de uso irmao`,
    })
  }

  return achados
}

function relatar(achados: Achado[]): void {
  if (achados.length === 0) {
    console.log('pattern:check: nenhuma violacao.')
    return
  }

  const porRegra = new Map<string, number>()
  for (const a of achados) porRegra.set(a.regra, (porRegra.get(a.regra) ?? 0) + 1)

  console.log(`pattern:check: ${achados.length} violacoes\n`)
  for (const a of achados) {
    console.log(`  ${a.arquivo}:${a.linha}`)
    console.log(`      [${a.regra}] ${a.mensagem}  (_padroes/backend.md ${a.secao})`)
  }

  console.log('\n  Por regra:')
  for (const [regra, total] of [...porRegra].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(total).padStart(4)}  ${regra}`)
  }
}

async function main(): Promise<void> {
  const flags = new Set(process.argv.slice(2))
  const arquivos = await arquivosTs(RAIZ)
  const achados: Achado[] = [...(await conferirDiretorios())]

  const fontes = new Map<string, string>()

  for (const arquivo of arquivos) {
    const relativo = relative(RAIZ, arquivo)
    if (relativo.startsWith('scripts/')) continue
    const fonte = await readFile(arquivo, 'utf8')
    fontes.set(relativo, semComentarios(fonte))
    achados.push(...aplicarRegras(relativo, fonte))
    achados.push(...conferirNomeDeClasse(relativo, fonte))
    achados.push(...conferirNomeDeModel(relativo))
    achados.push(...conferirPastaDaAcao(relativo))
    achados.push(...conferirImportEntreFeatures(relativo, fonte))
    achados.push(...conferirFormaDoUseCase(relativo, fonte))
  }

  achados.push(...(await conferirEnv(arquivos)))
  achados.push(...(await conferirNewAllowlist(fontes)))
  achados.push(...(await conferirSoftDelete(fontes)))
  achados.push(...(await conferirForma()))
  achados.push(...(await conferirRota(arquivos)))
  relatar(achados)

  if (flags.has('--report')) return
  if (achados.length > 0) process.exitCode = 1
}

await main()
