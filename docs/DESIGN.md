# Design system

**Interclasse** · esportivo, claro, legível no celular

> Registra a **decisão**: que valor, por quê, onde usar. O valor que o código lê mora no tema
> (`frontend/src/styles.css`, `frontend/components.json`); componente usa token semântico, nunca hex
> nem valor arbitrário em classe (`_standards/frontend.md` §6). Token mudou aqui, muda no tema no
> mesmo commit. Os anti-padrões que valem para todo projeto estão em `_standards/frontend.md` §10.8;
> aqui só se aponta.

## 1. Visão geral

- Direção: a identidade do site antigo dos jogos (`site-jogos-estudantis`): verde da quadra, verde-noite no cabeçalho e no rodapé, amarelo do placar. Transmite competição escolar sem perder a leitura de tabela e de placar.
- Modo dominante: **Convencer e Ler** no site público (jogos, classificação, avisos); **Operar** no painel (tabelas, formulários, sorteio, placar). O painel usa padrão familiar de shadcn; a ousadia visual (display condensado em itálico) fica no site público.
- Tema: claro e escuro. A escolha do tema segue `frontend.md` (cookie lido no servidor, sem atraso na hidratação); a implementação está na tarefa 5.7 de `docs/TASKS.md`.

## 2. Cores

Dois níveis: primitivo (`--brand`, `--brand-ink`, `--field`) e semântico (`--primary`, `--accent`…). Componente só consome o semântico; o modo escuro redefine só o semântico. O amarelo é **acento** (anel de foco, item ativo, placar); a ação primária é o verde da quadra.

| Token semântico                    | Claro                                                 | Escuro                                           | Papel (onde e por quê)                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary`                          | `#0f7a34` (`--field`)                                 | `#3fb866`                                        | ação principal; um botão `default` por área. O verde foi escurecido um tom em relação ao site antigo (`#12873a` dava 4,4:1 sobre o fundo claro) |
| `primary-foreground`               | `oklch(0.985 0.003 85)`                               | `#04260f`                                        | texto sobre `primary`                                                                                                                           |
| `accent`                           | `#ffd400` (`--brand`)                                 | `#ffd400`                                        | amarelo do placar e dos destaques: item ativo e destaque de leitura, nunca texto sobre fundo claro                                              |
| `accent-foreground`                | `#04260f` (`--brand-ink`)                             | `#04260f`                                        | tinta verde-noite sobre o amarelo                                                                                                               |
| `ring`                             | `#ffd400`                                             | `#ffd400`                                        | anel de foco                                                                                                                                    |
| `secondary`                        | `oklch(0.97 0 0)`                                     | `oklch(0.269 0 0)`                               | ação secundária                                                                                                                                 |
| `destructive`                      | `oklch(0.5 0.21 27.325)`                              | `oklch(0.704 0.191 22.216)`                      | erro e ação que apaga                                                                                                                           |
| `background`                       | `#f6fbf7`                                             | `#08150d`                                        | fundo da página (verde bem claro / verde-noite)                                                                                                 |
| `card`                             | `oklch(1 0 0)`                                        | `oklch(0.205 0 0)`                               | superfície elevada                                                                                                                              |
| `foreground`                       | `oklch(0.145 0 0)`                                    | `oklch(0.985 0 0)`                               | texto principal                                                                                                                                 |
| `muted-foreground`                 | `oklch(0.556 0 0)`                                    | `oklch(0.708 0 0)`                               | texto de apoio                                                                                                                                  |
| `border`                           | `oklch(0.922 0 0)`                                    | `oklch(1 0 0 / 10%)`                             | contornos                                                                                                                                       |
| `brand-ink`                        | `#04260f`                                             | `#04260f`                                        | faixa do cabeçalho e do rodapé; **não inverte com o tema**, e a tinta clara dela (`brand-ink-foreground` `#ffffff`) também não                  |
| `badge-neutral`                    | `oklch(0.95 0.008 150)` / texto `oklch(0.4 0.02 150)` | `oklch(0.28 0.014 150)` / `oklch(0.85 0.02 150)` | estado sem juízo (por exemplo, agendada)                                                                                                        |
| `badge-info`                       | `oklch(0.94 0.04 235)` / texto `oklch(0.42 0.1 245)`  | `oklch(0.28 0.05 235)` / `oklch(0.85 0.09 240)`  | informação                                                                                                                                      |
| `badge-success`                    | `oklch(0.94 0.05 165)` / texto `oklch(0.4 0.1 168)`   | `oklch(0.28 0.06 165)` / `oklch(0.85 0.11 168)`  | concluído, aprovada                                                                                                                             |
| `badge-warning`                    | `oklch(0.94 0.06 95)` / texto `oklch(0.4 0.09 95)`    | `oklch(0.28 0.06 95)` / `oklch(0.85 0.11 95)`    | pendente, atenção que não bloqueia                                                                                                              |
| `surface-warm`, `surface-elevated` | `oklch(0.98 0.005 60)`, `oklch(1 0 0)`                | `oklch(0.16 0.005 60)`, `oklch(0.205 0 0)`       | blocos sem borda; superfície do cartão                                                                                                          |

Cada par de badge é fundo pálido com tinta escura do mesmo matiz, calibrado para texto pequeno; os dois lados andam juntos e o `Badge` recebe só o nome da variante.

Contraste (AA): o `primary` claro passa de 4,5:1 sobre o fundo claro (comentário do `styles.css`). A conferência dos demais pares e estados, nos dois temas, com data e ferramenta: não feita.

## 3. Tipografia

Famílias (`@fontsource`, só os pesos usados):

| Papel                      | Família                                 | Pesos carregados         | Onde                             |
| -------------------------- | --------------------------------------- | ------------------------ | -------------------------------- |
| Corpo (`--font-sans`)      | Barlow                                  | 400, 600                 | texto, formulário, tabela        |
| Display (`--font-display`) | Barlow Condensed, com Barlow de reserva | 700 itálico, 800 itálico | títulos do site público e placar |

A escala é de tokens `--text-*` nomeados por papel, como manda `frontend.md` §6; a migração dos
componentes está na tarefa 5.7 de `docs/TASKS.md`.
Recursos de fonte: `font-feature-settings: 'ss01', 'cv01', 'cv11'`, `font-synthesis: none`.

## 4. Layout

- Breakpoints: o padrão do Tailwind; o hook `useIsBelow` usa 768 px (celular) e 1024 px (tablet) para a barra lateral do painel (`hooks/use-mobile.ts`). Celular primeiro: base sem prefixo, camadas em `md:` e `lg:`.
- Respiro entre seções do site público: `--space-section: clamp(5rem, 8vw, 8rem)` (`py-section`).
- Painel: barra lateral recolhível e cabeçalho com migalhas; no site público, cabeçalho e rodapé desenham a mesma lista de destinos (`routes/_public/-components/menu.ts`).
- Sem rolagem horizontal da página a 320 px; uso a 200% de zoom.

## 5. Elevação e camadas

- Sombra por papel: `shadow-card` (cartão em repouso), `shadow-card-hover` e `shadow-card-elevated`. Cada uma soma um anel de 1 px, que dá contorno sem segunda borda. Os tokens `--elevation-*` viram `--shadow-card*` no `@theme inline` por causa de colisão de nome.
- Escala de z-index nomeada em token: não definida em `styles.css`; usa os valores do shadcn nos componentes de `components/ui/`.

## 6. Formas

- Raio: `--radius: 0.5rem`; `rounded-sm`, `-md`, `-lg` e `-xl` derivam dele (`radius - 4px`, `- 2px`, `radius`, `+ 4px`).

## 7. Componentes

Vêm de `components/ui/` (shadcn, estilo `base-mira`, sobre Base UI) e do kit `components/common/`.
Ícones: Phosphor, uma família só.

| Componente                                                                                                              | Variantes usadas                                                                                                | Regra                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                                                                | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; tamanhos `default`, `xs`, `sm`, `lg`, `icon` | um `default` por área; `destructive` só na ação que apaga; "Cancelar" é `ghost` ou `outline`                                 |
| `Input`, `Textarea`, `Field`                                                                                            | padrão, com erro                                                                                                | rótulo visível acima; erro abaixo, ligado por `aria-describedby`                                                             |
| `Badge`                                                                                                                 | `neutral`, `info`, `success`, `warning` além das de botão                                                       | cor nunca sozinha: sempre com rótulo                                                                                         |
| `Alert`, `Empty`, `Skeleton`, `Spinner`                                                                                 |                                                                                                                 | estados de tela (§8)                                                                                                         |
| `Dialog`, `Sheet`, `AlertDialog`                                                                                        |                                                                                                                 | modal não é primeira opção; dentro de `Dialog` o seletor é `select` nativo, porque o popup do combobox abre atrás do overlay |
| `Tabs`                                                                                                                  |                                                                                                                 | classificação do site: aba por categoria e por modalidade, sem sair da página                                                |
| `ConfirmDialog` (`common/confirm-dialog`)                                                                               |                                                                                                                 | só para ação irreversível, cara ou em lote (excluir chave, excluir conta, sair)                                              |
| `Table` (`common/table`)                                                                                                |                                                                                                                 | tabela do painel com ordenação, coluna alternável e seleção em lote; contexto da tabela por prop                             |
| `CardList` (`common/card-list`)                                                                                         |                                                                                                                 | lista em cartões; as turmas do painel em dois grupos (F1 e F2)                                                               |
| `ClassroomDetail` (`common/classroom-detail`)                                                                           |                                                                                                                 | página da turma com conselheiro, representante, alunos e inscrições                                                          |
| `EnrollmentBoard` (`common/enrollment-board`)                                                                           |                                                                                                                 | coluna de caixas marcadas por modalidade; manda a lista inteira                                                              |
| `BracketTree` (`common/bracket-tree`)                                                                                   |                                                                                                                 | árvore do mata-mata, das oitavas à final                                                                                     |
| `MatchAgenda`, `MatchDialogs`                                                                                           |                                                                                                                 | agenda, placar e cartões                                                                                                     |
| `PhotoGallery` (`common/photo-gallery`)                                                                                 |                                                                                                                 | grade e envio de fotos                                                                                                       |
| `OptionCombobox`, `ImageField`, `InputPassword`, `FormShell`, `SubmitButton`, `RowActions`, `PageShell`, `NotFoundPage` |                                                                                                                 | kit de formulário e página do painel                                                                                         |
| `EmptyState` (`common/empty-state`)                                                                                     |                                                                                                                 | estado vazio por motivo (vazio, filtro, lixeira) sobre `ui/empty`; a tabela o usa                                            |
| `Picture` (`common/picture`)                                                                                            |                                                                                                                 | toda imagem: dimensão, `alt` e carregamento por posição (`lcp` ou `fold`)                                                    |
| `RichEditor`, `RichText` (`common/rich-editor`, `common/rich-text`)                                                     |                                                                                                                 | editor de texto rico (Tiptap, grava JSON, carregado sob demanda) e a leitura do mesmo JSON ou de Markdown de fora            |
| `MultiFileUpload` (`common/multi-file-upload`)                                                                          |                                                                                                                 | vários arquivos, cada um com barra e cancelamento; trava o submit enquanto sobe                                              |
| `BulkArchive` (`common/bulk-archive`)                                                                                   |                                                                                                                 | arquivar as linhas selecionadas, com relato parcial                                                                          |
| `LocaleSwitch`, `BrandMark`, `MaiyuCredit`                                                                              |                                                                                                                 | troca de idioma; logo decorativa (`alt` vazio, o nome ao lado diz o mesmo); crédito do desenvolvedor                         |

Estados de todo controle: default, hover, focus-visible, active, disabled, loading, error.

## 8. Estados de tela

| Estado     | Como aparece                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Carregando | esqueleto com a forma do conteúdo; spinner só no botão que enviou; o painel mostra um spinner central até o JS montar (`ssr: 'data-only'`) |
| Vazio      | por motivo: sem conselheiro ("Sem conselheiro"), sem turma vinculada, lista sem resultado com filtro, sem chave sorteada                   |
| Erro       | o que houve e a recuperação; erro de um bloco não derruba a tela; `ErrorBoundary` no layout do painel com a página "Algo quebrou"          |
| Sucesso    | toast curto com o verbo no particípio (`sonner`)                                                                                           |

Ilustração de estado vazio: sem ilustração; usa `Empty` com ícone e texto.

## 9. Movimento

- Curvas: `--ease-out-expo` e `--ease-out-quart`; tracking de título `--heading-tight` e `--heading-tighter`.
- Anima só `transform` e `opacity`; nunca `transition: all`. O `ThemeProvider` usa `disableTransitionOnChange`.
- `prefers-reduced-motion`: tira deslocamento e loop; mantém opacidade e o feedback de ação. Conferência por tela: não feita.

## 10. Acessibilidade

- Meta: WCAG 2.1 AA.
- Foco visível em todo interativo (anel amarelo `--ring`); nunca `outline-none` sem substituto.
- Alvo de toque: ≥ 44×44 px é a meta da casa _(opinião da casa; AA não exige)_; conferência por tela: não feita.
- Ícone: Phosphor; botão só de ícone tem `aria-label` por chave i18n; ícone decorativo `aria-hidden`.
- Imagem com sentido tem `alt` que diz a informação; a logo e a foto sem legenda usam `alt` conforme o caso; decorativa `alt=""`.
- Cor nunca é a única pista: o estado leva rótulo no `Badge`; hover nunca é o único caminho.

## 11. Fazer / não fazer

Os anti-padrões universais estão em `_standards/frontend.md` §10.8 e valem aqui sem cópia. Abaixo, só
os que este projeto confirmou:

| Fazer                                                    | Não fazer                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DropdownMenuLabel` sempre dentro de `DropdownMenuGroup` | `DropdownMenuLabel` solto: o Base UI lança ao abrir e a tela vira "Algo quebrou" (aconteceu no menu da conta e no `table-column-toggle`) |
| amarelo como acento (foco, item ativo, placar)           | amarelo como cor de ação primária ou de texto sobre fundo claro                                                                          |
| `select` nativo dentro de `Dialog`                       | `option-combobox` dentro de `Dialog`: o popup abre atrás do overlay                                                                      |
| nome do aluno só no painel                               | nome de aluno ou atleta em qualquer tela do site público                                                                                 |

## 12. Referências

| Referência                                                               | Onde                       | O que se tirou                                               | Data       |
| ------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------ | ---------- |
| Site anterior dos jogos (`site-jogos-estudantis/codigo-fonte/base.html`) | repositório do site antigo | verde da quadra, verde-noite do cabeçalho, amarelo do placar | 2026-10-29 |

Componentes trazidos de fora (21st.dev, React Bits): Não se aplica, nenhum componente de fora
entrou no kit.
