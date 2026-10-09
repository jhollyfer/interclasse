/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/*
|--------------------------------------------------------------------------
| Mensagens de validação
|--------------------------------------------------------------------------
|
| Sem isto o VineJS responde no default em inglês, e a 422 sai bilíngue: o
| envelope de `app/exceptions/handler.ts` é português ("Dados inválidos") e os
| valores de `errors` sairiam em inglês, porque o handler copia a mensagem
| verbatim. Todo erro de negócio dos use-cases já é pt-BR - só o erro de
| validação, que é o mais frequente, destoaria.
|
| Duas armadilhas, se for mexer:
|
| - `FIELD_LABELS` troca só o `{{ field }}` **exibido**. A chave do erro segue
|   sendo o nome do campo (`avatarId`), e é ela que o frontend usa para marcar
|   o input certo. Renomear chave quebra o formulário.
| - Não configure `vine.errorReporter`. O handler depende do formato de array
|   `{ field, rule, message }` do `SimpleErrorReporter`.
|
*/

/**
 * O nome amigável de cada campo, na forma que cai bem depois de "Informe".
 *
 * É exportado, e não escrito direto na chamada abaixo, porque
 * `tests/functional/validator.spec.ts` precisa importá-lo pelo nome - sem
 * depender da ordem dos argumentos do `SimpleMessagesProvider`. Esse mesmo
 * teste cobra rótulo para todo campo dos validators e acusa rótulo órfão, então
 * campo novo em `#core/validator` nasce vermelho até entrar aqui.
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
  slug: 'o slug',
  minAthletes: 'o mínimo de atletas',
  maxAthletes: 'o máximo de atletas',
  sportId: 'a modalidade',
  studentIds: 'os atletas',

  // Aviso
  title: 'o título',
  body: 'o texto',
  pinned: 'o destaque',

  // Chave e partida
  bracketId: 'a chave',
  phase: 'a fase',
  scheduledAt: 'a data e hora',
  location: 'o local',
  homeScore: 'o placar do mandante',
  awayScore: 'o placar do visitante',
  winnerTeamId: 'o vencedor',

  // Arquivo. Estes não passam por formulário do painel.
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

/**
 * A frase de cada regra de validação.
 *
 * É exportado pelo mesmo motivo de `FIELD_LABELS`:
 * `tests/functional/mensagens.spec.ts` precisa importá-lo pelo nome para cobrar
 * que toda regra usada pelos validators tenha tradução e que nenhuma frase
 * tenha escapado em inglês.
 */
export const RULE_MESSAGES = {
  // Genéricas
  // O `{{ field }}` só aparece onde a frase começa por verbo. Os rótulos
  // carregam artigo ("o resumo"), então campo no início da frase sairia em
  // minúscula, e `'em {{ field }}'` sairia como "em a senha". Nas demais
  // regras o nome é omitido: o erro é renderizado sob o campo rotulado, e na
  // API vem indexado pelo nome dele.
  'required': 'Informe {{ field }}',
  'string': 'Informe {{ field }}',
  'enum': 'Selecione {{ field }}',
  'email': 'Informe um e-mail válido',
  'number': 'Informe um número válido',
  'boolean': 'Informe verdadeiro ou falso',
  'array': 'Informe uma lista',
  'object': 'Informe um objeto',
  'uuid': 'Selecione uma opção válida',
  'url': 'Informe um link válido',
  'minLength': 'Informe ao menos {{ min }} caracteres',
  'maxLength': 'Informe no máximo {{ max }} caracteres',
  'min': 'Informe um valor maior ou igual a {{ min }}',
  'max': 'Informe um valor menor ou igual a {{ max }}',
  'positive': 'Informe um valor maior que zero',
  'withoutDecimals': 'Informe um número inteiro',
  'array.maxLength': 'Informe no máximo {{ max }} itens',

  // Senha
  // Os quatro `.regex()` de `password()` reportam todos a chave
  // `password.regex`, e o VineJS para na primeira que falha - não há como dar
  // uma mensagem por classe de caractere. Daí a mensagem combinada.
  'password.regex': 'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
  'password.minLength': 'A senha deve ter ao menos {{ min }} caracteres',
  'password.maxLength': 'A senha deve ter no máximo {{ max }} caracteres',
  // `confirmed` roda em `password` mas reporta em `passwordConfirmation`.
  'passwordConfirmation.confirmed': 'As senhas não são iguais',
}

vine.messagesProvider = new SimpleMessagesProvider(RULE_MESSAGES, FIELD_LABELS)
