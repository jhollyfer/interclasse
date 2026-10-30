# OpenTimestamps

Carimbo do tempo ancorado no Bitcoin, sem carteira, sem moeda e sem custódia de chave.

> Conferido contra `@vitrified/typescript-opentimestamps@0.2.0` instalado, e escrito a partir dos
> tipos publicados (`dist/types/*.d.ts`) e do bundle (`dist/esm/index.js`). **A biblioteca não tem
> site de documentação**: o que existe é typedoc gerado do código, e por isso esta página descreve a
> API instalada em vez de citar páginas.
>
> **Procedência auditada.** O pacote é um fork descendente do HEAD oficial `12ba7b2c` de
> `typescript-opentimestamps`. O que a auditoria olhou: um único arquivo de lógica diverge do
> upstream, e o diff é comentário JSDoc; o bundle não contém `eval`, `child_process` nem
> `process.env`; a árvore de dependências tem um nó só (`@noble/hashes`). **Reauditar contra
> `12ba7b2c` em qualquer upgrade** - a superfície é pequena o bastante para isso ser um diff, e a
> biblioteca decide o que sai da máquina.
>
> A versão é fixa, **sem `^`**. Não é preciosismo: esta dependência fala com serviços externos em
> nome da plataforma, e um minor automático mudaria isso sem revisão.

**O que é:** um cliente OpenTimestamps em TypeScript. OpenTimestamps é um protocolo que agrega
milhares de hashes numa árvore Merkle, publica **uma** raiz numa transação do Bitcoin e devolve a
cada participante um recibo com o caminho da folha dele até aquela raiz. O recibo é o que prova que
o hash existia antes do bloco; o Bitcoin é só onde a raiz ficou imutável.

**Para que serve:** provar data sem depender de confiar em ninguém. Um carimbo RFC 3161 vale
enquanto a autoridade for íntegra e a chave dela não vazar; o OpenTimestamps não pede confiança em
autoridade nenhuma - quem confere olha a blockchain. O custo é o tempo: o recibo nasce provisório e
só amadurece quando o bloco confirma, o que leva de minutos a horas.

**Como usar:**

```bash
pnpm add @vitrified/typescript-opentimestamps@0.2.0
```

```ts
import { canVerify, read, submit, upgrade, write } from '@vitrified/typescript-opentimestamps'

// 1. Submeter. O que sai da máquina é o digest, e nem ele: a biblioteca soma um
//    "fudge" aleatório e envia o hash do conjunto.
const { timestamp, errors } = await submit('sha256', digest)

// 2. Guardar o recibo `.ots`, que é o artefato que se confere depois.
const receipt = write(timestamp)

// 3. Horas depois, amadurecer o recibo guardado.
const upgraded = await upgrade(read(receipt))

// 4. Confirmado é ter uma folha que não é mais `pending`.
if (canVerify(upgraded.timestamp)) {
  // o recibo agora aponta para um bloco do Bitcoin
}
```

**Quando usar a biblioteca:** quando a prova precisa valer **contra quem a produziu**. Se a data só
precisa ser confiável para quem já confia no emissor, um carimbo RFC 3161 resolve sozinho e responde
em segundos. As duas juntas cobrem o buraco uma da outra.

---

## Fundamentos

#### submit

**O que é:** manda o digest aos calendários e devolve o carimbo provisório.

**Assinatura:** `submit(algorithm, value, fudge?, calendarUrls?)` →
`Promise<{ timestamp: Timestamp; errors: Error[] }>`, com `algorithm` em
`'sha1' | 'ripemd160' | 'sha256' | 'keccak256'`.

**Para que serve:** obter, em segundos, um recibo que ainda não prova nada sozinho mas já
compromete os calendários a incluir aquele hash na próxima raiz que eles publicarem.

**Quando usar:** uma vez por hash, logo que ele existe. Submeter de novo o mesmo hash cria outro
recibo, não melhora o primeiro.

**O que precisa ser sabido, e não é óbvio:**

- **Ela não rejeita quando um calendário falha.** Cada endereço é tentado em paralelo, e o que não
  respondeu vira uma entrada em `errors` - o `timestamp` volta com as folhas dos que responderam.
  "Todos falharam" se reconhece pela árvore ficar **sem folha nenhuma**, e não por exceção.
- **O `fudge` é privacidade, não decoração.** Sem ele o calendário vê o digest exato; com ele vê
  `sha256(value || fudge)`, e o `fudge` de 16 bytes aleatórios fica só no recibo. O default é gerá-lo,
  e passar `Uint8Array.of()` desliga isso.
- **`calendarUrls` default é a lista pública** (`alice` e `bob` da opentimestamps.org, `finney` da
  Eternity Wall, `catallaxy`). Passar a lista explicitamente é o que torna o destino uma decisão do
  projeto em vez de um default de biblioteca.

```ts
import { submit } from '@vitrified/typescript-opentimestamps'

const { timestamp, errors } = await submit(
  'sha256',
  digest,
  undefined,
  ['https://alice.btc.calendar.opentimestamps.org'].map((url) => new URL(url))
)

// Nenhum calendário aceitou: não há o que guardar.
if (errors.length > 0 && !canUpgrade(timestamp)) throw new Error('nenhum calendário respondeu')
```

#### upgrade

**O que é:** pergunta aos calendários se o recibo provisório já entrou num bloco, e devolve o recibo
completo quando entrou.

**Assinatura:** `upgrade(timestamp)` → `Promise<{ timestamp: Timestamp; errors: Error[] }>`. Há
também `upgradeTree(tree, msg)` e `upgradeFromCalendar(calendarUrl, msg)`, um nível abaixo.

**Para que serve:** trocar a folha `pending`, que só aponta para um calendário, pela folha
`bitcoin`, que aponta para uma altura de bloco - é ela que faz o recibo se verificar sem falar com
ninguém.

**Quando usar:** repetidamente, num comando agendado, até o recibo amadurecer. Uma hora é o intervalo
razoável; abaixo disso a resposta é a mesma.

**O que precisa ser sabido:** recibo imaturo **não é erro**. O `upgrade` devolve o mesmo timestamp e
`errors` vazio, e tratar isso como falha marcaria como quebrado tudo que ainda está no caminho
normal do protocolo.

#### read / write

**O que é:** o par que converte entre o objeto `Timestamp` e os bytes do arquivo `.ots`.

**Assinatura:** `write(timestamp)` → `Uint8Array`; `read(bytes)` → `Timestamp` (lança quando os
bytes não são um `.ots`).

**Para que serve:** guardar o recibo fora do processo. O `.ots` é o formato do protocolo, lido pelo
cliente oficial em Python e por qualquer outra implementação.

**Quando usar:** `write` logo depois do `submit`, e `read` antes de cada `upgrade`.

```ts
const receipt = write(timestamp) // vai para o bucket
const again = read(receipt) // volta na execução seguinte
```

## Predicados

#### canUpgrade / canVerify / canShrink

**O que é:** três perguntas sobre o estado do recibo, sem rede.

**Assinatura:** `canUpgrade(timestamp)`, `canVerify(timestamp)`, `canShrink(timestamp, chain)` →
`boolean`.

**Para que serve:** decidir o estado sem inventar heurística. As implementações são de uma linha e
dizem exatamente isto:

| Função | Verdadeiro quando |
| --- | --- |
| `canUpgrade` | há **alguma** folha `pending` - ainda existe o que perguntar ao calendário |
| `canVerify` | há **alguma** folha que não é `pending` - o recibo já aponta para um bloco |
| `canShrink` | há mais de um caminho, e um deles é da cadeia pedida |

**O que precisa ser sabido:** as duas primeiras **não são opostas**. Um recibo submetido a quatro
calendários com um já confirmado e três ainda pendentes responde verdadeiro às duas. Para "este
recibo já está ancorado" a pergunta certa é `canVerify`; usar `!canUpgrade` manteria o recibo
provisório até o último calendário responder, que pode ser nunca.

#### info

**O que é:** o recibo em texto, uma operação por linha.

**Assinatura:** `info(timestamp, verbose?)` → `string`.

**Para que serve:** registro legível, e - na prática - o único caminho público até a **altura do
bloco**: a folha `bitcoin` aparece como `bitcoinVerify(msg, 912345)`. O tipo `Leaf` traz `height`,
mas percorrer a árvore para achá-lo depende de `treeToPaths`, que é interno.

```ts
const height = /bitcoinVerify\(msg, (\d+)\)/.exec(info(timestamp))?.[1] ?? null
```

## Verificação

#### verify

**O que é:** confere o recibo contra a blockchain de verdade.

**Assinatura:** `verify(timestamp)` → `Promise<...>`, com `verifiers` para escolher a fonte.

**O que precisa ser sabido:** os verificadores embutidos consultam `blockstream.info` e
`blockchain.info`. É rede para fora, para serviços de terceiros, e num processo de servidor isso é
uma dependência externa a mais. Guardar o `.ots` e deixar a verificação para quem confere - que é o
ponto do protocolo - evita essa dependência inteira.

## Meta

**O que a biblioteca não oferece, e é bom saber antes:**

- **Não há como injetar o transporte.** `submit` e `upgrade` chamam o `fetch` global direto. Testar
  sem rede exige envolvê-las numa costura própria, e é o que este projeto faz
  (`app/services/opentimestamps.service.ts`).
- **Não há timeout configurável.** O `fetch` é chamado sem `signal`, então o teto que vale é o do
  runtime - no Node, os timeouts de cabeçalho e de corpo do undici. Um calendário que aceita a
  conexão e não responde segura a chamada até lá.
- **O `postinstall` cria links simbólicos para o build CJS.** Com o pnpm recusando scripts de
  dependência (o caso deste repositório), o pacote continua íntegro para quem importa por ESM, que é
  o caminho declarado em `exports.default`. Não aprovar o script é a escolha certa aqui.
- **Licença LGPL-3.0-or-later**, diferente do MIT do resto da árvore. Uso como biblioteca, sem
  modificação e sem redistribuição do fonte dela, é o caso que a licença cobre sem obrigação extra.
