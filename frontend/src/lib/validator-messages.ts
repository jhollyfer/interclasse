/**
 * As mensagens por regra.
 *
 * A busca do VineJS é do mais específico para o mais genérico - `campo.regra`,
 * depois `*.campo.regra`, depois `regra` - então a regra genérica cobre o caso
 * comum e só o que destoa ganha linha própria.
 *
 * `{{ field }}` é substituído pelo nome amigável de `FIELD_LABELS`, e só aparece
 * onde a frase começa por verbo. Os nomes amigáveis carregam artigo ("o
 * resumo"), então campo no início da frase sairia em minúscula, e
 * `'em {{ field }}'` sairia como "em a senha". Nas demais regras o nome é
 * omitido: o erro é renderizado sob o campo já rotulado.
 */
export const RULE_MESSAGES = {
  // Genéricas
  required: 'Informe {{ field }}',
  string: 'Informe {{ field }}',
  enum: 'Selecione {{ field }}',
  email: 'Informe um e-mail válido',
  number: 'Informe um número válido',
  boolean: 'Informe verdadeiro ou falso',
  array: 'Informe uma lista',
  object: 'Informe um objeto',
  uuid: 'Selecione uma opção válida',
  url: 'Informe um link válido',
  minLength: 'Informe ao menos {{ min }} caracteres',
  maxLength: 'Informe no máximo {{ max }} caracteres',
  fixedLength: 'Informe {{ size }} caracteres',
  min: 'Informe um valor maior ou igual a {{ min }}',
  max: 'Informe um valor menor ou igual a {{ max }}',
  positive: 'Informe um valor maior que zero',
  withoutDecimals: 'Informe um número inteiro',
  'array.maxLength': 'Informe no máximo {{ max }} itens',

  // Senha
  // Os quatro `.regex()` de `password()` reportam todos a chave
  // `password.regex`, e o VineJS para na primeira que falha - não há como dar
  // uma mensagem por classe de caractere. Daí a mensagem combinada, que lista
  // as quatro exigências de uma vez.
  'password.regex':
    'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
  'password.minLength': 'A senha deve ter ao menos {{ min }} caracteres',
  'password.maxLength': 'A senha deve ter no máximo {{ max }} caracteres',
  // A regra `confirmed` roda em `password` mas reporta em
  // `passwordConfirmation`, que é onde o erro precisa aparecer.
  'passwordConfirmation.confirmed': 'As senhas não são iguais',
}

/**
 * O nome amigável de cada campo, na forma que cai bem depois de "Informe".
 *
 * Campo fora deste mapa aparece com o nome cru - a tela pede "Selecione
 * avatarId" em vez de "Selecione o avatar". Não quebra nada, só deixa a
 * mensagem feia, e é justamente por isso que passa despercebido.
 * `validator-messages.test.ts` percorre os validators pelo `toJSONSchema()` e
 * cobra a lista inteira, para que a próxima falta seja um teste vermelho e não
 * um relatório de QA.
 *
 * A chave é o caminho do campo e nada mais - o provider é global e não sabe qual
 * validator está rodando. `name` é o mesmo `name` no depoimento, na notícia e no
 * usuário, e por isso a mensagem é "Informe o nome" e não "Informe o nome do
 * depoimento": o título do dialog já diz de quem é o nome.
 *
 * `FIELD_LABELS` troca só o `{{ field }}` **exibido**. A chave do erro segue
 * sendo o nome do campo (`avatarId`), e é ela que o formulário usa para marcar o
 * input certo - renomear chave quebra o formulário.
 */
export const FIELD_LABELS = {
  // Identidade e conta
  name: 'o nome',
  email: 'o e-mail',
  password: 'a senha',
  passwordConfirmation: 'a confirmação da senha',
  currentPassword: 'a senha atual',
  role: 'o papel',
  status: 'o status',
  avatarId: 'o avatar',
  id: 'o identificador',

  // Turma e aluno
  grade: 'o ano',
  category: 'a categoria',
  advisorId: 'o professor conselheiro',
  representativeId: 'o aluno representante',
  classroomId: 'a turma',

  // Modalidade e inscrição
  minAthletes: 'o mínimo de atletas',
  maxAthletes: 'o máximo de atletas',
  sportId: 'a modalidade',
  studentIds: 'os atletas',
  studentId: 'o atleta',
  reason: 'o motivo',

  // Aviso
  title: 'o título',
  body: 'o texto',
  pinned: 'o destaque',

  // Chave e partida
  scheduledAt: 'a data e hora',
  location: 'o local',
  homeScore: 'o placar do mandante',
  awayScore: 'o placar do visitante',
  winnerTeamId: 'o vencedor',
  matchId: 'a partida',
  color: 'a cor do cartão',
  note: 'a observação',

  // Arquivo
  fileName: 'o nome do arquivo',
  mimetype: 'o tipo do arquivo',
  size: 'o tamanho',
  parts: 'as partes',
  partNumber: 'o número da parte',
  etag: 'o ETag',

  // Listagem
  page: 'a página',
  perPage: 'o total por página',
  search: 'a busca',
  sort: 'a ordenação',
  direction: 'a direção da ordenação',
  trashed: 'o filtro de arquivados',
}
