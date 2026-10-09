# Base UI

As primitivas headless que ficam **por baixo** dos componentes do shadcn.

**O que é:** uma biblioteca de componentes React sem estilo nenhum. Ela entrega comportamento —
foco, teclado, ARIA, posicionamento, animação de saída, estado — e não entrega uma linha de CSS. É a
sucessora do Radix na stack do shadcn: com `"style": "base-mira"` no `components.json`, todo arquivo
que a CLI grava importa `@base-ui/react/<primitiva>`.

**Para que serve:** responder a pergunta que a doc do shadcn não responde. A página do shadcn mostra
como o componente **fica**; a página daqui mostra o que ele **aceita** e como ele **se comporta**.

**Como usar:** normalmente você não instala nem importa nada à mão — o `shadcn add` já grava o
wrapper. O que se faz aqui é abrir o arquivo em `components/ui/` e mexer no primitivo que ele
envolve:

```bash
pnpm add @base-ui/react   # só em projeto sem shadcn; com shadcn a CLI já resolve
```

```tsx
// o que o shadcn grava em components/ui/select.tsx, resumido:
import { Select as SelectPrimitive } from '@base-ui/react/select'

const Select = SelectPrimitive.Root // <- o comportamento inteiro vem daqui
function SelectTrigger(props: SelectPrimitive.Trigger.Props) {
  return <SelectPrimitive.Trigger className={cn('...', props.className)} {...props} />
}
```

**Quando adotar a biblioteca:** já está adotada em qualquer projeto que use shadcn no estilo novo. Só
vale instalar direto num projeto que **não** usa shadcn e quer montar o próprio sistema de
componentes.

**O que muda a experiência:** três coisas, e só três.

1. **A prop `render`** substitui o `asChild` do Radix. Código migrado quebra nela.
2. **Os atributos `data-*`** (`data-open`, `data-highlighted`, `data-disabled`,
   `data-starting-style`) são como o Tailwind dos componentes copiados pinta estado. Não existe
   classe condicional em JavaScript nesses arquivos porque não precisa.
3. **Os handlers recebem dois argumentos**: `(valor, eventDetails)`. O segundo é o que permite
   cancelar a mudança sem controlar o componente por fora.

**Sobre os links de componente:** cada página tem demo, guia de uso, **anatomia** (a árvore de partes)
e a referência de props, atributos e variáveis CSS. O campo "Quando usar" abaixo aponta **o que o
primitivo faz que a página do shadcn não mostra** — que é o motivo real de abrir esta doc. Oito
componentes não têm par no shadcn e estão marcados.

**Links:** 53 (as ~25 páginas de changelog por versão ficaram de fora; entra só o índice
`overview/releases`).

---

## Visão geral

#### react/overview/quick-start
[doc](https://base-ui.com/react/overview/quick-start) | [markdown](https://base-ui.com/react/overview/quick-start.md)
**O que é:** instalação, os dois ajustes de CSS global que a biblioteca exige, e a montagem do
primeiro componente.
**Para que serve:** deixar o app pronto para portais e popups.
**Quando usar:** uma vez por projeto. **São dois ajustes de CSS que ninguém adivinha**, e os dois
aparecem como bug de z-index ou de modal cortado no iPhone semanas depois.

```css
/* popup aparece atrás do cabeçalho? é isto que falta: um contexto de
   empilhamento próprio para o app, deixando os portais livres acima */
.root { isolation: isolate; }

/* iOS 26+: sem isto o backdrop do dialog não cobre a tela toda depois de rolar */
body { position: relative; }
```

#### react/overview/accessibility
[doc](https://base-ui.com/react/overview/accessibility) | [markdown](https://base-ui.com/react/overview/accessibility.md)
**O que é:** navegação por teclado, gestão de foco, contraste, nome acessível e como testar.
**Para que serve:** saber o que a biblioteca já garante e o que continua sendo seu.
**Quando usar:** antes de "consertar" acessibilidade na mão. Quase tudo já vem pronto; o que **não**
vem é o nome acessível, e essa parte é sempre sua.

```tsx
// teclado, foco preso e roles: da biblioteca.
// nome do controle: seu, sempre. Botão só de ícone sem isto é um botão sem nome.
<Tooltip.Trigger aria-label="Remover post" render={<Button size="icon" />}>
  <Trash />
</Tooltip.Trigger>
```

#### react/overview/releases
[doc](https://base-ui.com/react/overview/releases) | [markdown](https://base-ui.com/react/overview/releases.md)
**O que é:** o índice de changelogs, uma página por versão.
**Para que serve:** descobrir o que mudou entre a versão do `package.json` e a doc que está no ar.
**Quando usar:** **quando um exemplo da doc não bate com o comportamento real**. A doc do site mostra
a última versão; seu lock aponta para outra.

```bash
# a pergunta que o changelog responde: minha versão tem essa prop?
pnpm why @base-ui/react
# depois abra o changelog da SUA versão em /react/overview/releases/v1-6-0.md
```

#### react/overview/community
[doc](https://base-ui.com/react/overview/community) | [markdown](https://base-ui.com/react/overview/community.md)
**O que é:** o ecossistema em volta: shadcn/ui, bibliotecas estilizadas, ports não oficiais, canais
de suporte.
**Para que serve:** achar quem já resolveu o problema antes.
**Quando usar:** raramente. Vale saber que o shadcn é listado aqui como consumidor oficial — não é
adaptação de terceiro.

```text
Base UI  ->  comportamento (esta doc)
shadcn   ->  estilo, tokens, CLI  (_doc-lib/shadcn.md)
```

#### react/overview/about
[doc](https://base-ui.com/react/overview/about) | [markdown](https://base-ui.com/react/overview/about.md)
**O que é:** a filosofia do projeto e a matriz de suporte: navegadores, versões do React, bundlers.
**Para que serve:** conferir compatibilidade antes de subir uma versão de React ou trocar de bundler.
**Quando usar:** ao planejar upgrade. Fora disso, é leitura opcional.

```json
// a checagem que vale: React e bundler suportados na versão que você usa
{ "react": "^19.2.0", "vite": "^8.0.0" }
```

## Handbook

#### react/handbook/composition
[doc](https://base-ui.com/react/handbook/composition) | [markdown](https://base-ui.com/react/handbook/composition.md)
**O que é:** a prop `render`, que troca o elemento que a parte renderiza, e como aninhar várias.
**Para que serve:** um `<Link>` do roteador com aparência de gatilho, sem `<a>` dentro de `<button>`.
**Quando usar:** **é a página mais importante do arquivo**. `render` é o `asChild` do Radix com outra
forma, e é a diferença que mais quebra código copiado de exemplo antigo.

```tsx
// Radix:   <Menu.Trigger asChild><MyButton /></Menu.Trigger>
// Base UI: elemento (ou função) na prop `render`
<Menu.Trigger render={<MyButton size="md" />}>Abrir</Menu.Trigger>

// componente próprio precisa repassar ref E espalhar todas as props recebidas,
// senão o gatilho para de funcionar sem erro nenhum no console.

// a forma de função dá acesso ao estado, e o controle total do spread:
<Switch.Thumb render={(props, state) => (
  <span {...props}>{state.checked ? <CheckIcon /> : <XIcon />}</span>
)} />
```

#### react/handbook/styling
[doc](https://base-ui.com/react/handbook/styling) | [markdown](https://base-ui.com/react/handbook/styling.md)
**O que é:** os quatro ganchos de estilo: `className`, `style`, atributos `data-*` de estado e
variáveis CSS.
**Para que serve:** pintar estado sem `useState` e sem classe condicional em JavaScript.
**Quando usar:** **junto com `composition`, no primeiro dia**. É o que explica as classes
`data-highlighted:` e `data-ending-style:` que aparecem em todo arquivo de `components/ui`.

```tsx
// os data-* são a interface de estilo. A lista completa de cada componente
// está na referência de API da página dele.
<Menu.Item className="data-highlighted:bg-accent data-disabled:opacity-50" />

// className e style também aceitam FUNÇÃO do estado, quando o data-* não basta
<Switch.Thumb className={(state) => (state.checked ? 'translate-x-4' : '')} />
```

```css
/* e as variáveis CSS resolvem o que Tailwind sozinho não resolve: */
.Popup { max-height: var(--available-height); min-width: var(--anchor-width); }
```

#### react/handbook/animation
[doc](https://base-ui.com/react/handbook/animation) | [markdown](https://base-ui.com/react/handbook/animation.md)
**O que é:** os atributos de ciclo de vida da animação, e a integração com bibliotecas de JavaScript.
**Para que serve:** o popup animar ao abrir **e ao fechar**, sem sumir antes da hora.
**Quando usar:** **quando a animação de saída não acontece**. É o sintoma clássico, e a causa é
sempre a mesma: estilizar só `data-open` e esquecer `data-ending-style`.

```css
/* transição (recomendado): cancela no meio sem pulo se o usuário fechar rápido */
.Popup {
  transition: transform 150ms, opacity 150ms;
  transform-origin: var(--transform-origin);
}
.Popup[data-starting-style],
.Popup[data-ending-style] { opacity: 0; transform: scale(0.9); }

/* com @keyframes, os pares são [data-open] e [data-closed] — e aí a animação
   NÃO cancela no meio, que é a razão de a doc preferir transição */
```

#### react/handbook/customization
[doc](https://base-ui.com/react/handbook/customization) | [markdown](https://base-ui.com/react/handbook/customization.md)
**O que é:** o segundo argumento dos handlers (`eventDetails`), o `preventBaseUIHandler()` e quando
controlar o componente por estado externo.
**Para que serve:** vetar uma mudança específica sem transformar o componente em controlado.
**Quando usar:** **sempre que o reflexo for `useState` só para bloquear um caso**. `reason` diz
*por que* mudou, e `cancel()` desfaz só aquele caso.

```tsx
// impedir que o dialog feche por clique fora, mas manter Esc e botão funcionando.
// Sem isto, a saída seria controlar `open` por fora e filtrar na mão.
<Dialog.Root
  onOpenChange={(open, details) => {
    if (!open && details.reason === 'outside-press') details.cancel()
  }}
>

// eventDetails: { reason, event, cancel(), allowPropagation(), isCanceled, ... }
// e, como escape hatch em evento React sem prop dedicada:
<NumberField.Input onPaste={(event) => event.preventBaseUIHandler()} />
```

#### react/handbook/forms
[doc](https://base-ui.com/react/handbook/forms) | [markdown](https://base-ui.com/react/handbook/forms.md)
**O que é:** como nomear e rotular cada tipo de controle, validação nativa e customizada, erro do
servidor, e as integrações com React Hook Form e TanStack Form.
**Para que serve:** formulário acessível com o erro no lugar certo.
**Quando usar:** **antes do primeiro formulário**. A tabela de rotulagem por tipo de controle é o que
evita campo sem nome acessível. A biblioteca de formulário em si está em
[`react-hook-form.md`](react-hook-form.md) e o schema em [`vinejs.md`](vinejs.md).

```tsx
// a regra que a página fixa: controle de GATILHO tem rótulo próprio.
// Input, NumberField, OTPField, Checkbox, Radio, Switch -> <Field.Label>
// Select -> <Select.Label> | Combobox no popup -> <Combobox.Label>
//        | Slider -> <Slider.Label> (+ aria-label por Thumb)

// e Checkbox/Radio/Switch podem ser rotulados por dentro do label:
<Field.Root>
  <Field.Label><Switch.Root /> Receber avisos</Field.Label>
  <Field.Description>Um resumo por semana</Field.Description>
</Field.Root>
```

#### react/handbook/typescript
[doc](https://base-ui.com/react/handbook/typescript) | [markdown](https://base-ui.com/react/handbook/typescript.md)
**O que é:** os namespaces de tipo: `Props`, `State`, `ChangeEventDetails`, `ChangeEventReason`.
**Para que serve:** tipar o wrapper sem repetir prop nenhuma.
**Quando usar:** ao criar ou editar um componente em `components/ui`. **É o padrão que os arquivos
gerados já usam** — seguir ele é copiar o que está lá.

```tsx
// certo: o tipo vem do primitivo, e prop nova da biblioteca aparece de graça
function MyTooltip(props: Tooltip.Root.Props) {
  return <Tooltip.Root {...props} />
}

// errado: React.ComponentProps<'div'> perde tudo que é específico do primitivo

// o `reason` do handler também é tipado, e o autocomplete lista os valores:
function onValueChange(v: string, d: Combobox.Root.ChangeEventDetails) {}
```

#### llms.txt
[doc](https://base-ui.com/llms.txt) | (já é `.txt`)
**O que é:** a lista canônica de todas as páginas, em texto puro.
**Para que serve:** conferir se um link ainda existe, ou achar o nome novo de uma página renomeada.
**Quando usar:** na manutenção deste arquivo, e quando um assistente de IA precisa da doc inteira.

```bash
# a checagem de manutenção: página que sumiu daqui foi renomeada ou removida
curl -s https://base-ui.com/llms.txt | grep -i combobox
```

## Componentes: formulário e entrada

#### react/components/field
[doc](https://base-ui.com/react/components/field) | [markdown](https://base-ui.com/react/components/field.md)
**O que é:** o invólucro que liga rótulo, controle, descrição e erro — partes `Root`, `Label`,
`Control`, `Description`, `Error`, `Validity`, `Item`.
**Para que serve:** os `aria-describedby` e `aria-invalid` saírem prontos, e a validação por campo.
**Quando usar:** **é a peça central de qualquer formulário aqui**. `Field.Error` com `match` mostra
mensagem por tipo de erro, sem `if` no JSX.

```tsx
<Field.Root name="document" validate={(v) => (v.length === 14 ? null : 'Documento inválido')}>
  <Field.Label>documento</Field.Label>
  <Field.Control />
  {/* match liga a mensagem a uma regra específica de constraint validation */}
  <Field.Error match="valueMissing">Obrigatório</Field.Error>
</Field.Root>

// validationMode decide QUANDO validar (onBlur, onChange) e
// validationDebounceTime evita validar a cada tecla em regra cara
```

#### react/components/fieldset
[doc](https://base-ui.com/react/components/fieldset) | [markdown](https://base-ui.com/react/components/fieldset.md)
**O que é:** o `<fieldset>` nativo com uma `Legend` estilizável. **Não tem par no shadcn.**
**Para que serve:** dar um nome acessível a um grupo de campos.
**Quando usar:** em grupo de rádio ou de checkbox, e em seções de formulário longo. O `<legend>`
nativo é quase impossível de estilizar; é o problema que a parte resolve.

```tsx
// sem isto, o leitor de tela anuncia "Sim" e "Não" sem dizer do que
<Fieldset.Root>
  <Fieldset.Legend>Endereço de entrega</Fieldset.Legend>
  <Field.Root>{/* ... */}</Field.Root>
</Fieldset.Root>
```

#### react/components/form
[doc](https://base-ui.com/react/components/form) | [markdown](https://base-ui.com/react/components/form.md)
**O que é:** o `<form>` com tratamento centralizado de erro. **Não tem par no shadcn.**
**Para que serve:** despejar o erro 422 da API nos campos certos, de uma vez.
**Quando usar:** **quando a validação do servidor precisa aparecer no formulário**. A prop `errors`
recebe um objeto por nome de campo, e cada `Field` pega o seu.

```tsx
// o 422 do backend, distribuído pelos campos sem percorrer nada na mão
const [erros, setErros] = React.useState({})

// a chave do objeto casa com o `name` do Field: { document: 'Já cadastrado' }
<Form errors={erros} onSubmit={enviar}>
  <Field.Root name="document">{/* o erro cai aqui sozinho */}</Field.Root>
</Form>
```

#### react/components/input
[doc](https://base-ui.com/react/components/input) | [markdown](https://base-ui.com/react/components/input.md)
**O que é:** o `<input>` nativo que se registra sozinho no `Field` ao redor.
**Para que serve:** campo de texto com o vínculo de acessibilidade automático.
**Quando usar:** dentro de `Field.Root`. Fora dele é um `<input>` comum — o ganho é a integração, e
o `onValueChange`, que entrega o valor direto em vez do evento.

```tsx
// onValueChange dá o valor pronto; onChange continua existindo e dá o evento
<Input onValueChange={(valor) => setBusca(valor)} />
```

#### react/components/checkbox
[doc](https://base-ui.com/react/components/checkbox) | [markdown](https://base-ui.com/react/components/checkbox.md)
**O que é:** a caixa de seleção — partes `Root` e `Indicator` — com estado indeterminado.
**Para que serve:** opção binária e seleção de linha.
**Quando usar:** o detalhe que o shadcn não mostra é a prop **`parent`**: ela faz um checkbox virar o
"selecionar todos" de um `CheckboxGroup`, com o indeterminado calculado sozinho.

```tsx
// o "marcar todos" sem contar itens na mão: `parent` no pai, `allValues` no grupo
<CheckboxGroup allValues={['ler', 'escrever', 'remover']}>
  <Checkbox.Root parent><Checkbox.Indicator /></Checkbox.Root>
  <Checkbox.Root name="ler"><Checkbox.Indicator /></Checkbox.Root>
</CheckboxGroup>

// uncheckedValue: o que vai no formulário quando desmarcado (default: nada)
```

#### react/components/checkbox-group
[doc](https://base-ui.com/react/components/checkbox-group) | [markdown](https://base-ui.com/react/components/checkbox-group.md)
**O que é:** o estado compartilhado de uma série de checkboxes. **Não tem par no shadcn.**
**Para que serve:** um array de valores em vez de um booleano por campo.
**Quando usar:** em permissões, filtros e qualquer "escolha várias". Sem ele, é um `useState` por
caixa e a lógica do "marcar todos" na mão.

```tsx
// um valor só, array, em vez de N booleanos espalhados
<CheckboxGroup value={permissoes} onValueChange={setPermissoes}>
  <Checkbox.Root name="ler" />
  <Checkbox.Root name="escrever" />
</CheckboxGroup>
```

#### react/components/radio
[doc](https://base-ui.com/react/components/radio) | [markdown](https://base-ui.com/react/components/radio.md)
**O que é:** o botão de rádio — `Radio.Root` e `Radio.Indicator` — sempre dentro de um `RadioGroup`.
**Para que serve:** escolha única entre poucas opções visíveis.
**Quando usar:** `Radio` **fora** de `RadioGroup` não funciona: as setas do teclado e o `name` do
formulário vêm do grupo. É a montagem que mais se erra ao escrever o wrapper.

```tsx
<RadioGroup name="status" value={status} onValueChange={setStatus}>
  <Radio.Root value="ATIVO"><Radio.Indicator /></Radio.Root>
  <Radio.Root value="INATIVO"><Radio.Indicator /></Radio.Root>
</RadioGroup>
```

#### react/components/switch
[doc](https://base-ui.com/react/components/switch) | [markdown](https://base-ui.com/react/components/switch.md)
**O que é:** o interruptor — `Root` e `Thumb`.
**Para que serve:** preferência que vale no clique.
**Quando usar:** o detalhe útil é `uncheckedValue`: em envio de formulário nativo, checkbox e switch
desligados **não mandam nada**, e é isso que faz o backend receber `undefined` em vez de `false`.

```tsx
// sem uncheckedValue, desligado = campo ausente no FormData
<Switch.Root name="notificar" value="on" uncheckedValue="off">
  <Switch.Thumb />
</Switch.Root>
```

#### react/components/select
[doc](https://base-ui.com/react/components/select) | [markdown](https://base-ui.com/react/components/select.md)
**O que é:** o seletor de valor predefinido, com `Trigger`, `Value`, `Positioner`, `Popup`, `List`,
`Item`, `ItemText`, `ItemIndicator` e as setas de rolagem.
**Para que serve:** escolher um valor de uma lista fechada, sem busca.
**Quando usar:** **`alignItemWithTrigger` é a prop que explica o posicionamento estranho**: por
padrão o popup cobre o gatilho para alinhar o texto do item selecionado com o do gatilho. Para lista
longa, o caso é `combobox`.

```tsx
// o popup nasce POR CIMA do gatilho de propósito. Para o comportamento de
// dropdown comum (abrir abaixo), desligue:
<Select.Positioner alignItemWithTrigger={false} sideOffset={4}>

// `items` deixa o Value renderizar o rótulo em vez do valor cru,
// e `multiple` transforma value em array
<Select.Root items={statuses} multiple />
```

#### react/components/combobox
[doc](https://base-ui.com/react/components/combobox) | [markdown](https://base-ui.com/react/components/combobox.md)
**O que é:** o select filtrável: input mais lista de itens predefinidos, com chips para seleção
múltipla.
**Para que serve:** escolher em lista longa, com busca, mas **sem** texto livre.
**Quando usar:** acima de umas vinte opções. A doc é explícita nas três fronteiras: sem input →
`select`; texto livre → `autocomplete`; lista fechada com filtro → aqui.

```tsx
// useFilter compara respeitando acento e locale (Intl.Collator por baixo);
// filtrar com toLowerCase().includes() erra "orgânico" contra "organico"
const { contains } = Combobox.useFilter()

<Combobox.Root items={categorias.filter((c) => contains(c.name, busca))} multiple>
  <Combobox.Chips><Combobox.Chip><Combobox.ChipRemove /></Combobox.Chip></Combobox.Chips>
  <Combobox.Empty>Nenhuma categoria</Combobox.Empty>
</Combobox.Root>
```

#### react/components/autocomplete
[doc](https://base-ui.com/react/components/autocomplete) | [markdown](https://base-ui.com/react/components/autocomplete.md)
**O que é:** o input que **sugere** enquanto se digita, aceitando texto livre. **Não tem par no
shadcn.**
**Para que serve:** busca com sugestão, e paleta de comandos filtrável.
**Quando usar:** quando o valor final pode ser qualquer texto. Se a escolha precisa ser memorizada e
restrita à lista, é `combobox` — a doc diz isso na primeira linha.

```tsx
// diferença prática: aqui o usuário pode enviar algo que não está na lista.
// Sugestão é ajuda, não restrição.
<Autocomplete.Root items={buscasRecentes}>
  <Autocomplete.Input placeholder="Buscar post" />
  <Autocomplete.Empty>Sem sugestões</Autocomplete.Empty>
</Autocomplete.Root>
```

#### react/components/number-field
[doc](https://base-ui.com/react/components/number-field) | [markdown](https://base-ui.com/react/components/number-field.md)
**O que é:** o campo numérico com botões de incremento, `ScrubArea` (arrastar para mudar o valor) e
formatação por `Intl`. **Não tem par no shadcn.**
**Para que serve:** quantidade, preço e percentual, com o valor tipado como número.
**Quando usar:** **em todo campo numérico**. `<Input type="number">` entrega string, aceita `e` e
`+`, e não formata moeda; aqui `onValueChange` entrega `number | null`.

```tsx
// formatação de moeda pelo Intl, e o valor continua número no estado
<NumberField.Root
  name="preco"
  format={{ style: 'currency', currency: 'BRL' }}
  locale="pt-BR"
  min={0}
  onValueChange={(valor) => setPreco(valor)} // number | null, não string
>
  <NumberField.Group>
    <NumberField.Decrement />
    <NumberField.Input />
    <NumberField.Increment />
  </NumberField.Group>
</NumberField.Root>
```

#### react/components/otp-field
[doc](https://base-ui.com/react/components/otp-field) | [markdown](https://base-ui.com/react/components/otp-field.md)
**O que é:** o campo de código, com um slot por caractere — `Root`, `Input`, `Separator`. **Não tem
par no shadcn** (lá o componente equivalente vem do pacote `input-otp`).
**Para que serve:** confirmação em duas etapas.
**Quando usar:** ao trocar a implementação do `input-otp` pela nativa da biblioteca. `autoSubmit`
envia o formulário sozinho ao completar, que é o comportamento esperado nesse fluxo.

```tsx
// colar o código distribui entre os slots, e o envio dispara sozinho
<OTPField.Root length={6} autoSubmit onValueComplete={(codigo) => verificar(codigo)}>
  {/* um Input por caractere, sem prop de posição: a ordem no DOM basta */}
  {Array.from({ length: 6 }, (_, i) => <OTPField.Input key={i} />)}
</OTPField.Root>
```

#### react/components/slider
[doc](https://base-ui.com/react/components/slider) | [markdown](https://base-ui.com/react/components/slider.md)
**O que é:** o controle deslizante — `Control`, `Track`, `Indicator`, `Thumb`, `Value` — com suporte
a vários thumbs.
**Para que serve:** valor aproximado, ou faixa.
**Quando usar:** **`onValueCommitted` é a prop que evita a enxurrada de requisições**: `onValueChange`
dispara a cada pixel arrastado, `onValueCommitted` só quando o usuário solta.

```tsx
// filtro que consulta a API: arrastar não pode disparar 200 chamadas
<Slider.Root
  value={faixa}
  onValueChange={setFaixa}          // atualiza a UI
  onValueCommitted={(v) => buscar(v)} // consulta só ao soltar
  minStepsBetweenValues={1}          // impede os dois thumbs se cruzarem
/>
```

## Componentes: ação e navegação

#### react/components/button
[doc](https://base-ui.com/react/components/button) | [markdown](https://base-ui.com/react/components/button.md)
**O que é:** o `<button>` com semântica garantida e a opção de continuar focável quando desabilitado.
**Para que serve:** botão que o leitor de tela ainda encontra no estado desabilitado.
**Quando usar:** **`focusableWhenDisabled` resolve um problema real de acessibilidade**: botão
`disabled` some da navegação por Tab, e o usuário de teclado nunca descobre por que não consegue
enviar. Para link com cara de botão, a doc é explícita: **não use este componente**.

```tsx
// botão de envio bloqueado, mas ainda alcançável e explicável
<Button type="submit" disabled={!valido} focusableWhenDisabled aria-describedby="motivo" />

// `type="submit"` é OBRIGATÓRIO aqui: ao contrário do <button> nativo,
// este não assume submit dentro de um form.
```

#### react/components/toggle
[doc](https://base-ui.com/react/components/toggle) | [markdown](https://base-ui.com/react/components/toggle.md)
**O que é:** o botão de dois estados, uma parte só.
**Para que serve:** negrito, itálico, favoritar.
**Quando usar:** em barra de ferramentas. `onPressedChange` também recebe `eventDetails`, então dá
para vetar a mudança em vez de controlar o estado por fora.

```tsx
<Toggle pressed={negrito} onPressedChange={setNegrito} aria-label="Negrito" />
```

#### react/components/toggle-group
[doc](https://base-ui.com/react/components/toggle-group) | [markdown](https://base-ui.com/react/components/toggle-group.md)
**O que é:** o estado compartilhado de vários toggles.
**Para que serve:** alternar modo de visualização.
**Quando usar:** o par de props que decide tudo é `multiple` (única ou múltipla) e `loopFocus` (a
seta volta ao início no fim da lista).

```tsx
// sem `multiple`, é exclusivo — e o valor é sempre array
<ToggleGroup value={[modo]} onValueChange={([v]) => setModo(v)} loopFocus>
  <Toggle value="lista" />
  <Toggle value="grade" />
</ToggleGroup>
```

#### react/components/menu
[doc](https://base-ui.com/react/components/menu) | [markdown](https://base-ui.com/react/components/menu.md)
**O que é:** o menu suspenso completo: `Item`, `LinkItem`, `CheckboxItem`, `RadioItem`, `SubmenuRoot`,
`Group`, `Separator`, `Arrow`.
**Para que serve:** o menu de ações do shadcn (`dropdown-menu`) por baixo.
**Quando usar:** **`LinkItem` é a parte esquecida**: item que navega precisa ser `<a>` de verdade,
senão perde clique do meio e "abrir em nova aba". E `closeOnClick={false}` mantém o menu aberto em
item que só alterna algo.

```tsx
<Menu.Portal>
  <Menu.Positioner sideOffset={4} align="end">
    <Menu.Popup>
      <Menu.LinkItem render={<Link to="/posts/$id" params={{ id }} />}>Ver post</Menu.LinkItem>
      {/* alternar visibilidade sem fechar o menu a cada clique */}
      <Menu.CheckboxItem closeOnClick={false} checked={verArquivados} />
    </Menu.Popup>
  </Menu.Positioner>
</Menu.Portal>
```

#### react/components/menubar
[doc](https://base-ui.com/react/components/menubar) | [markdown](https://base-ui.com/react/components/menubar.md)
**O que é:** a barra que coordena vários `Menu.Root` irmãos.
**Para que serve:** o comportamento de aplicativo de desktop, em que passar o mouse já troca de menu
depois que o primeiro abriu.
**Quando usar:** só em ferramenta densa. O componente em si é uma casca fina — os menus continuam
sendo `Menu`.

```tsx
// a barra só coordena; cada menu é um Menu.Root normal por dentro
<Menubar>
  <Menu.Root><Menu.Trigger>Arquivo</Menu.Trigger>{/* ... */}</Menu.Root>
  <Menu.Root><Menu.Trigger>Editar</Menu.Trigger>{/* ... */}</Menu.Root>
</Menubar>
```

#### react/components/navigation-menu
[doc](https://base-ui.com/react/components/navigation-menu) | [markdown](https://base-ui.com/react/components/navigation-menu.md)
**O que é:** o menu de navegação com painéis, `Viewport` compartilhado e transição de tamanho entre
painéis.
**Para que serve:** cabeçalho de site com submenus grandes.
**Quando usar:** as variáveis `--popup-width` e `--popup-height` são o que permite animar a caixa
mudando de tamanho ao trocar de item — sem elas o painel pisca no lugar de transicionar.

```css
/* a animação de morph entre painéis de tamanhos diferentes */
.Popup { width: var(--popup-width); height: var(--popup-height); transition: 200ms; }
```

#### react/components/tabs
[doc](https://base-ui.com/react/components/tabs) | [markdown](https://base-ui.com/react/components/tabs.md)
**O que é:** abas com `List`, `Tab`, `Panel` e um `Indicator` que se posiciona sozinho.
**Para que serve:** dividir conteúdo paralelo.
**Quando usar:** **`activateOnFocus` é a decisão de acessibilidade da página**: com ele, navegar de
seta já troca o painel; sem ele, precisa de Enter. Painel pesado pede o segundo. O `Indicator` usa as
variáveis `--active-tab-*` para deslizar.

```tsx
// painel que dispara requisição: não troque só por navegar de seta
<Tabs.Root value={aba} onValueChange={setAba} activateOnFocus={false}>
  <Tabs.List>
    <Tabs.Tab value="dados">Dados</Tabs.Tab>
    <Tabs.Indicator /> {/* usa --active-tab-left / --active-tab-width */}
  </Tabs.List>
</Tabs.Root>
```

#### react/components/toolbar
[doc](https://base-ui.com/react/components/toolbar) | [markdown](https://base-ui.com/react/components/toolbar.md)
**O que é:** o contêiner que dá navegação por setas a um conjunto de controles — `Button`, `Link`,
`Input`, `Group`, `Separator`. **Não tem par no shadcn.**
**Para que serve:** uma barra de ações que é um único ponto de parada do Tab.
**Quando usar:** em barra com muitos botões. A regra da doc: **no máximo um `Input`, e no fim** —
as setas disputam com o cursor de texto.

```tsx
// sem toolbar, 8 botões = 8 Tabs até sair da barra
<Toolbar.Root>
  <Toolbar.Button />
  <Toolbar.Separator />
  <Toolbar.Input /> {/* um só, e por último */}
</Toolbar.Root>
```

## Componentes: sobreposição

#### react/components/dialog
[doc](https://base-ui.com/react/components/dialog) | [markdown](https://base-ui.com/react/components/dialog.md)
**O que é:** o modal — `Trigger`, `Portal`, `Backdrop`, `Viewport`, `Popup`, `Title`, `Description`,
`Close` — com foco preso e `createHandle` para abrir de fora da árvore.
**Para que serve:** conteúdo que exige atenção sem trocar de página.
**Quando usar:** **`initialFocus` e `finalFocus` são as props que corrigem o foco**: por padrão o
foco vai para o popup e volta para o gatilho; num formulário, o certo é ir para o primeiro campo.

```tsx
<Dialog.Popup initialFocus={inputRef} finalFocus={botaoRef}>

// createHandle liga um Trigger que mora FORA do Root — sem prop drilling e
// sem estado global. Os métodos são open() e openWithPayload(dado), e chamada
// feita sem um Root montado com o mesmo handle é ignorada, não enfileirada.
const confirmar = Dialog.createHandle<{ id: string }>()
confirmar.openWithPayload({ id })
```

#### react/components/alert-dialog
[doc](https://base-ui.com/react/components/alert-dialog) | [markdown](https://base-ui.com/react/components/alert-dialog.md)
**O que é:** o mesmo dialog, mas que **não fecha por clique fora nem por Esc**.
**Para que serve:** confirmação de ação destrutiva.
**Quando usar:** **em toda remoção**. A diferença não é visual: `Dialog` tem
`disablePointerDismissal`, este simplesmente não descarta — trocar um pelo outro deixa o usuário sem
saber se removeu.

```tsx
// escolha explícita, sempre: não há caminho de "fechar sem responder"
<AlertDialog.Popup>
  <AlertDialog.Title>Remover o team Acme?</AlertDialog.Title>
  <AlertDialog.Close>Cancelar</AlertDialog.Close>
  <Button onClick={() => remover.mutate(id)}>Remover</Button>
</AlertDialog.Popup>
```

#### react/components/drawer
[doc](https://base-ui.com/react/components/drawer) | [markdown](https://base-ui.com/react/components/drawer.md)
**O que é:** o dialog **estendido** com gesto de arrastar, pontos de parada (`snapPoints`) e o efeito
de recuo do fundo (`Indent`).
**Para que serve:** painel de borda com ergonomia de toque.
**Quando usar:** só quando precisar de **gesto ou snap point**. A doc é direta: painel que desliza da
borda e não precisa de gesto é um `Dialog` posicionado, e sai mais barato.

```tsx
// meia altura e altura cheia, com o gesto parando em cada uma
<Drawer.Root snapPoints={[0.5, 1]} swipeDirection="down">
  <Drawer.Popup><Drawer.Content>{conteudo}</Drawer.Content></Drawer.Popup>
</Drawer.Root>
```

#### react/components/popover
[doc](https://base-ui.com/react/components/popover) | [markdown](https://base-ui.com/react/components/popover.md)
**O que é:** o balão ancorado, com `Positioner`, `Popup`, `Arrow` e `Viewport`.
**Para que serve:** conteúdo interativo ancorado a um gatilho.
**Quando usar:** **o `Positioner` é onde moram todas as props de posição** — `side`, `align`,
`sideOffset`, `collisionPadding`, `anchor`. Errar a camada (pôr `side` no `Popup`) é o engano mais
comum ao editar o wrapper.

```tsx
// `anchor` ancora num elemento QUALQUER, não no gatilho: é como se prende um
// popover a uma célula de tabela enquanto o botão fica no cabeçalho
<Popover.Positioner side="bottom" align="start" sideOffset={8} anchor={celulaRef}>
  <Popover.Popup className="max-h-[var(--available-height)]" />
</Popover.Positioner>
```

#### react/components/preview-card
[doc](https://base-ui.com/react/components/preview-card) | [markdown](https://base-ui.com/react/components/preview-card.md)
**O que é:** o cartão de prévia que abre ao passar o mouse num link. **Não tem par no shadcn** com
esse nome (lá é `hover-card`).
**Para que serve:** prévia de destino de link.
**Quando usar:** só como enfeite. A doc avisa: o conteúdo **não** chega a quem usa toque ou leitor de
tela, então nada essencial ali.

```tsx
// no celular isto nunca aparece. Informação que importa vai na página.
<PreviewCard.Root delay={600}>
  <PreviewCard.Trigger render={<Link to="/users/$id" params={{ id }} />} />
</PreviewCard.Root>
```

#### react/components/tooltip
[doc](https://base-ui.com/react/components/tooltip) | [markdown](https://base-ui.com/react/components/tooltip.md)
**O que é:** a dica de texto, que exige um `Tooltip.Provider` ao redor.
**Para que serve:** explicar um ícone.
**Quando usar:** **o `Provider` é obrigatório e é o que compartilha o atraso entre tooltips** — sem
ele, cada dica espera o tempo cheio de novo. E o `aria-label` do gatilho continua necessário: a doc
diz que tooltip não é rótulo.

```tsx
// um Provider na raiz do app: depois da primeira dica, as vizinhas abrem na hora
<Tooltip.Provider delay={600} closeDelay={200}>{app}</Tooltip.Provider>

// trackCursorAxis="x" faz a dica acompanhar o cursor, útil em gráfico
```

#### react/components/context-menu
[doc](https://base-ui.com/react/components/context-menu) | [markdown](https://base-ui.com/react/components/context-menu.md)
**O que é:** o menu do clique direito e do toque longo, com as mesmas partes do `Menu`.
**Para que serve:** atalho avançado sem ocupar espaço.
**Quando usar:** como **complemento**, nunca como caminho único — é a primeira linha do guia de uso
da própria página. Toda ação daqui precisa existir também num menu visível.

```tsx
// toque longo funciona, mas ninguém descobre sozinho: duplique no menu de ações
<ContextMenu.Root>
  <ContextMenu.Trigger render={<tr />} />
</ContextMenu.Root>
```

## Componentes: exibição e estrutura

#### react/components/accordion
[doc](https://base-ui.com/react/components/accordion) | [markdown](https://base-ui.com/react/components/accordion.md)
**O que é:** painéis retráteis coordenados — `Item`, `Header`, `Trigger`, `Panel`.
**Para que serve:** seções que abrem uma por vez, ou várias.
**Quando usar:** **`hiddenUntilFound` é a prop que quase ninguém conhece**: o painel fechado fica
achável pelo Ctrl+F do navegador e abre sozinho quando o termo cai lá dentro. A altura para animar
vem de `--accordion-panel-height`.

```tsx
// FAQ: sem isto, o Ctrl+F do usuário não acha nada que esteja fechado
<Accordion.Root multiple hiddenUntilFound>
  <Accordion.Item><Accordion.Panel /></Accordion.Item>
</Accordion.Root>
```

```css
.Panel { height: var(--accordion-panel-height); transition: height 150ms; }
```

#### react/components/collapsible
[doc](https://base-ui.com/react/components/collapsible) | [markdown](https://base-ui.com/react/components/collapsible.md)
**O que é:** um bloco que abre e fecha, sem coordenação com vizinhos.
**Para que serve:** esconder detalhe opcional.
**Quando usar:** para um bloco isolado. A animação de altura só funciona com
`--collapsible-panel-height` — `height: auto` não transiciona em CSS, e é por isso que a variável
existe.

```css
/* o motivo da variável: não dá para animar até `auto` */
.Panel {
  height: var(--collapsible-panel-height);
  transition: height 200ms;
  overflow: hidden;
}
```

#### react/components/avatar
[doc](https://base-ui.com/react/components/avatar) | [markdown](https://base-ui.com/react/components/avatar.md)
**O que é:** `Root`, `Image` e `Fallback`, com controle do estado de carregamento.
**Para que serve:** foto de perfil que degrada bem.
**Quando usar:** `delay` no `Fallback` evita o pisca-pisca das iniciais em imagem que carrega rápido —
é o detalhe que separa uma lista calma de uma lista tremendo.

```tsx
// sem delay, cada avatar mostra as iniciais por 40ms antes da foto entrar
<Avatar.Root>
  <Avatar.Image src={user.avatarUrl} />
  <Avatar.Fallback delay={300}>{iniciais}</Avatar.Fallback>
</Avatar.Root>
```

#### react/components/progress
[doc](https://base-ui.com/react/components/progress) | [markdown](https://base-ui.com/react/components/progress.md)
**O que é:** a barra de progresso — `Track`, `Indicator`, `Value`, `Label` — com estado
indeterminado.
**Para que serve:** avanço mensurável.
**Quando usar:** `value={null}` é o indeterminado (e muda o `data-*` para você estilizar diferente).
`format` e `locale` formatam o texto do `Value` pelo `Intl`, sem cálculo na mão.

```tsx
// null = "está acontecendo, mas não sei quanto falta"
<Progress.Root value={enviando ? null : percentual} format={{ style: 'percent' }}>
  <Progress.Track><Progress.Indicator /></Progress.Track>
  <Progress.Value /> {/* "42%" formatado pelo locale */}
</Progress.Root>
```

#### react/components/meter
[doc](https://base-ui.com/react/components/meter) | [markdown](https://base-ui.com/react/components/meter.md)
**O que é:** a exibição de um valor dentro de uma faixa. **Não tem par no shadcn.**
**Para que serve:** medida estática — uso de disco, nota, ocupação.
**Quando usar:** **quando o valor não é o avanço de uma tarefa**. Progresso vai de 0 a 100 e termina;
medidor só mostra onde está. Usar `progress` para "70% da cota" mente para o leitor de tela.

```tsx
// não está carregando nada: é uma medida parada
<Meter.Root value={armazenamentoUsado} max={100}>
  <Meter.Label>Armazenamento</Meter.Label>
  <Meter.Track><Meter.Indicator /></Meter.Track>
</Meter.Root>
```

#### react/components/scroll-area
[doc](https://base-ui.com/react/components/scroll-area) | [markdown](https://base-ui.com/react/components/scroll-area.md)
**O que é:** rolagem nativa com barra customizada — `Viewport`, `Content`, `Scrollbar`, `Thumb`,
`Corner`.
**Para que serve:** barra consistente entre sistemas, sem perder a rolagem nativa.
**Quando usar:** as variáveis `--scroll-area-overflow-y-start` e `-end` valem por si: dão o
esmaecimento nas bordas indicando que há mais conteúdo, sem JavaScript de scroll.

```css
/* a pista visual de "tem mais coisa acima/abaixo", só com CSS.
   O min() limita o esmaecimento: a variável cresce com o quanto já rolou. */
.Viewport {
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black min(40px, var(--scroll-area-overflow-y-start)),
    /* o fallback é para o SSR, antes de as variáveis hidratarem */
    black calc(100% - min(40px, var(--scroll-area-overflow-y-end, 40px))),
    transparent 100%
  );
  mask-repeat: no-repeat;
}
```

#### react/components/separator
[doc](https://base-ui.com/react/components/separator) | [markdown](https://base-ui.com/react/components/separator.md)
**O que é:** a linha divisória com a semântica correta.
**Para que serve:** separar seções.
**Quando usar:** o padrão já é decorativo quando não há orientação semântica; `orientation="vertical"`
também corrige a navegação por teclado em barras.

```tsx
<Separator orientation="vertical" className="h-6" />
```

#### react/components/toast
[doc](https://base-ui.com/react/components/toast) | [markdown](https://base-ui.com/react/components/toast.md)
**O que é:** o sistema de notificação: `Provider`, `Viewport`, `Root`, e o `useToastManager()` com
`add`, `update`, `close` e `promise`.
**Para que serve:** avisar sem interromper.
**Quando usar:** **`toastManager.promise()` é o motivo de abrir esta página**: ele troca sozinho entre
carregando, sucesso e erro, em vez de três chamadas e um `finally`. As variáveis `--toast-index` e
`--toast-offset-y` fazem o empilhamento.

```tsx
const toastManager = Toast.useToastManager()

// um toast que acompanha a mutação inteira, sem estado nenhum na mão
toastManager.promise(salvar(post), {
  loading: 'Salvando...',
  success: 'Post salvo',
  error: (erro) => `Falha: ${erro.message}`,
})
```

## Utils

#### react/utils/csp-provider
[doc](https://base-ui.com/react/utils/csp-provider) | [markdown](https://base-ui.com/react/utils/csp-provider.md)
**O que é:** o provider que injeta o `nonce` nas tags `<style>` e `<script>` inline que a biblioteca
gera.
**Para que serve:** funcionar sob Content Security Policy estrita.
**Quando usar:** **quando o modal abre sem trancar a rolagem, ou pisca, só em produção**. O sintoma é
esse: a política bloqueou o `<style>` inline, e nada aparece no console da sua máquina.

```tsx
// o nonce precisa ser o MESMO que a resposta HTTP declarou no header
<CSPProvider nonce={nonce}>{app}</CSPProvider>
```

#### react/utils/direction-provider
[doc](https://base-ui.com/react/utils/direction-provider) | [markdown](https://base-ui.com/react/utils/direction-provider.md)
**O que é:** o provider de direção do texto para os componentes.
**Para que serve:** menu, popover e sheet abrirem para o lado certo em RTL.
**Quando usar:** só em app com idioma da direita para a esquerda. Ele **não** muda HTML nem CSS — o
`dir="rtl"` continua sendo seu, e é o engano da página.

```tsx
// os dois são necessários: o provider é só para o comportamento
<html dir="rtl">
  <DirectionProvider direction="rtl">{app}</DirectionProvider>
</html>
```

#### react/utils/merge-props
[doc](https://base-ui.com/react/utils/merge-props) | [markdown](https://base-ui.com/react/utils/merge-props.md)
**O que é:** o utilitário que mescla conjuntos de props React, encadeando handlers e concatenando
`className`.
**Para que serve:** compor props sem que o último spread apague o handler do primeiro.
**Quando usar:** ao escrever componente próprio com `useRender`. Espalhar `{...a} {...b}` na mão
**substitui** o `onClick` de `a` em vez de encadear — é o bug silencioso que ele evita.

```tsx
// os dois onClick rodam; className soma em vez de sobrescrever
const props = mergeProps<'button'>({ onClick: fechar }, propsRecebidas)
```

#### react/utils/use-render
[doc](https://base-ui.com/react/utils/use-render) | [markdown](https://base-ui.com/react/utils/use-render.md)
**O que é:** o hook que dá a **seus** componentes a mesma prop `render` das partes da biblioteca.
**Para que serve:** um componente próprio que troca a tag renderizada sem virar wrapper aninhado.
**Quando usar:** ao criar um componente de design system que precise renderizar como `p`, `strong`,
`Link`, conforme o caso. É o que padroniza o componente novo com os que já existem.

```tsx
function Text(props: useRender.ComponentProps<'p'>) {
  const { render, ...rest } = props
  return useRender({
    defaultTagName: 'p',
    render,
    props: mergeProps<'p'>({ className: 'text-sm' }, rest),
  })
}

<Text render={<strong />}>agora sai como strong</Text>
```
