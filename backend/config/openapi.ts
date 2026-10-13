import env from '#start/env'

/**
 * Configuração do documento OpenAPI.
 *
 * Só o que não dá para derivar do código mora aqui. Rota, método, parâmetros de
 * caminho, exigência de autenticação e papéis saem do próprio router em tempo
 * de geração (`app/core/openapi/document.ts`); payload e resposta saem dos
 * schemas VineJS e dos models. O que sobra é identidade do documento e rótulo
 * humano de tag.
 */

/**
 * Nome do esquema de segurança referenciado por toda operação autenticada.
 *
 * É `apiKey` em cookie, não `bearer`: o guard da aplicação lê o token de
 * `request.cookie('access-token')` e não tem fallback para o header
 * `Authorization` (`app/guards/cookie-access-tokens.guard.ts`). Documentar
 * bearer aqui faria o "Test Request" do Scalar falhar sempre.
 */
export const SECURITY_SCHEME = 'cookieAuth'

/**
 * Cookie que carrega o token de acesso. Espelha `COOKIE_TOKEN.ACCESS` de
 * `app/services/cookie/cookie.service.ts`.
 */
export const SECURITY_COOKIE = 'access-token'

/**
 * Rótulo de um grupo de operações na barra lateral do Scalar.
 *
 * O casamento é por prefixo de **caminho**, não por nome de rota: o subgrupo de
 * ciclo de vida do painel é `.as('lifecycle')`, então apagar usuário se chama
 * `administrator.lifecycle.users.purge`. O caminho (`/administrator/users/:id`)
 * não tem esse problema.
 *
 * Os prefixos são disjuntos de propósito. Toda rota registrada casa com
 * exatamente uma regra, e o gerador avisa a que não casar com nenhuma.
 */
export type TagRule = {
  prefix: string
  name: string
  description: string
  /**
   * O substantivo do recurso, usado para montar o resumo de cada operação:
   * `create` + `notícia` -> "Criar notícia". Escrever o par uma vez por grupo
   * cobre as sete operações dele, em vez de um resumo por controller.
   */
  singular?: string
  plural?: string
}

const tags: TagRule[] = [
  {
    prefix: '/authentication',
    name: 'Autenticação',
    description:
      'Entrada, saída e renovação de sessão. O par de tokens viaja em cookie `httpOnly`, ' +
      'então estas rotas respondem `204` sem corpo - o que importa é o `Set-Cookie`.',
    singular: 'sessão',
    plural: 'sessões',
  },
  {
    prefix: '/account',
    name: 'Conta',
    description:
      'A própria conta, seja qual for o papel. Sem identificador no caminho: o escopo vem da ' +
      'sessão, nunca do payload - quem edita é sempre quem está autenticado.',
    singular: 'conta',
    plural: 'contas',
  },
  {
    prefix: '/storages',
    name: 'Anexos',
    description:
      'Upload em três passos, porque o binário **não** atravessa esta aplicação: o ' +
      '`POST` abre e devolve URLs assinadas, o navegador sobe as partes direto no bucket, e o ' +
      '`complete` confirma contra o objeto real. O registro nasce sem dono - quem anexa guarda ' +
      'a referência.',
    singular: 'anexo',
    plural: 'anexos',
  },
  {
    prefix: '/administrator/classrooms',
    name: 'Painel · Turmas',
    description:
      'As turmas que competem. A categoria (Fundamental 1 ou 2) sai do ano, e cada turma tem ' +
      'um professor conselheiro e um aluno representante.',
    singular: 'turma',
    plural: 'turmas',
  },
  {
    prefix: '/administrator/sports',
    name: 'Painel · Modalidades',
    description: 'Futsal, vôlei, queimada... Cada uma com o mínimo e o máximo de atletas por time.',
    singular: 'modalidade',
    plural: 'modalidades',
  },
  {
    prefix: '/administrator/announcements',
    name: 'Painel · Avisos',
    description: 'Os avisos que o site mostra. Fixados aparecem primeiro.',
    singular: 'aviso',
    plural: 'avisos',
  },
  {
    prefix: '/administrator/brackets',
    name: 'Painel · Chaves',
    description:
      'O sorteio de uma modalidade numa categoria, que monta o mata-mata inteiro. Chave não ' +
      'se edita: apaga e sorteia de novo.',
    singular: 'chave',
    plural: 'chaves',
  },
  {
    prefix: '/administrator/matches',
    name: 'Painel · Partidas',
    description: 'A agenda e o placar. As partidas nascem do sorteio, nunca à mão.',
    singular: 'partida',
    plural: 'partidas',
  },
  {
    prefix: '/administrator/users',
    name: 'Painel · Usuários',
    description:
      'As contas de acesso: administradores, professores conselheiros e alunos representantes. ' +
      'Não há cadastro público - toda conta nasce aqui. A senha não sai em resposta nenhuma.',
    singular: 'usuário',
    plural: 'usuários',
  },
  {
    prefix: '/advisor',
    name: 'Conselheiro',
    description:
      'Os alunos e as inscrições das turmas que o professor aconselha. Turma de outro ' +
      'conselheiro responde `404`.',
    singular: 'turma',
    plural: 'turmas',
  },
  {
    prefix: '/representative',
    name: 'Representante',
    description: 'A lista de atletas da própria turma, por modalidade. A turma sai da sessão.',
    singular: 'inscrição',
    plural: 'inscrições',
  },
  {
    prefix: '/storefront',
    name: 'Site',
    description:
      'O site público, **sem autenticação** e somente leitura: tabela de jogos, classificação, ' +
      'chaves e avisos.',
    singular: 'item',
    plural: 'itens',
  },
]

const openapi = {
  info: {
    title: 'API Interclasse',
    version: '1.0.0',
    description:
      'API dos Jogos Estudantis: turmas, inscrições, sorteio, tabela de jogos, placar e ' +
      'classificação, com painel da organização, do conselheiro e do representante.\n\n' +
      'O site (`/storefront`) responde sem sessão. Todo o resto exige o cookie `httpOnly` ' +
      '`access-token`, emitido por `POST /authentication/sign-in` e renovado por ' +
      '`POST /authentication/refresh`.\n\n' +
      'Toda falha devolve o mesmo corpo: `{ message, status, code, errors? }`, onde `code` é o ' +
      'identificador de máquina e `errors` mapeia campo para mensagem quando a falha é por ' +
      'campo.',
  },

  servers: [{ url: env.get('APP_SERVER_URL'), description: 'Servidor atual' }],

  /** Caminhos que nunca entram no documento: não são operação de API. */
  ignore: ['/', '/documentation', '/openapi.json', '/health-check'],

  tags,
}

/**
 * Resumo fixo para ação que este projeto tem e os irmãos não - ou que precisa de
 * outra frase.
 *
 * `app/core/openapi/document.ts` é congelado e igual nos três, então a tabela de
 * ações dele é de mecanismo: `create`, `paginate`, `show`, `update`, `archive`,
 * `unarchive`, `delete` mais as de sessão e upload. Um nome de domínio ali
 * viraria resumo errado no repositório ao lado, e é este arquivo - que é do
 * projeto - o lugar de dizer o que só vale aqui.
 *
 * A chave é o nome do arquivo do controller sem o sufixo, e o valor ganha de
 * tudo: se estiver aqui, nem a tabela de mecanismo nem o substantivo do grupo
 * são consultados.
 */
export const ACTION_OVERRIDES: Record<string, string> = {
  score: 'Lançar placar',
  unscore: 'Desfazer placar',
}

export default openapi
