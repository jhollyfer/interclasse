# use-mask-input

Máscara de digitação em `<input>`, para React e para Vue 3, sobre o motor Inputmask.

> Conferido contra `use-mask-input@3.13.0` instalado. **A doc oficial está atrás do pacote em três
> pontos**, e os três enganam em silêncio: os hooks de Ant Design não moram no entry principal, mas
> no subpath `use-mask-input/antd`; a lista de aliases do site tem 16 nomes e a da 3.13.0 tem 22;
> e a página `shadcn` descreve um `Input` que é `React.forwardRef` sobre `<input>` nativo, o que
> não vale para o shadcn em cima do Base UI. Cada um está anotado no link correspondente.

**O que é:** um invólucro fino de React e de Vue sobre o **Inputmask** do Robin Herbots. A
biblioteca não implementa máscara nenhuma: ela cuida do ciclo de vida — aplicar no elemento quando o
`ref` conecta, remover quando desconecta, reaplicar quando a máscara muda — e devolve isso na forma
que cada camada de formulário espera. O motor vem **embutido no bundle** (o pacote não declara
`dependencies`, e o `dist` traz ~92 kB de Inputmask), então não há um segundo `pnpm add` nem
conflito de versão do motor.

**Para que serve:** deixar o campo formatado enquanto se digita, sem escrever `onChange` que corta a
string, conta caractere e recoloca o cursor. Essa função à mão é fácil de começar e cara de manter:
o que a quebra não é o formato, é o cursor — colar no meio, apagar por cima da seleção, o
`Backspace` em cima de um separador. É esse comportamento que se está comprando.

**Como usar:**

```bash
pnpm add use-mask-input
```

```tsx
import { useMaskInput } from 'use-mask-input'
import { Input } from '@/components/ui/input'

export function DocumentField() {
  // devolve um ref callback: nada de estado, nada de onChange
  const documentMask = useMaskInput({ mask: 'cpf' })

  return <Input ref={documentMask} placeholder="000.000.000-00" />
}
```

**Quando usar a biblioteca:** quando o campo tem formato fixo e o usuário digita muito nele —
documento, CEP, telefone, data, placa. Fora disso, pense duas vezes, porque **máscara não é
validação**: quem segura o dado é o validator, e o servidor precisa da regra de qualquer jeito. Se o
`.parse()` do validator já normaliza o que chega (tira ponto, traço e barra antes das regras), o
campo sem máscara **já funciona** — a máscara só melhora a digitação. E há um caso em que ela é a
ferramenta errada: valor monetário e percentual, que não são texto formatado e sim número guardado
em unidade menor, pedem um componente próprio que converte na borda, não uma máscara.

**A superfície inteira da 3.13.0**, conferida nos `dist/*.d.mts`:

| Entry                 | Exporta                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `use-mask-input`      | `useMaskInput`, `useHookFormMask`, `useTanStackFormMask`, `withMask`, `withHookFormMask`, `withTanStackFormMask`, `formatWithMask`, `unformatWithMask` |
| `use-mask-input/antd` | `useMaskInputAntd`, `useHookFormMaskAntd`                                                                                                              |
| `use-mask-input/vue`  | `vMaskInput`, `useMaskInput`, `formatWithMask`, `unformatWithMask`                                                                                     |

As três funções `with*` fazem o mesmo que os hooks equivalentes, e o README avisa que exigem
`React.memo` no componente — sem hook, elas reconstroem o ref callback a cada render, e cada render
reaplica a máscara.

**Links:** 12.

---

## Fundamentos

#### intro

[doc](https://use-mask-input.eduardoborges.dev/intro)

**O que é:** a apresentação: o que a biblioteca cobre, o `pnpm add` e o primeiro `useMaskInput`.
**Para que serve:** ver em uma tela que a API é um `ref`, e não um componente `<MaskedInput>` que
substitui o seu — é isso que a mantém compatível com o `Input` que já está no repositório.
**Quando usar:** na primeira leitura, e para decidir entre esta biblioteca e uma função à mão.

```tsx
import { useMaskInput } from 'use-mask-input'

// O contrato inteiro: uma máscara entra, um ref sai.
export function PhoneField() {
  const phoneMask = useMaskInput({ mask: '(99) 99999-9999' })
  return <input ref={phoneMask} />
}

// Não existe componente próprio de propósito. Como o retorno é um ref,
// qualquer input que encaminhe ref até o DOM serve — inclusive o de
// `components/ui`, que é o caso desta stack.
```

#### api-reference

[doc](https://use-mask-input.eduardoborges.dev/api-reference)

**O que é:** a referência dos hooks, das funções `with*`, dos utilitários fora do DOM e dos tipos
`Mask` e `Options`.
**Para que serve:** saber qual das oito entradas do pacote resolve o seu caso, e o que cabe em
`options`.
**Quando usar:** **antes de escolher entre `useMaskInput` e `useHookFormMask`** — a decisão parece
estética e não é, porque só o segundo preserva o `ref` do React Hook Form. E volte aqui pelo
`autoUnmask`, que é a opção que decide qual valor entra no estado do formulário.

Duas ressalvas que a página não dá:

```tsx
// 1. Os hooks de Ant Design NÃO saem do entry principal, apesar de a página
//    listá-los junto dos outros. O import certo é o subpath:
import { useMaskInputAntd } from 'use-mask-input/antd' // ✔
// import { useMaskInputAntd } from 'use-mask-input'   // ✘ não existe

// 2. `Options` é o tipo de opções do Inputmask inteiro, não uma lista curta
//    própria. O que não estiver documentado aqui está na doc do motor:
//    https://robinherbots.github.io/Inputmask/
```

```tsx
import { formatWithMask, unformatWithMask } from 'use-mask-input'

// Os dois utilitários trabalham FORA de elemento montado, e é onde eles servem:
// exibir um valor que veio cru do banco, e preparar um valor para enviar.
formatWithMask('12345678909', 'cpf') // '123.456.789-09'
unformatWithMask('123.456.789-09', 'cpf') // '12345678909'
```

## Tipos de máscara

#### tutorial-basics/static-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/static-mask)

**O que é:** a máscara de formato fixo e o alfabeto de definições: `9` dígito, `a` letra, `A` letra
maiúscula, `*` alfanumérico, `#` hexadecimal. Todo o resto da string é literal.
**Para que serve:** escrever a máscara de um campo de formato conhecido sem procurar alias.
**Quando usar:** no primeiro campo mascarado do projeto. É a página que responde "por que o traço
apareceu sozinho" — porque tudo que não é definição é literal.

```tsx
import { useMaskInput } from 'use-mask-input'

const phone = useMaskInput({ mask: '(99) 99999-9999' })
const date = useMaskInput({ mask: '99/99/9999' })
const plate = useMaskInput({ mask: 'AAA-9999' }) // A maiúsculo força caixa alta
const code = useMaskInput({ mask: 'ID: 999-AAA' }) // "ID: " é literal e vem de graça
```

```tsx
// Pegadinha de acoplamento com o input: `maxLength` conta os literais e o
// placeholder, e não só o que o usuário digitou. A 3.11.1 passou a remover o
// atributo antes de aplicar máscaras que desenham caracteres sozinhas — mas o
// limite de tamanho continua sendo assunto do validator, não do input.
<Input ref={phone} /* maxLength={15} <- não coloque */ />
```

#### tutorial-basics/optional-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/optional-mask)

**O que é:** o colchete `[ ]`, que marca o trecho que pode não ser digitado.
**Para que serve:** aceitar um formato de tamanho variável num campo só, sem trocar de máscara.
**Quando usar:** quando o campo tem uma parte que às vezes existe — DDI, ramal, complemento. Se as
variações forem formatos inteiros e diferentes, o alternator (`|`) descreve melhor que colchete.

```tsx
const phone = useMaskInput({ mask: '[+99] [9]9999-9999' }) // DDI e nono dígito opcionais
const card = useMaskInput({ mask: '9999[ 9999][ 9999][ 9999]' })
const custom = useMaskInput({ mask: '[Prefixo-]999[-Sufixo]' })

// O trecho opcional simplesmente não aparece quando não é preenchido, e some
// do valor no blur — o `clearMaskOnLostFocus` do motor é `true` por padrão.
```

#### tutorial-basics/dynamic-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/dynamic-mask)

**O que é:** o quantificador `{ }`: `{n}` exatamente n, `{n,m}` de n a m, `{+}` um ou mais, `{}`
zero ou mais, e o sufixo `|j` que liga o desenho _just-in-time_.
**Para que serve:** não repetir `9999999999` na string quando a repetição é o formato.
**Quando usar:** em campo de comprimento variável — código interno, identificador de tamanho livre,
padrão de e-mail. Também é a página que explica por que a máscara às vezes aparece inteira antes de
o usuário digitar: é o modo _greedy_, e `|j` é o antídoto.

```tsx
const digits = useMaskInput({ mask: '9{1,10}' }) // de 1 a 10 dígitos
const product = useMaskInput({ mask: 'A{2}-9{4,8}' }) // AB-1234 até AB-12345678
const letters = useMaskInput({ mask: 'A{+}' }) // uma ou mais letras

// `|j`: o restante da máscara só é desenhado conforme se digita, em vez de
// aparecer todo de uma vez como sublinhados.
const jit = useMaskInput({ mask: '9{4,8|j}' })
```

#### tutorial-basics/alias-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/alias-mask)

**O que é:** os formatos prontos, chamados por nome em vez de padrão: `cpf`, `cnpj`, `cep`,
`phone-br`, `date-br`, `plate-br`, `br-bank-account`, `br-bank-agency`, `currency`, `brl-currency`,
`credit-card`, `time`, `datetime`, `email`, `numeric`, `decimal`, `integer`, `percentage`, `url`,
`ip`, `mac`, `ssn`.
**Para que serve:** não reescrever à mão um formato que a biblioteca já acerta, incluindo os casos
em que o formato tem mais de um tamanho válido.
**Quando usar:** **antes de escrever qualquer máscara estática** — metade das strings que se digita
à mão já tem alias. E leia pela ressalva do valor: **o que está no input continua mascarado**, então
`event.target.value` não é o valor cru. Confira também a lista contra o `.d.ts` instalado: seis
aliases entraram na 3.13.0 e a página do site ainda não os traz.

> **O alias muda de forma entre versões, e o site não avisa.** O `cnpj` da 3.13.0 é
> `A|9{2}.A|9{3}.A|9{3}/A|9{4}-9{2}` — `A|9` é letra **ou** dígito, então ele já aceita o CNPJ
> alfanumérico em vigor desde julho/2026, e o `A` força a caixa alta. O site ainda descreve a forma
> antiga, só numérica, e quem acreditar nela vai trocar o alias por uma máscara estática pior. A
> conferência de um segundo é `grep -o "cnpj:{.\{0,120\}" node_modules/use-mask-input/dist/core-*.mjs`.

```tsx
const document = useMaskInput({ mask: 'cpf' })
const zip = useMaskInput({ mask: 'cep' })
const ip = useMaskInput({ mask: 'ip' })

// Alias com opção: o alias define a forma, `options` ajusta o detalhe.
const date = useMaskInput({
  mask: 'datetime',
  options: { inputFormat: 'dd/mm/yyyy', outputFormat: 'yyyy-mm-dd' },
})

const currency = useMaskInput({
  mask: 'currency',
  options: { prefix: 'R$ ', groupSeparator: '.', radixPoint: ',', digits: 2 },
})
```

```tsx
// O VALOR CRU: o retorno do hook é um ref callback com um método pendurado.
const document = useMaskInput({ mask: 'cpf' })

function onSubmit() {
  document.unmaskedValue() // '12345678909', mesmo com a tela mostrando 123.456.789-09
}

// A alternativa é `autoUnmask: true`, que faz o próprio elemento devolver o
// valor cru. Escolha UMA das duas por campo — e veja a ressalva do
// `autoUnmask` no link `shadcn`, porque ela muda o valor de ENTRADA também.
```

#### tutorial-basics/alternator-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/alternator-mask)

**O que é:** a barra `|`, ou um array de strings, para oferecer mais de uma máscara no mesmo campo;
o motor escolhe a que casa com o que está sendo digitado.
**Para que serve:** um campo só para formatos concorrentes — fixo e celular, placa antiga e
Mercosul, cartão de 16 e de 15 dígitos.
**Quando usar:** sempre que a alternativa seria um `if` no componente trocando a `mask` conforme o
tamanho do que já foi digitado. O alternator faz isso dentro do motor, com o cursor no lugar.

```tsx
// As duas formas são equivalentes. O array lê melhor com três ou mais opções.
const phone = useMaskInput({ mask: '(99) 9999-9999|(99) 99999-9999' })
const plate = useMaskInput({ mask: ['AAA-9999', 'AAA9A99'] })
const card = useMaskInput({ mask: ['9999 9999 9999 9999', '9999 999999 99999'] })

// Ordem importa: o motor tenta as alternativas na ordem em que aparecem, então
// a mais restritiva primeiro evita que a mais frouxa capture tudo.
```

#### tutorial-basics/preprocessing-mask

[doc](https://use-mask-input.eduardoborges.dev/tutorial-basics/preprocessing-mask)

**O que é:** a máscara como **função**, avaliada uma vez, que devolve a string ou o array de
máscaras.
**Para que serve:** decidir a máscara em tempo de execução, a partir de configuração, país, ou
preferência do usuário.
**Quando usar:** raro, e o alternator resolve a maioria dos casos que parecem pedir isto. Vale
quando a lista de máscaras vem de fora do componente. Note que a função é de **pré-processamento**:
ela não reage ao que está sendo digitado — para isso é alternator.

```tsx
const phone = useMaskInput({
  mask: () => (country === 'BR' ? ['(99) 9999-9999', '(99) 99999-9999'] : '999-999-9999'),
})

// A função precisa ser ESTÁVEL entre renders. Recriada a cada render, a
// biblioteca vê uma máscara nova e reaplica o Inputmask no elemento — a partir
// da 3.13.0 ela reaplica de verdade quando `mask` ou `options` mudam, o que
// deixa esse descuido visível como campo que se limpa sozinho.
const masks = useMemo(() => buildMasks(country), [country])
const stable = useMaskInput({ mask: masks })
```

## Integrações

#### shadcn

[doc](https://use-mask-input.eduardoborges.dev/shadcn)

**O que é:** o encaixe com o `Input` de `components/ui`, com e sem React Hook Form.
**Para que serve:** é a página desta stack. Ela mostra `useHookFormMask(register)` para campo
registrado e `useController` + `ref` para campo controlado.
**Quando usar:** **em todo campo mascarado de um formulário**, e principalmente para ler a ressalva
do `ref`: `{...field}` seguido de `ref={ref}` faz o último `ref` vencer, e com ele vai embora o foco
automático que o React Hook Form dá ao primeiro campo com erro.

A justificativa que a página dá — "o `Input` do shadcn é um `React.forwardRef` fino sobre um
`<input>` nativo" — **não descreve o shadcn sobre Base UI**, onde o arquivo de `components/ui` é uma
função simples que espalha `...props` numa primitiva. A conclusão continua valendo, por outro
caminho: em React 19 o `ref` viaja dentro de `props`, a primitiva do Base UI é um `forwardRef` que o
funde com o ref interno dela (`ref: [forwardedRef, inputRef]`) e entrega no `<input>` do DOM.
Confira essa cadeia antes de assumir que vale para outra primitiva.

```tsx
import { useForm } from 'react-hook-form'
import { vineResolver } from '@hookform/resolvers/vine'
import { useHookFormMask } from 'use-mask-input'
import { Input } from '@/components/ui/input'

// CAMPO REGISTRADO: `useHookFormMask` embrulha o `register` e devolve o mesmo
// objeto com o ref já encadeado. Nada do RHF se perde.
export function UserForm() {
  const { register, handleSubmit } = useForm({ resolver: vineResolver(UserValidator) })
  const registerWithMask = useHookFormMask(register)

  return (
    <form onSubmit={handleSubmit(console.info)}>
      <Input {...registerWithMask('document', 'cpf')} placeholder="000.000.000-00" />
      <Input {...registerWithMask('zipCode', 'cep')} placeholder="00000-000" />
      <Input {...registerWithMask('phone', '(99) 99999-9999')} placeholder="(00) 00000-0000" />
    </form>
  )
}
```

```tsx
import { useController } from 'react-hook-form'
import { useMaskInput } from 'use-mask-input'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'

// CAMPO CONTROLADO: é o caminho de quem usa <Controller>, e é o que tem a
// ressalva. `{...field}` traz o `ref` do RHF; `ref={documentMask}` o substitui.
function DocumentField({ control }: { control: Control<UserFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'document' })
  const documentMask = useMaskInput({ mask: 'cpf' })

  return (
    <Field>
      <FieldLabel>Documento</FieldLabel>
      {/* o ref do RHF morre aqui: `shouldFocusError` não acha mais este campo */}
      <Input {...field} ref={documentMask} placeholder="000.000.000-00" />
      <FieldError>{fieldState.error?.message}</FieldError>
    </Field>
  )
}
```

```tsx
// QUAL VALOR VAI PARA O VALIDATOR. Sem `autoUnmask`, o estado do formulário
// guarda a string MASCARADA — '123.456.789-09'. Duas saídas, e só uma por campo:
//
// (a) normalizar no validator, no `.parse()`, antes das regras:
//     vine.string().parse((value) => String(value).replace(/\D/g, '')).fixedLength(11)
//     O campo sem máscara continua funcionando, e quem chama a API direto também.
//
// (b) ligar `autoUnmask`, e o elemento passa a devolver o valor cru:
const document = useMaskInput({ mask: 'cpf', options: { autoUnmask: true } })
//
// O preço de (b) está na doc do motor: com `autoUnmask` ligado, o Inputmask
// também ESPERA receber o valor inicial já cru. `defaultValues` vindo do
// servidor com a string formatada não é reexibido direito. Por isso (a) é a
// escolha desta stack: a regra de normalização já precisa existir no servidor,
// e reaproveitá-la no cliente não acrescenta caminho novo.
```

#### tanstack-form

[doc](https://use-mask-input.eduardoborges.dev/tanstack-form)

**O que é:** o encaixe com TanStack Form, via `useTanStackFormMask` (hook) e
`withTanStackFormMask` (função).
**Para que serve:** mascarar os props que saem de um `form.Field`, mantendo `name`, `value`,
`onBlur` e `onChange`.
**Quando usar:** só se o projeto usar TanStack Form. Numa stack de React Hook Form, pule — o
equivalente está no link `shadcn`. Se abrir mesmo assim, repare que **a ordem dos argumentos é
trocada entre as duas formas**, e o TypeScript não pega o engano porque `Mask` aceita `string`.

```tsx
const maskField = useTanStackFormMask()
maskField('(99) 99999-9999', inputProps) // hook: máscara primeiro
withTanStackFormMask(inputProps, '(99) 99999-9999') // função: props primeiro
```

#### antd

[doc](https://use-mask-input.eduardoborges.dev/antd)

**O que é:** os dois hooks de Ant Design, `useMaskInputAntd` e `useHookFormMaskAntd`, no subpath
`use-mask-input/antd`.
**Para que serve:** aplicar máscara num `Input` do Ant Design, cujo `ref` não é um elemento do DOM.
**Quando usar:** só se o projeto usar Ant Design. Caso contrário, pule — mas vale saber **por que**
existe adaptador só aqui, porque é o critério para qualquer biblioteca de componente: o Ant Design
entrega no `ref` um objeto `InputRef`, com `focus()` e `input` dentro, e não o `HTMLInputElement`.
Onde o `ref` chega ao DOM — input nativo, shadcn, Base UI — nenhum adaptador é necessário.

```tsx
// A diferença inteira está no tipo do ref:
//   useMaskInput      -> RefCallback<HTMLElement | null>
//   useMaskInputAntd  -> (input: InputRef | null) => void
import { useMaskInputAntd } from 'use-mask-input/antd'

const documentMask = useMaskInputAntd({ mask: 'cpf' })
return <Input ref={documentMask} />
```

## Meta

#### discoverability

[doc](https://use-mask-input.eduardoborges.dev/discoverability)

**O que é:** a página sobre a infraestrutura do **site** — `robots.txt` com `Content-Signal`,
`/.well-known/api-catalog`, índice de skills de agente, negociação de conteúdo em markdown.
**Para que serve:** consumir a documentação de forma automatizada, e saber quais URLs estáveis o
site publica para isso.
**Quando usar:** não abra esperando API da biblioteca, porque não há uma linha sobre máscara aqui.
Vale quando se quer baixar a doc inteira em texto para leitura por ferramenta — e aí o atalho é o
`llms-full.txt` que ela cataloga, não esta página.
