# Design system

**<Projeto>** · <três palavras de direção, ex.: simples, claro, rápido de usar no balcão>

> Registra a **decisão**: que valor, por quê, onde usar. O valor que o código lê mora no tema
> (`styles.css`, `components.json`); componente usa token semântico, nunca hex nem valor arbitrário
> em classe (`_standards/frontend.md` §6). Token mudou aqui, muda no tema no mesmo commit.
> A identidade (cor, família, ícone, raio) é deste projeto e é escolhida de propósito: nenhum
> valor abaixo vem preenchido. Os anti-padrões que valem para todo projeto estão em
> `_standards/frontend.md` §10.8; aqui só se aponta.

## 1. Visão geral

- Direção: <o que a interface precisa transmitir e para quem>.
- Modo dominante: <Operar (painel, tarefa repetida) | Convencer (vitrine, página pública) | Ler (conteúdo longo)>.
  Tela de operação usa padrão familiar; ousadia visual fica para a página pública.
- Tema: <só claro | claro e escuro>. Se houver escuro, o tema vem do servidor por cookie, sem
  flash, e uma página não troca de tema no meio.

## 2. Cores

Dois níveis: primitivo (opcional) e semântico. Componente só consome o semântico; o modo escuro
redefine só o semântico. Cada cor tem papel escrito, não só o valor.

| Token semântico | Claro | Escuro | Papel (onde e por quê) |
|---|---|---|---|
| `primary` | <cor> | <cor> | <ação principal; regra, ex.: no máximo uma por área> |
| `secondary` | <cor> | <cor> | <ação secundária> |
| `success` | <cor> | <cor> | <confirmação, concluído> |
| `warning` | <cor> | <cor> | <atenção que não bloqueia> |
| `destructive` | <cor> | <cor> | <erro e ação que apaga> |
| `background` | <cor> | <cor> | <fundo da página> |
| `card` | <cor> | <cor> | <superfície elevada> |
| `foreground` | <cor> | <cor> | <texto principal> |
| `muted-foreground` | <cor> | <cor> | <texto de apoio> |

Contraste conferido (AA): texto 4,5:1, texto grande e componente 3:1, nos dois temas e em todo
estado (hover, disabled legível, placeholder). Ferramenta e data da conferência: <…>.

## 3. Tipografia

Família: <família> (<fallback com métrica ajustada>), pesos carregados: <só os usados>.

Escala fixa em `rem`, nome por papel, nunca por tamanho (`--text-body`, não `--font-size-16`):

| Papel | Token | Tamanho / altura | Peso | Onde |
|---|---|---|---|---|
| Display | `--text-display` | <…> | <…> | <só página pública; único lugar onde `clamp` vale> |
| Título | `--text-heading` | <…> | <…> | <h1 da tela> |
| Subtítulo | `--text-subheading` | <…> | <…> | <h2, título de card> |
| Corpo | `--text-body` | ≥ 1rem / <…> | <…> | <texto e input; nunca abaixo de 16 px> |
| Secundário | `--text-secondary` | <…> | <…> | <texto de apoio> |
| Legenda | `--text-caption` | <…> | <…> | <rótulo pequeno, metadado> |

Prosa com medida de 65 a 75 caracteres; coluna numérica com `tabular-nums`.

## 4. Layout

- Breakpoints (`--breakpoint-*`): <…>. Celular primeiro: base sem prefixo, camadas em `md:`/`lg:`.
- Contêiner: <largura máxima, gutter>.
- Escala de espaço (`--spacing-*`): <…>; densidade <confortável | compacta> em <quais telas>.
- Sem rolagem horizontal da página a 320 px; uso a 200% de zoom.

## 5. Elevação e camadas

- Sombra por papel: <plano, sem sombra | `--shadow-popover`, `--shadow-dialog`>.
- Escala de z-index nomeada em token, nunca `z-50` solto:
  `dropdown` < `sticky` < `overlay` < `modal` < `toast` < `tooltip`.

## 6. Formas

- Raio (`--radius-*`): <um valor, ou a regra quando há mais de um, ex.: input <…>, card <…>>.

## 7. Componentes

Vêm de `components/ui/` (shadcn, variante `cva` marcada `// casa:`) e do kit `components/common/`
(`_standards/frontend.md` §8). Componente novo do kit entra aqui no mesmo commit.

| Componente | Variantes usadas | Regra |
|---|---|---|
| Button | `default`, `secondary`, `outline`, `ghost`, `destructive` | um `default` por área; `destructive` só na ação que apaga ("Excluir post"); "Cancelar"/"Manter" é `ghost` ou `outline`, nunca `destructive` |
| Input | padrão, com erro | rótulo visível acima; placeholder é exemplo, não rótulo; erro abaixo, ligado por `aria-describedby` |
| Badge | por status (lookup de variante) | cor nunca sozinha: sempre com rótulo |
| Alert | <…> | |
| ConfirmDialog | — | só para ação irreversível, cara ou em lote; recuperável usa "Desfazer" no toast |
| Dialog / Sheet | — | `dialog-pattern` / `sheet-pattern`; modal não é primeira opção |

Estados de todo controle: default, hover, focus-visible, active, disabled, loading, error.

## 8. Estados de tela

| Estado | Como aparece |
|---|---|
| Carregando | esqueleto com a forma do conteúdo; spinner só no botão que enviou |
| Vazio | por motivo: primeiro uso (o que vai aparecer + ação de criar), filtro sem resultado (limpar filtros), sem permissão (por quê + como obter) |
| Erro | o que houve e a recuperação (tentar de novo, voltar, entrar de novo); erro de um bloco não derruba a tela |
| Sucesso | toast curto com o verbo no particípio |

Ilustração de estado vazio: <estilo e onde ficam | sem ilustração>.

## 9. Movimento

- Tokens (`--ease-*`, `--animate-*`): feedback <100–150 ms>, estado <150–300 ms>, overlay <300–500 ms>;
  saída mais curta que a entrada; curva <…>.
- Anima só `transform` e `opacity`; nunca `transition: all`.
- `prefers-reduced-motion`: tira deslocamento, parallax e loop; mantém opacidade e o feedback de
  ação (`motion-reduce:`/`motion-safe:`). Sem desligar toda animação com regra global.

## 10. Acessibilidade

- Meta: WCAG 2.1 AA.
- Foco visível em todo interativo (`focus-visible:`), contraste ≥ 3:1; nunca `outline-none` sem
  substituto; ordem de foco igual à visual.
- Alvo de toque: <≥ 44×44 px> *(opinião da casa; AA não exige)*; hover nunca é o único caminho.
- Ícone: <biblioteca de ícones>, uma família, espessura única; botão só de ícone tem `aria-label`
  por chave i18n; ícone decorativo `aria-hidden`.
- Imagem com sentido tem `alt` que diz a informação; decorativa `alt=""`.

## 11. Fazer / não fazer

Os anti-padrões universais estão em `_standards/frontend.md` §10.8 e valem aqui sem cópia. Abaixo, só
os que este projeto confirmou ou acrescentou:

| Fazer | Não fazer |
|---|---|
| <…> | <…> |

## 12. Referências

> Referência é direção, não cópia (`frontend.md` §6.4). Cada linha diz o que se tirou dela.

| Referência | Onde (Godly, Awwwards, Motionsites, Figma) | O que se tirou | Data |
|---|---|---|---|
| <nome do site ou arquivo> | <url> | <ritmo de grid, tipografia de título, transição de seção…> | AAAA-MM-DD |

Componentes trazidos de fora (21st.dev, React Bits), com licença:

| Arquivo | Origem | Licença | Adaptação |
|---|---|---|---|
| <`components/common/hero-gradient.tsx`> | <url> | <MIT + Commons Clause> | <Radix → Base UI, cor por token, variante CSS> |
