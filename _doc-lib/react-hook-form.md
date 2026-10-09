# React Hook Form

Formulário com estado fora do React, para o formulário inteiro não re-renderizar a cada tecla.

**O que é:** uma biblioteca de formulário que guarda o valor dos campos em `ref`, e não em estado do
React. Digitar não re-renderiza: o componente só re-renderiza quando algo que ele **lê** muda — um
erro, `isDirty`, o valor que ele pediu por `useWatch`. A validação é delegada a um *resolver*, que
nesta stack é o do VineJS, então a regra e o tipo do formulário vêm do validator.

**Para que serve:** três coisas que aparecem em todo formulário desta stack. Ligar campo a valor
sem escrever `useState` por campo; validar no momento certo e pintar o erro no campo certo; e
receber erro que só o servidor conhece — email já cadastrado, CNPJ duplicado — e colocá-lo no campo
que o causou, em vez de num toast genérico.

**Como usar:**

```bash
pnpm add react-hook-form @hookform/resolvers
```

```tsx
import { vineResolver } from '@hookform/resolvers/vine'
import { Controller, useForm } from 'react-hook-form'
import { CategoryValidator } from '@/lib/validator'
import type { CategoryPayload as FormType } from '@/lib/validator'

const form = useForm<FormType>({
  resolver: vineResolver(CategoryValidator),
  defaultValues: { name: '', slug: '', description: '', status: 'Ativa' },
})

// O repo liga campo por `Controller`, nunca por `register`, porque os
// componentes vêm do Base UI e não expõem um `<input>` para receber `ref`.
<Controller
  name="name"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <Input {...field} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

**Quando adotar a biblioteca:** em qualquer projeto React com formulário não trivial — e, ao
contrário do Vite, ela **não** vem junto com o TanStack Start: é instalação explícita. Adotada uma
vez, a decisão que importa é **não trazer uma segunda**. O `shadcn.md` documenta a integração com
TanStack Form pelo mesmo motivo que este arquivo existe: para deixar claro que são alternativas, e
que escolher uma é o ponto. Misturar as duas é a pior opção — duas convenções de formulário no mesmo
código, e nenhuma economia.

Onde este arquivo **não** entra: o schema é assunto de [`vinejs.md`](vinejs.md), e os componentes de
campo, rótulo e mensagem de erro são assunto de [`shadcn.md`](shadcn.md), na entrada
`docs/forms/react-hook-form`. Aqui é a biblioteca de formulário em si.

Uma diferença que o VineJS traz e o Zod não tinha: a mensagem de erro **não** mora no schema, e sim
num `SimpleMessagesProvider` global, num módulo de mensagens à parte, com chave `campo.regra`. Campo
novo sem entrada lá aparece com o nome cru na mensagem.

**Links:** 48. Boa parte é âncora dentro de três páginas longas — `get-started`, `ts` e
`advanced-usage` — mais a referência de API, que é o que mais se abre depois da primeira semana.

---

## Começando

#### get-started#Quickstart
[doc](https://react-hook-form.com/get-started#Quickstart)

**O que é:** o exemplo mínimo completo: `useForm`, `register`, `handleSubmit` e `formState.errors`
num formulário de dois campos.
**Para que serve:** ver a forma da biblioteca inteira numa tela só, antes de entrar em qualquer
detalhe.
**Quando usar:** na primeira leitura, e só nela. Guarde uma ressalva: o exemplo usa `register`, que
é a forma que **esta stack não usa** — veja `usecontroller/controller` para o porquê.

```tsx
// O contrato: um hook, uma forma de ligar o campo, um submit que só roda válido.
const { register, handleSubmit, formState: { errors } } = useForm()

<form onSubmit={handleSubmit((data) => console.log(data))}>
  <input {...register('name', { required: true })} />
  {errors.name && <span>Campo obrigatório</span>}
</form>
```

#### get-started#ReactWebVideoTutorial
[doc](https://react-hook-form.com/get-started#ReactWebVideoTutorial)

**O que é:** um vídeo do autor percorrendo a criação de um formulário do zero.
**Para que serve:** ver a biblioteca em movimento, com as decisões narradas enquanto o código
aparece.
**Quando usar:** só se vídeo for a sua forma de aprender. Não tem informação que as páginas escritas
não tenham, e é mais lento de consultar depois.

#### get-started#Registerfields
[doc](https://react-hook-form.com/get-started#Registerfields)

**O que é:** o que `register('nome')` devolve — `name`, `onChange`, `onBlur` e `ref` — e como a
notação de ponto (`address.cep`) cria campo aninhado.
**Para que serve:** entender que o valor do campo vive no DOM, alcançado por `ref`, e que é daí que
vem a ausência de re-render ao digitar.
**Quando usar:** ao ligar um `<input>` nativo, e — mais importante aqui — para entender a **notação
de nome aninhado**, usada em nomes como `address.cep`, e que vale igual dentro do `Controller`.

```tsx
// `register` devolve as quatro props que um input nativo precisa.
const { name, onChange, onBlur, ref } = register('address.cep')

// O ponto no nome é o que faz o payload sair aninhado:
// { address: { cep: '69000000' } }
```

#### get-started#Applyvalidation
[doc](https://react-hook-form.com/get-started#Applyvalidation)

**O que é:** as regras embutidas — `required`, `min`, `max`, `minLength`, `pattern`, `validate` —
declaradas no próprio `register`.
**Para que serve:** validar sem biblioteca de schema, para formulário simples.
**Quando usar:** para **reconhecer e não usar**. Nesta stack a validação mora no validator
VineJS, e regra duplicada nos dois lugares é a origem de "o campo diz que está errado mas o schema
aceita". Regra nova vai para o módulo de validator, nunca aqui.

```tsx
// A forma da doc — não a desta stack.
<input {...register('email', { required: true, pattern: /^\S+@\S+$/ })} />

// A daqui: a regra está no validator, e o resolver a aplica.
useForm({ resolver: vineResolver(AuthenticationSignInValidator) })
```

#### get-started#Integratinganexistingform
[doc](https://react-hook-form.com/get-started#Integratinganexistingform)

**O que é:** como adotar a biblioteca num formulário que já existe, espalhando `register` pelos
campos sem reescrever o JSX.
**Para que serve:** migração incremental, sem parar para refazer a tela.
**Quando usar:** ao converter um formulário controlado por `useState` que ainda exista em alguma
tela antiga. O ponto útil é o alerta sobre `ref`: componente que não repassa `ref` não funciona por
`register`, e é aí que a página seguinte entra.

```tsx
// Repassar as props é o suficiente — o JSX de volta continua o mesmo.
function Input(props) {
  return <input {...props} />
}

<Input {...register('name')} />
```

#### get-started#IntegratingwithUIlibraries
[doc](https://react-hook-form.com/get-started#IntegratingwithUIlibraries)

**O que é:** a integração com bibliotecas de componente — MUI, Base UI, Radix — que não expõem um
`<input>` e por isso não aceitam `register`.
**Para que serve:** decidir entre `register` e `Controller` com um critério objetivo: o componente
aceita `ref` de input e dispara evento de DOM?
**Quando usar:** **ao criar qualquer campo desta stack**, porque a resposta aqui é sempre
`Controller` — os componentes vêm do `@base-ui/react` via shadcn e trabalham com `value` e
`onValueChange`, não com evento de DOM.

```tsx
// Base UI: a API é `value` + `onValueChange`. `register` não tem onde se ligar.
<Select value={field.value || null} onValueChange={(value) => field.onChange(value ?? '')}>
```

#### get-started#IntegratingControlledInputs
[doc](https://react-hook-form.com/get-started#IntegratingControlledInputs)

**O que é:** o `Controller` e o `useController` apresentados como a ponte para componente
controlado.
**Para que serve:** ver a assinatura do `render`, com `field` e `fieldState`, que é o par usado em
todos os campos.
**Quando usar:** ao escrever o primeiro campo. Depois disso, a referência completa está em
`usecontroller/controller`, que é a página para marcar.

```tsx
// `field` liga o valor, `fieldState` conta o que aconteceu com ele.
<Controller
  name="status"
  control={form.control}
  render={({ field, fieldState }) => <Select {...field} aria-invalid={fieldState.invalid} />}
/>
```

#### get-started#Integratingwithglobalstate
[doc](https://react-hook-form.com/get-started#Integratingwithglobalstate)

**O que é:** como conviver com estado global — Redux, Zustand, ou o TanStack Store aqui — sem
duplicar o valor do formulário lá dentro.
**Para que serve:** ver a recomendação: o formulário guarda o rascunho, o estado global recebe só o
resultado do submit.
**Quando usar:** quando alguém propuser espelhar cada tecla num store. Não faça — é o caminho mais
curto para o re-render que a biblioteca existe para evitar. Compare com
[`tanstack-store.md`](tanstack-store.md), que dá o mesmo veredito por outro lado.

```tsx
// O store recebe o resultado, não o rascunho.
function onValid(data: FormType) {
  mutation.mutate(data)
}
```

#### get-started#Handleerrors
[doc](https://react-hook-form.com/get-started#Handleerrors)

**O que é:** o objeto `formState.errors`, sua forma aninhada, e como exibir a mensagem de cada
campo.
**Para que serve:** saber onde a mensagem mora depois que a validação falha, inclusive em campo
aninhado.
**Quando usar:** **junto com `useform/seterror`**, porque é a dupla que sustenta o tratamento do 409
e do 422 do backend em `multi-step-form.tsx`. O detalhe que economiza tempo: erro de `address.cep`
fica em `errors.address?.cep`, e não em `errors['address.cep']` — mas o `setError` recebe a string
com ponto. Escrever e ler usam notações diferentes.

```tsx
// Leitura: aninhado, como o objeto.
{form.formState.errors.address?.cep?.message}

// Escrita: string com ponto, como o backend manda.
form.setError('address.cep', { message: 'CEP não encontrado' })

// Dentro do Controller, `fieldState.error` poupa os dois caminhos.
{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
```

#### get-started#Integratingwithservices
[doc](https://react-hook-form.com/get-started#Integratingwithservices)

**O que é:** o componente `<Form />` da própria biblioteca, que envia o formulário para uma URL sem
você escrever a chamada.
**Para que serve:** protótipo e formulário simples de contato, onde não há mutação para orquestrar.
**Quando usar:** não use nesta stack. Toda escrita aqui passa por uma mutação do TanStack
Query — cache invalidado, `onError` tratado, `isPending` desabilitando o botão. Veja
[`tanstack-query.md`](tanstack-query.md).

```tsx
// A forma desta stack: submit chama a mutação, e o resto é responsabilidade dela.
const mutation = useAuthenticationSignUp({ onError, onSuccess })

<form onSubmit={form.handleSubmit((payload) => mutation.mutate(payload))}>
```

## TypeScript

#### ts
[doc](https://react-hook-form.com/ts)

**O que é:** a página que lista os tipos exportados pela biblioteca, com a assinatura de cada um.
**Para que serve:** achar o nome do tipo que falta na hora de escrever a prop de um componente de
campo, em vez de anotar com `any`.
**Quando usar:** ao extrair um passo do formulário para outro arquivo — que é exatamente o que os
`step-*.tsx` de um wizard fazem. É a página inteira; as âncoras abaixo são as partes que importam.

```tsx
// Sem esse tipo, a prop viraria `any` e o nome do campo pararia de ser checado.
import type { Control } from 'react-hook-form'

type StepAddressProps = { control: Control<AuthenticationSignUpPayload> }
```

#### ts#Resolver
[doc](https://react-hook-form.com/ts#Resolver)

**O que é:** a assinatura do resolver — a função que recebe os valores e devolve `{ values, errors
}` — que é o contrato que o `vineResolver` implementa.
**Para que serve:** entender que a biblioteca não conhece o VineJS: ela conhece essa interface, e o
`@hookform/resolvers` é o adaptador.
**Quando usar:** ao investigar por que um erro do schema não apareceu no campo. O caminho passa por
aqui: se a chave do erro não bate com o nome do campo, a mensagem some silenciosamente.

O corolário que morde no VineJS: o `vineResolver` lê `error.messages` no formato do
`SimpleErrorReporter`. Trocar `vine.errorReporter` por um repórter próprio quebra o adaptador, e o
sintoma é exatamente este — erro que existe e campo que não fica vermelho.

```ts
// Por isso `confirmed({ as: 'passwordConfirmation' })` e não uma checagem
// solta: a regra roda em `password` mas reporta o erro no campo da
// confirmação, que é onde ele precisa aparecer. Erro na chave errada some.
password: vine.string().minLength(8).confirmed({ as: 'passwordConfirmation' })
```

#### ts#SubmitHandler
[doc](https://react-hook-form.com/ts#SubmitHandler)

**O que é:** o tipo da função que o `handleSubmit` chama quando o formulário é **válido**.
**Para que serve:** tipar o `onValid` quando ele é extraído para fora do componente ou passado por
prop.
**Quando usar:** ao mover a lógica de submit para um hook próprio. Dentro do componente, a
inferência já resolve e o tipo é dispensável.

```ts
import type { SubmitHandler } from 'react-hook-form'

const onValid: SubmitHandler<FormType> = (payload) => mutation.mutate(payload)
```

#### ts#SubmitErrorHandler
[doc](https://react-hook-form.com/ts#SubmitErrorHandler)

**O que é:** o tipo do **segundo** argumento do `handleSubmit`, chamado quando a validação falha.
**Para que serve:** reagir ao submit inválido — rolar até o primeiro erro, medir quantas vezes a
validação barrou o usuário.
**Quando usar:** quando "o botão não faz nada" for reclamação real. Um erro em campo fora da
viewport dá exatamente essa sensação, e é o gancho para levar o foco até lá.

```ts
import type { SubmitErrorHandler } from 'react-hook-form'

const onInvalid: SubmitErrorHandler<FormType> = (errors) => {
  const first = Object.keys(errors)[0] as keyof FormType
  form.setFocus(first)
}

form.handleSubmit(onValid, onInvalid)
```

#### ts#FormSubmitHandler
[doc](https://react-hook-form.com/ts#FormSubmitHandler)

**O que é:** o tipo do handler do componente `<Form />`, que recebe também os dados já serializados
para envio.
**Para que serve:** tipar o submit quando quem envia é o componente da biblioteca.
**Quando usar:** só se o `<Form />` for adotado — e ele não é aqui, pelo motivo em
`get-started#Integratingwithservices`. Está listado para fechar o conjunto dos handlers.

```ts
// Só se aplica ao <Form /> da biblioteca. O repo usa <form> e mutação.
import type { FormSubmitHandler } from 'react-hook-form'
```

#### ts#Control
[doc](https://react-hook-form.com/ts#Control)

**O que é:** o tipo do objeto `control`, o canal por onde `Controller`, `useWatch` e `useFieldArray`
falam com a instância do formulário.
**Para que serve:** passar o formulário para um componente filho **tipado**, de modo que um `name`
errado vire erro de compilação em vez de campo que nunca preenche.
**Quando usar:** **ao quebrar um formulário grande em componentes** — o padrão dos `step-*.tsx`.
`Control<FormType>` é o que faz `name="address.cep"` ser verificado no filho.

```tsx
import type { Control } from 'react-hook-form'

type StepAddressProps = { control: Control<AuthenticationSignUpPayload> }

// `name="address.cepp"` não compila: o tipo conhece os campos do schema.
export function StepAddress({ control }: StepAddressProps) { /* ... */ }
```

#### ts#UseFormReturn
[doc](https://react-hook-form.com/ts#UseFormReturn)

**O que é:** o tipo do objeto devolvido pelo `useForm`, com todos os métodos — `register`,
`handleSubmit`, `setValue`, `setError`, `reset`, `trigger`, `control`, `formState`.
**Para que serve:** ver o inventário completo da instância, e tipar quem recebe o formulário
inteiro.
**Quando usar:** para descobrir se o método que você ia escrever já existe, e ao passar `form`
inteiro para um filho. Passar o objeto todo é o **último** recurso: prefira `control`, que expõe
menos.

```ts
import type { UseFormReturn } from 'react-hook-form'

type WizardProps = { form: UseFormReturn<FormType> }
```

#### ts#UseFormProps
[doc](https://react-hook-form.com/ts#UseFormProps)

**O que é:** o tipo das opções de configuração do `useForm`: `mode`, `defaultValues`, `resolver`,
`values`, `reValidateMode`, `shouldUnregister`, entre outras.
**Para que serve:** enxergar de uma vez tudo que dá para configurar na criação do formulário.
**Quando usar:** ao escrever um hook próprio que embrulha o `useForm` com o resolver e o `mode` já
preenchidos — se o mesmo trio de opções aparecer em cinco dialogs, é sinal de extrair.

```ts
import type { UseFormProps } from 'react-hook-form'

// Um wrapper que carrega a convenção desta stack: resolver VineJS + onTouched.
function useVineForm<T extends FieldValues>(props: UseFormProps<T>) {
  return useForm<T>({ mode: 'onTouched', ...props })
}
```

#### ts#ValidateForm
[doc](https://react-hook-form.com/ts#ValidateForm)

**O que é:** o tipo auxiliar para funções de validação escritas à mão, no formato que o `validate`
espera.
**Para que serve:** tipar validação imperativa quando ela existe fora do schema.
**Quando usar:** raramente aqui, porque a validação é toda do VineJS. Vale quando a regra depende de
algo que o schema não alcança — outro campo já enviado, ou uma resposta de API. Mesmo assim, prefira
resolver no validator: o VineJS já é assíncrono, então regra que precisa de `await` cabe num
`vine.createRule` sem sair de lá.

```ts
// Regra que precisa do servidor não cabe no schema síncrono.
const validateCnpj = async (value: string) => (await isTaken(value)) || 'CNPJ já cadastrado'
```

#### ts#UseFormRegister
[doc](https://react-hook-form.com/ts#UseFormRegister)

**O que é:** o tipo da função `register`, com o genérico que restringe `name` aos campos do
formulário.
**Para que serve:** tipar um componente de campo que recebe `register` por prop.
**Quando usar:** em componente de input nativo compartilhado — e como aqui o campo se liga por
`Controller`, isso praticamente não acontece. Está aqui para completar o conjunto dos tipos de
`register`.

```ts
import type { UseFormRegister } from 'react-hook-form'

type TextFieldProps = { register: UseFormRegister<FormType>; name: keyof FormType }
```

#### ts#UseFormRegisterReturn
[doc](https://react-hook-form.com/ts#UseFormRegisterReturn)

**O que é:** o tipo do que `register` devolve: `name`, `onChange`, `onBlur`, `ref` e `disabled`.
**Para que serve:** encaminhar esse conjunto por um componente intermediário sem perder o tipo.
**Quando usar:** no mesmo caso da entrada anterior. O valor prático dela é outro: **mostra que
`register` produz um `ref`**, que é a razão técnica de ele não servir para os componentes do Base
UI.

```ts
import type { UseFormRegisterReturn } from 'react-hook-form'

// O `ref` aqui é a razão de existir o Controller: quem não repassa ref para
// um elemento de formulário não pode ser registrado assim.
type Props = { field: UseFormRegisterReturn }
```

## API

#### docs/useform
[doc](https://react-hook-form.com/docs/useform)

**O que é:** a referência do hook principal, com todas as opções: `mode`, `reValidateMode`,
`defaultValues`, `values`, `resetOptions`, `resolver`, `criteriaMode`, `shouldFocusError`,
`delayError`, `shouldUnregister`, `disabled`.
**Para que serve:** decidir **quando** a validação roda, que é a diferença entre um formulário que
acusa erro antes de o usuário terminar de digitar e um que espera a hora certa.
**Quando usar:** **ao criar qualquer formulário**. Leia `mode` com atenção: o padrão é `onSubmit`, e
a recomendação é `onTouched` — valida quando o campo perde o foco pela primeira vez, e daí em
diante a cada tecla. Num cadastro de vários passos, `onSubmit` deixaria o erro aparecer tarde
demais.

```tsx
const form = useForm<FormType>({
  resolver: vineResolver(AuthenticationSignUpValidator),
  defaultValues: DEFAULT_VALUES, // objeto completo: campo sem default vira não-controlado
  mode: 'onTouched',
})
```

#### docs/useform/register
[doc](https://react-hook-form.com/docs/useform/register)

**O que é:** a referência completa do `register`, com as opções de validação e os utilitários
`setValueAs`, `valueAsNumber`, `valueAsDate` e `disabled`.
**Para que serve:** ligar input nativo, e conhecer as conversões que ele oferece na entrada.
**Quando usar:** ao lidar com um `<input>` sem componente por cima — busca, filtro rápido. Repare em
`valueAsNumber`: sem ele, `<input type="number">` entrega **string**, e o schema que espera número
falha por um motivo que não aparece na tela.

```tsx
// Sem valueAsNumber, "10" chega como string e z.number() recusa.
<input type="number" {...register('perPage', { valueAsNumber: true })} />
```

#### docs/useform/handlesubmit
[doc](https://react-hook-form.com/docs/useform/handlesubmit)

**O que é:** o embrulho do submit: valida, e só chama o `onValid` se passar; o `onInvalid` opcional
recebe os erros. Aceita handler assíncrono.
**Para que serve:** garantir que a lógica de envio nunca veja dado inválido.
**Quando usar:** em todo submit. E guarde a forma **chamada**, `form.handleSubmit(onValid)()`, que o
wizard usa: ela permite decidir por código se o submit é para valer ou se é só o passo avançando.

```tsx
function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  // Enter no meio do wizard avança; só o último passo submete de verdade.
  if (isLastStep) {
    form.handleSubmit(onSubmit)()
    return
  }

  handleNext()
}
```

#### docs/useform/watch
[doc](https://react-hook-form.com/docs/useform/watch)

**O que é:** a leitura de valor em tempo real: `watch('campo')`, `watch(['a','b'])`, `watch()` para
tudo, e a forma de callback com `subscribe`.
**Para que serve:** reagir ao que o usuário digita — mostrar um campo condicionado, calcular um
total.
**Quando usar:** com cuidado, porque **`watch` re-renderiza o componente que chamou `useForm`**, ou
seja, o formulário inteiro. Para ler um valor dentro de um filho, use `useWatch`. `watch` só se quem
precisa do valor for realmente a raiz.

```tsx
// Re-renderiza o componente do useForm a cada tecla em `uf`.
const uf = form.watch('address.uf')

// Melhor, num filho: re-renderiza só ele. Veja docs/usewatch.
const uf = useWatch({ control, name: 'address.uf' })
```

#### docs/useform/setvalue
[doc](https://react-hook-form.com/docs/useform/setvalue)

**O que é:** a escrita programática num campo, com as opções `shouldValidate`, `shouldDirty` e
`shouldTouch`.
**Para que serve:** preencher campo a partir de outra fonte: busca de CEP preenchendo endereço,
máscara aplicada enquanto se digita, valor derivado de outro campo.
**Quando usar:** **em preenchimento automático** — o caso concreto aqui é o CEP puxando logradouro,
bairro, cidade e UF. Sem `shouldValidate: true`, os campos preenchidos continuam marcados como
inválidos até o usuário tocar em cada um.

```tsx
// Sem shouldValidate, os campos ficam vermelhos mesmo depois de preenchidos.
form.setValue('address.city', endereco.localidade, { shouldValidate: true })
form.setValue('address.uf', endereco.uf, { shouldValidate: true })
```

#### docs/useform/seterror
[doc](https://react-hook-form.com/docs/useform/seterror)

**O que é:** a inserção manual de erro num campo, ou na raiz por `root` e `root.<nome>`, com o tipo
e a mensagem.
**Para que serve:** trazer para o formulário o erro que **só o servidor conhece**: email já
cadastrado (409), campo recusado pelo validator (422), falha que não é de nenhum campo.
**Quando usar:** **no `onError` de toda mutação de formulário**. É a página que separa "deu erro" de
"o CNPJ que você digitou já existe". Duas armadilhas: erro posto num campo registrado **some na
próxima validação daquele campo**, o que é o comportamento desejado; e `root` não é campo, então
precisa ser lido à parte, em `formState.errors.root`.

```tsx
onError(error) {
  // `root`: a mensagem é do formulário, não de um campo.
  const { root, ...fields } = error.errors ?? {}
  if (root) form.setError('root', { message: root })

  // 422 do VineJS e 409 do use-case chegam iguais: chave é o nome do campo,
  // inclusive aninhado (`address.cep`).
  for (const [field, message] of Object.entries(fields)) {
    form.setError(field as StepField, { message })
  }
}
```

#### docs/useform/reset
[doc](https://react-hook-form.com/docs/useform/reset)

**O que é:** a volta do formulário ao estado inicial, ou a um novo conjunto de valores, com as
opções `keepErrors`, `keepDirty`, `keepValues`, `keepDefaultValues` e as demais `keep*`.
**Para que serve:** limpar depois de salvar, e carregar valores que chegaram depois do primeiro
render — o caso de um formulário de edição alimentado por uma query.
**Quando usar:** **em dialog que é reaberto**, que é o padrão dos `*-create-dialog.tsx`: sem
`reset`, o segundo cadastro começa com o texto do primeiro. E em edição, para preencher quando o
`useQuery` responder — ou, se preferir sem efeito, veja a opção `values` em `docs/useform`.

```tsx
// Depois de salvar, o dialog fecha e é reaberto vazio.
function onValid(data: FormType) {
  mutation.mutate(data, { onSuccess: () => form.reset() })
}

// Em edição: os dados chegam depois do primeiro render.
useEffect(() => { if (post) form.reset(post) }, [post])
```

#### docs/useform/trigger
[doc](https://react-hook-form.com/docs/useform/trigger)

**O que é:** a validação disparada por código, do formulário inteiro ou de uma lista de campos,
devolvendo uma promessa de `boolean`.
**Para que serve:** validar **um pedaço** do formulário sem submeter o resto.
**Quando usar:** **em formulário de várias etapas** — é a peça central do wizard de cadastro. Cada
passo declara os campos que são dele, e o botão "Continuar" só avança se aqueles campos passarem.

```tsx
async function handleNext() {
  // `step.fields` vem de STEPS: a lista de campos daquele passo, e a mesma
  // lista que alimenta o mapa campo→passo usado no erro do servidor.
  const valid = await form.trigger(step.fields)

  if (!valid) return

  setCurrentStep((current) => Math.min(current + 1, STEPS.length - 1))
}
```

#### docs/useform/formstate
[doc](https://react-hook-form.com/docs/useform/formstate)

**O que é:** o estado do formulário: `errors`, `isDirty`, `dirtyFields`, `touchedFields`, `isValid`,
`isValidating`, `isSubmitting`, `isSubmitSuccessful`, `submitCount`, `defaultValues`.
**Para que serve:** dirigir a UI pelo estado real do formulário — desabilitar botão, avisar sobre
saída com alteração pendente, mostrar contador de tentativas.
**Quando usar:** ao precisar de qualquer um desses. E leia o alerta do topo: **`formState` é um
Proxy** e só observa o que foi lido **durante o render**. Ler dentro de um callback não assina nada,
e o valor chega desatualizado — é a pegadinha mais comum da biblioteca.

```tsx
// Assina no render: este componente re-renderiza quando isDirty muda.
const { isDirty, isSubmitting } = form.formState

// NÃO faz o mesmo: leitura fora do render não cria assinatura.
const onClick = () => console.log(form.formState.isDirty)

<Button disabled={!isDirty || isSubmitting}>Salvar</Button>
```

#### docs/usecontroller/controller
[doc](https://react-hook-form.com/docs/usecontroller/controller)

**O que é:** o componente que registra um campo por render prop, entregando `field` (`value`,
`onChange`, `onBlur`, `name`, `ref`), `fieldState` (`invalid`, `isTouched`, `isDirty`, `error`) e
`formState`.
**Para que serve:** ligar componente controlado — Select, Combobox, DatePicker, Textarea do Base UI
— que não aceita `ref` de input nem dispara evento de DOM.
**Quando usar:** **em todo campo desta stack**. É a página para marcar: `register` é a exceção
aqui, não a regra. Ele também isola o re-render, já que só o campo que mudou renderiza de novo.

```tsx
<Controller
  name="address.uf"
  control={control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="form-uf">UF</FieldLabel>
      {/* `value` do Base UI é `null` quando nada foi escolhido; o formulário
          guarda `''`. Sem a conversão, o placeholder some no primeiro render. */}
      <Select
        items={NORTE_UFS}
        value={field.value || null}
        onValueChange={(value) => field.onChange(value ?? '')}
      >
        <SelectTrigger onBlur={field.onBlur} aria-invalid={fieldState.invalid} />
      </Select>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

#### docs/usefieldarray
[doc](https://react-hook-form.com/docs/usefieldarray)

**O que é:** o hook para campo que é lista: devolve `fields` e as operações `append`, `prepend`,
`insert`, `remove`, `swap`, `move`, `update` e `replace`.
**Para que serve:** formulário onde o usuário acrescenta e remove linhas — variação de post, item
de pedido, telefone extra.
**Quando usar:** **na primeira tela com lista dentro do formulário**. O repo ainda não tem uma, e o
erro clássico está esperando: **a `key` do React tem de ser `field.id`, nunca o índice** — com
índice, remover uma linha do meio embaralha os valores das outras.

```tsx
const { fields, append, remove } = useFieldArray({ control, name: 'variants' })

{fields.map((field, index) => (
  // field.id, não index: o índice muda quando uma linha do meio sai.
  <Controller
    key={field.id}
    name={`variants.${index}.sku`}
    control={control}
    render={({ field }) => <Input {...field} />}
  />
))}
```

#### docs/formprovider
[doc](https://react-hook-form.com/docs/formprovider)

**O que é:** o provider de contexto que disponibiliza a instância do formulário para qualquer
descendente, sem passar prop.
**Para que serve:** alcançar campo fundo na árvore, quando `control` teria de atravessar muitos
níveis.
**Quando usar:** só quando a prop realmente incomodar. O wizard tem quatro passos e passa `control`
por prop **de propósito** — a dependência fica explícita na assinatura, e o TypeScript confere o
tipo do formulário no filho. Contexto troca isso por um acoplamento invisível.

```tsx
// A alternativa que esta stack NÃO escolhe:
<FormProvider {...form}>
  <StepAddress />
</FormProvider>

// A que escolheu: dependência visível, e `Control<FormType>` tipado no filho.
<StepAddress control={form.control} />
```

#### docs/useformcontext
[doc](https://react-hook-form.com/docs/useformcontext)

**O que é:** o hook que lê a instância publicada pelo `FormProvider`.
**Para que serve:** consumir o formulário num descendente sem prop.
**Quando usar:** junto com o `FormProvider`, e com a mesma ressalva. Um detalhe que morde: o retorno
**não é tipado** com o seu formulário automaticamente — é preciso o genérico
`useFormContext<FormType>()`, e sem ele o nome de campo deixa de ser verificado.

```tsx
// Sem o genérico, `name` volta a ser string e o erro de digitação passa.
const { control } = useFormContext<AuthenticationSignUpPayload>()
```

#### docs/usewatch
[doc](https://react-hook-form.com/docs/usewatch)

**O que é:** a versão em hook do `watch`, que assina o valor **no componente que a chama** em vez de
na raiz do formulário.
**Para que serve:** ler valor em tempo real sem re-renderizar o formulário inteiro.
**Quando usar:** **sempre que `watch` seria usado dentro de um filho**. É a troca direta que mantém
o ganho de performance da biblioteca: um total que se recalcula, um campo que aparece conforme
outro, um resumo que espelha o que foi digitado.

```tsx
// Só este componente re-renderiza quando o CEP muda.
function CepStatus({ control }: { control: Control<FormType> }) {
  const cep = useWatch({ control, name: 'address.cep' })
  return <span>{cep.length === 8 ? 'Buscando…' : null}</span>
}
```

## Avançado

#### advanced-usage
[doc](https://react-hook-form.com/advanced-usage)

**O que é:** a página guarda-chuva das receitas avançadas, com todas as âncoras abaixo.
**Para que serve:** varrer os títulos e descobrir que o problema que você tem já tem nome e resposta
pronta.
**Quando usar:** quando o formulário sair do trivial — várias etapas, lista virtualizada, componente
de campo compartilhado. Vale um passar de olhos uma vez, para saber o que existe.

```tsx
// Os três casos que um formulário de verdade acaba vivendo estão aqui:
// #WizardFormFunnel, #ErrorMessages e #TransformandParse.
```

#### advanced-usage#AccessibilityA11y
[doc](https://react-hook-form.com/advanced-usage#AccessibilityA11y)

**O que é:** como tornar o formulário acessível: rótulo ligado ao campo, `aria-invalid`,
`aria-describedby` apontando para a mensagem, e o papel de `role="alert"` no erro.
**Para que serve:** que o leitor de tela anuncie o erro em vez de deixar o campo vermelho e mudo.
**Quando usar:** **ao criar componente de campo novo**. Os componentes de `components/ui/field.tsx`
já carregam parte disso, mas `aria-invalid` é passado à mão em cada campo — se um campo novo
esquecer, ninguém vê, exceto quem depende do leitor.

```tsx
// O par a repetir em todo campo: estado visual e estado anunciado.
<Field data-invalid={fieldState.invalid}>
  <FieldLabel htmlFor="form-cep">CEP</FieldLabel>
  <Input {...field} id="form-cep" aria-invalid={fieldState.invalid} />
  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
</Field>
```

#### advanced-usage#WizardFormFunnel
[doc](https://react-hook-form.com/advanced-usage#WizardFormFunnel)

**O que é:** a receita de formulário em várias etapas: uma instância de `useForm` só, cada passo
validado por `trigger`, e o submit no fim.
**Para que serve:** dividir um cadastro longo sem perder o valor digitado ao trocar de passo.
**Quando usar:** **antes de mexer no `multi-step-form.tsx`**. O wizard de cadastro é esta receita,
com duas adições que a página não tem: o mapa campo→passo, que leva o usuário de volta ao passo do
erro que o servidor apontou, e a navegação só para trás.

```tsx
// A adição necessária: 409 num campo do passo 1 tem de levar o usuário ao passo 1.
const FIELD_TO_STEP = new Map<string, number>(
  STEPS.flatMap((step, index) => step.fields.map((field) => [field, index])),
)

if (firstStepWithError !== null) {
  setCurrentStep(firstStepWithError)
  form.setFocus(STEPS[firstStepWithError].fields[0])
}
```

#### advanced-usage#SmartFormComponent
[doc](https://react-hook-form.com/advanced-usage#SmartFormComponent)

**O que é:** o padrão de um `<Form>` próprio que clona os filhos e injeta `register`
automaticamente.
**Para que serve:** cortar repetição num repositório com muitos formulários parecidos.
**Quando usar:** não use. O padrão depende de `React.cloneElement` e de inspecionar `children`, o
que quebra a tipagem do nome do campo e confunde o React Compiler, quando ele está ligado. A
repetição do `Controller` é chata e honesta; a mágica é barata e cara depois.

```tsx
// O que a receita propõe — e o que custa: `name` deixa de ser verificado.
React.cloneElement(child, { ...register(child.props.name) })
```

#### advanced-usage#ErrorMessages
[doc](https://react-hook-form.com/advanced-usage#ErrorMessages)

**O que é:** as formas de exibir mensagem de erro, incluindo campo aninhado, e o pacote
`@hookform/error-message`.
**Para que serve:** ver as opções antes de escrever a sua.
**Quando usar:** ao criar o componente que mostra erro. Aqui a decisão já está tomada: o
`FieldError` de `components/ui/field.tsx` faz esse papel, e `fieldState.error` chega nele direto do
`Controller`. Não instale o pacote extra — seria uma terceira forma de fazer a mesma coisa.

```tsx
// A forma desta stack, sem dependência a mais.
{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
```

#### advanced-usage#ConnectForm
[doc](https://react-hook-form.com/advanced-usage#ConnectForm)

**O que é:** um componente de render prop que entrega o contexto do formulário a um filho fundo na
árvore.
**Para que serve:** evitar `useFormContext` repetido em cada nível intermediário.
**Quando usar:** só num formulário que já use `FormProvider`, o que não é o caso aqui. Listado para
completar o par com `formprovider` e `useformcontext`.

```tsx
// Depende do FormProvider — que esta stack não usa. Veja docs/formprovider.
<ConnectForm>{({ control }) => <StepAddress control={control} />}</ConnectForm>
```

#### advanced-usage#FormProviderPerformance
[doc](https://react-hook-form.com/advanced-usage#FormProviderPerformance)

**O que é:** o custo do contexto: **todo consumidor do `FormProvider` re-renderiza** quando o
formulário re-renderiza, e como isolar com `memo`.
**Para que serve:** entender por que um formulário grande com provider fica lento sem que nenhum
campo específico seja o culpado.
**Quando usar:** antes de trocar `control` por prop por `FormProvider` "porque é mais limpo". Esta é
a página que dá o preço da troca, e um dos motivos de o wizard passar prop.

```tsx
// Se o provider entrar um dia, o memo entra junto — senão todo campo
// re-renderiza a cada tecla, que é o oposto do que a biblioteca promete.
const StepAddress = React.memo(function StepAddress() { /* ... */ })
```

#### advanced-usage#ControlledmixedwithUncontrolledComponents
[doc](https://react-hook-form.com/advanced-usage#ControlledmixedwithUncontrolledComponents)

**O que é:** como conviver com `register` e `Controller` no mesmo formulário.
**Para que serve:** ter o caminho de saída quando um formulário mistura input nativo e componente de
biblioteca.
**Quando usar:** ao acrescentar um `<input>` nativo num formulário que já é todo `Controller`. Vale
a regra de consistência: **um formulário, uma forma**. Misturar funciona, mas obriga quem lê a
conferir campo a campo qual mecanismo cada um usa.

```tsx
// Funciona, mas escolha um e mantenha dentro do mesmo formulário.
<input {...register('search')} />
<Controller name="status" control={control} render={({ field }) => <Select {...field} />} />
```

#### advanced-usage#CustomHookwithResolver
[doc](https://react-hook-form.com/advanced-usage#CustomHookwithResolver)

**O que é:** a receita de embrulhar `useForm` com o resolver já configurado, num hook próprio.
**Para que serve:** deixar de repetir `resolver: vineResolver(...)` e `mode` em cada formulário.
**Quando usar:** quando a repetição doer de verdade. Hoje são poucos formulários e cada um tem seu
schema; um hook agora seria abstração sem ganho. Se os `*-create-dialog.tsx` passarem de meia dúzia
com a mesma configuração, esta é a página.

```ts
// O dia em que valer a pena, é isto — e nada mais que isto.
function useVineForm<T extends FieldValues>(
  validator: Parameters<typeof vineResolver>[0],
  props?: UseFormProps<T>,
) {
  return useForm<T>({ resolver: vineResolver(validator), mode: 'onTouched', ...props })
}
```

#### advanced-usage#Workingwithvirtualizedlists
[doc](https://react-hook-form.com/advanced-usage#Workingwithvirtualizedlists)

**O que é:** o problema de formulário dentro de lista virtualizada: a linha que sai da tela é
desmontada, e com ela o campo.
**Para que serve:** não perder valor digitado ao rolar uma tabela editável.
**Quando usar:** se surgir edição em massa dentro de uma tabela grande — o cenário do
[`tanstack-table.md`](tanstack-table.md) com muitas linhas. A chave é `shouldUnregister: false`,
para o valor sobreviver à desmontagem da linha.

```tsx
// Sem isto, rolar a lista apaga o que foi digitado nas linhas que saíram.
useForm({ shouldUnregister: false })
```

#### advanced-usage#TestingForm
[doc](https://react-hook-form.com/advanced-usage#TestingForm)

**O que é:** como testar formulário com Testing Library: preencher por rótulo, submeter, e esperar a
mensagem de erro aparecer.
**Para que serve:** testar o que o usuário faz, e não o estado interno da biblioteca.
**Quando usar:** ao escrever o primeiro teste de formulário. O frontend já tem Vitest e Testing
Library instalados. O aviso que evita teste instável: **validação é assíncrona**, então a asserção
precisa de `await` — `findBy*` ou `waitFor`, nunca `getBy*` logo depois do clique.

```tsx
await userEvent.type(screen.getByLabelText('CEP'), '69000')
await userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

// findBy, não getBy: o resolver do VineJS resolve numa promessa — o
// `validate` da biblioteca é assíncrono por natureza.
expect(await screen.findByText('CEP deve ter 8 dígitos')).toBeInTheDocument()
```

#### advanced-usage#TransformandParse
[doc](https://react-hook-form.com/advanced-usage#TransformandParse)

**O que é:** o descompasso entre o que o `<input>` entrega — sempre string — e o que a aplicação
quer, e onde converter.
**Para que serve:** decidir o lugar da conversão: no campo, no resolver, ou no submit.
**Quando usar:** **em campo com máscara ou número**, que aqui é CNPJ, CEP e dinheiro. A decisão do
repo já está tomada e vale repetir: a conversão mora no **schema**, por `.transform()`, para que a
mesma regra valha venha o dado de onde vier — e para o backend nunca receber `12.345.678/0001-90`.

```ts
// A conversão vive no schema, não no onChange do campo.
export function cnpj() {
  return z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 14, { error: () => 'CNPJ deve ter 14 dígitos' })
}
```

#### advanced-usage#ServerActionsuseActionState
[doc](https://react-hook-form.com/advanced-usage#ServerActionsuseActionState)

**O que é:** a integração com Server Actions e `useActionState` do React 19, incluindo o modo
`progressive` que faz o formulário funcionar sem JavaScript.
**Para que serve:** submeter direto para o servidor, sem uma chamada de API escrita à mão.
**Quando usar:** não aqui. O frontend fala com o AdonisJS por HTTP, e a escrita passa pelas mutações
do TanStack Query, que cuidam de invalidação de cache e de erro. Server function do TanStack Start é
outra coisa e está em [`tanstack-start.md`](tanstack-start.md); esta receita é do modelo de Server
Actions, que o projeto não adota.

```tsx
// O caminho desta stack continua sendo a mutação, não a action.
const mutation = useAuthenticationSignUp({ onError, onSuccess })
```
