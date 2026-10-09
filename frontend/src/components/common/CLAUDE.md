# Components Common

O **kit** do painel: componentes de negócio que mais de uma rota usa. Diferente
de `components/ui` (design system puro sobre Base UI), estes têm regra de
domínio, chamada a API e estado de aplicação.

## O critério: rota, não pasta

Da skill `code-pattern` §8, verbatim:

> Um componente só mora em `components/common/` se **mais de uma rota** o usa.
> Consumidor único mora junto de quem o consome (...). Consumidor único **não**
> quer dizer "importado uma vez": o que conta é quantas rotas o alcançam. Um
> componente que só `resource-list` importa, mas que chega a 16 rotas por ele, é
> compartilhado e fica.

**Conta-se rota, não diretório.** Peças usadas só sob `_private/administrator/`
ficam aqui mesmo assim: `administrator` não é uma rota, são seis (brackets,
matches, classrooms, sports, announcements, users). `row-actions/` e
`option-combobox.tsx` são kit por esse motivo.

A regra corta nos dois sentidos: não extraia para cá o que ainda tem um
consumidor só, esperando o segundo que talvez não venha.

## Compound onde há estado compartilhado

O texto é markup, e markup vai por slot. O que fica em prop é o que a peça
inteira compartilha, e isso chega às partes por contexto — não por prop repetida
em cada botão de cada tela.

| Diretório         | Partes exportadas                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `confirm-dialog/` | `Header`/`Media`/`Title`/`Description`, `Footer`/`Cancel`/`Confirm`                                        |
| `form-shell/`     | `Card`, `Content`, `Header`/`Title`, `Actions`/`Back`/`Discard`/`Submit`                                   |
| `image-field/`    | `Content`, `Preview`, `Actions`/`Upload`/`Remove`, `Description`                                           |
| `row-actions/`    | `Archive`, `Unarchive`, `Delete`                                                                           |
| `table/`          | `Header`/`Title`/`Actions`, `Toolbar`/`Search`/`TrashToggle`/`ColumnToggle`, `Grid`, `Empty`, `Pagination` |

Dois arquivos soltos também são compound, apesar de não terem diretório próprio
— cada um é uma peça só, com partes: `not-found-page.tsx`
(`Title`/`Subtitle`/`Description`/`Actions`/`HomeButton`) e `page-shell.tsx`
(`PageShell`+`Header`/`Content`/`Footer` e `PageHeader`+`Back`/`Title`/
`Badges`/`Description`/`Actions`).

**Nem tudo vira compound.** A instância do TanStack Table **não** entra em
contexto: `React.Context` não carrega o genérico de quem o provê, e guardá-la lá
custaria um `as` ou um `any` — o que reprova nas regras 2 e 3 do `code-pattern`.
Ela vai por prop, nos subcomponentes que a leem. Está escrito em
`table/table-context.ts`.

Peça sem estado compartilhado também não vira compound: um contexto ali seria
provider vazio, o "unnecessary Context overhead" que a própria
`compound-pattern` desaconselha. É o caso dos campos de formulário soltos
(`option-combobox`, `input-password`) — gatilho
mais popover, sem parte que a tela precise reordenar.

## Inventário

| Componente              | Rotas que alcança                                         | Forma    |
| ----------------------- | --------------------------------------------------------- | -------- |
| `brand-mark.tsx`        | `_public`, `_private`, `authentication` (os três layouts) | prop     |
| `bulk-archive.tsx`      | `administrator/users`                                     | prop     |
| `confirm-dialog/`       | `administrator`, `advisor` + a saída do `_private`        | compound |
| `copy-id-menu-item.tsx` | `administrator/users`                                     | prop     |
| `enrollment-board.tsx`  | `advisor/$classroomId`, `representative`                  | prop     |
| `form-shell/`           | `administrator`, `profile`                                | compound |
| `image-field/`          | `administrator/users`, `profile`                          | compound |
| `input-password.tsx`    | `authentication`, `profile`, `administrator/users`        | prop     |
| `match-dialogs.tsx`     | `administrator/brackets/$id`, `administrator/matches`     | prop     |
| `not-found-page.tsx`    | `_public` + o fallback do router                          | compound |
| `option-combobox.tsx`   | rotas de `administrator`, `_public/jogos` + o `table/`    | prop     |
| `page-shell.tsx`        | praticamente todo o `_private`                            | compound |
| `row-actions/`          | rotas de `administrator`                                  | compound |
| `submit-button.tsx`     | `authentication` + o `form-shell/`                        | prop     |
| `table/`                | rotas de `administrator`                                  | compound |
| `uploading-context.tsx` | o layout de `_private` + peças de `common/`               | provider |

**Dentro de diálogo, `select` nativo e não `option-combobox`:** o popup do
combobox abre atrás do overlay do `Dialog`.

## Padrões gerais

- **UI em PT-BR** (labels, placeholders, mensagens) — inclusive comentários
- **Ícones**: Phosphor Icons
- Alias `#/` para `src/`
- Importam de `#/components/ui` — nunca o contrário
- Composição pela prop `render` do Base UI, **nunca** `asChild` (que é o sabor
  Radix da doc do catálogo; aqui o código vence)

## Nada saiu daqui

Diferente do lowcodejs, este diretório nunca virou depósito: na auditoria que
gerou este documento, nenhum componente tinha rota única. Se um vier a ter,
desce para `routes/_private/<área>/-components/`.
