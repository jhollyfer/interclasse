import { test } from '@japa/runner'
import { authenticateAsAdministrator, resetDatabase } from '../helpers.ts'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import openapi from '#config/openapi'

/**
 * O documento OpenAPI commitado.
 *
 * O gerador **deriva** o documento do AST dos controllers, e é justamente por
 * isso que ele pode perder uma operação em silêncio: renomear o export de um
 * validator sem mexer no controller não quebra o build, o `loadValidator`
 * engole a falha do import e a operação sai do documento sem um erro sequer.
 *
 * A guarda contra isso é `node ace openapi:generate --check`. Este arquivo é a
 * segunda metade da guarda: confere que o `openapi.json` do repositório
 * descreve o roteador de verdade, comparando com `router.toJSON()` em vez de
 * com uma lista escrita à mão - uma rota nova cai na comparação por construção.
 */

type Documento = {
  paths: Record<string, Record<string, { operationId: string; responses: Record<string, unknown> }>>
}

let documento: Documento | undefined

async function lerDocumento(): Promise<Documento> {
  if (!documento) {
    documento = JSON.parse(await readFile(app.makePath('openapi.json'), 'utf-8'))
  }

  return documento!
}

/**
 * `/administrator/notices/:id` -> `/administrator/notices/{id}`, que é a forma
 * que o OpenAPI usa. A conversão é a mesma de `document.ts`; repeti-la aqui é
 * o que permite comparar as duas fontes sem importar o gerador.
 */
function paraOpenAPI(pattern: string): string {
  return pattern.replace(/:(\w+)/g, '{$1}')
}

/** Toda operação registrada: caminho e verbo, sem os `HEAD` que o framework gera. */
function operacoesRegistradas(): Array<{ caminho: string; metodo: string }> {
  const operacoes: Array<{ caminho: string; metodo: string }> = []

  for (const rota of Object.values(router.toJSON()).flat()) {
    const caminho = paraOpenAPI(rota.pattern)

    if (openapi.ignore.includes(caminho) || openapi.ignore.includes(rota.pattern)) continue

    for (const metodo of rota.methods) {
      if (metodo === 'HEAD') continue

      operacoes.push({ caminho, metodo: metodo.toLowerCase() })
    }
  }

  return operacoes
}

test.group('documentação > o documento descreve o roteador', () => {
  test('toda rota registrada está no documento', async ({ assert }) => {
    const { paths } = await lerDocumento()
    const faltando = operacoesRegistradas().filter(
      ({ caminho, metodo }) => !paths[caminho]?.[metodo]
    )

    // A mensagem lista o que falta em vez de só falhar: quem quebrar isto
    // renomeando um validator precisa saber qual operação sumiu, e o `--check`
    // sozinho só diz que o arquivo divergiu.
    assert.deepEqual(
      faltando,
      [],
      `operações registradas e ausentes do openapi.json: ${faltando
        .map(({ metodo, caminho }) => `${metodo.toUpperCase()} ${caminho}`)
        .join(', ')}. Rode \`node ace openapi:generate\`.`
    )
  })

  test('o documento não descreve rota que não existe', async ({ assert }) => {
    const { paths } = await lerDocumento()
    const registradas = new Set(
      operacoesRegistradas().map(({ caminho, metodo }) => `${metodo} ${caminho}`)
    )

    const sobrando: string[] = []

    for (const [caminho, operacoes] of Object.entries(paths)) {
      for (const metodo of Object.keys(operacoes)) {
        if (!registradas.has(`${metodo} ${caminho}`)) sobrando.push(`${metodo} ${caminho}`)
      }
    }

    assert.deepEqual(sobrando, [], `o documento promete o que o roteador não serve: ${sobrando}`)
  })

  test('nenhuma operação fica sem resposta descrita', async ({ assert }) => {
    const { paths } = await lerDocumento()
    const mudas: string[] = []

    for (const [caminho, operacoes] of Object.entries(paths)) {
      for (const [metodo, operacao] of Object.entries(operacoes)) {
        // Só as respostas de sucesso contam: as de falha o gerador monta
        // sozinho a partir da proteção da rota, então estarem lá não prova nada
        // sobre o contrato de quem chamou e deu certo.
        const sucesso = Object.keys(operacao.responses).filter((status) => Number(status) < 400)

        if (sucesso.length === 0) mudas.push(`${metodo.toUpperCase()} ${caminho}`)
      }
    }

    assert.deepEqual(mudas, [], `operações sem resposta de sucesso descrita: ${mudas}`)
  })

  test('o identificador de cada operação é único', async ({ assert }) => {
    const { paths } = await lerDocumento()
    const vistos = new Map<string, string>()
    const repetidos: string[] = []

    for (const [caminho, operacoes] of Object.entries(paths)) {
      for (const [metodo, operacao] of Object.entries(operacoes)) {
        const anterior = vistos.get(operacao.operationId)

        // `operationId` é o que vira nome de função em cliente gerado. Dois
        // iguais não quebram o documento, quebram o cliente - silenciosamente,
        // sobrescrevendo uma das duas.
        if (anterior) repetidos.push(`${operacao.operationId}: ${anterior} e ${metodo} ${caminho}`)

        vistos.set(operacao.operationId, `${metodo} ${caminho}`)
      }
    }

    assert.deepEqual(repetidos, [], `operationId repetido: ${repetidos}`)
  })
})

/**
 * As quatro rotas que não são operação de API.
 *
 * A raiz e a sonda não exigem sessão; a referência da API exige, e responde
 * 404 para quem não opera a instalação. Nenhuma aparece no próprio documento:
 * se fossem operação, estariam documentadas como as outras.
 */
test.group('documentação > as rotas de serviço', (group) => {
  group.each.setup(() => resetDatabase())

  test('a raiz responde ok, e não redireciona mais para a documentação', async ({
    client,
    assert,
  }) => {
    // Redirecionava para `/documentation`, que hoje é gateada: mandar todo
    // mundo para uma rota que responde 404 é pior que responder aqui.
    const response = await client.get('/').redirects(0)

    response.assertStatus(200)
    assert.deepEqual(response.body(), { status: 'ok' })
  })

  test('a sonda responde ok e não conta nada da infraestrutura', async ({ client, assert }) => {
    const response = await client.get('/health')

    response.assertStatus(200)

    // Igualdade profunda, e não `assertBodyContains`: o que se afirma é que o
    // corpo é **só** isto. Uso de disco, memória ou contagem de conexões numa
    // sonda pública seria informação de infraestrutura de graça para quem pedir.
    assert.deepEqual(response.body(), { status: 'ok' })
  })

  test('sem sessão, o documento responde 404 e não 403', async ({ client }) => {
    // 404 e não 403: um 403 confirmaria que a rota existe e que há um papel que
    // a alcança. Para quem não pode ver, ela simplesmente não está lá.
    const semSessaoNoJson = await client.get('/openapi.json')
    const semSessaoNaPagina = await client.get('/documentation')

    semSessaoNoJson.assertStatus(404)
    semSessaoNaPagina.assertStatus(404)
  })

  test('o documento é servido como JSON para quem opera', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/openapi.json').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'application/json')
    assert.equal(response.body().openapi, '3.1.0')
  })

  test('a página de referência é servida como HTML para quem opera', async ({ client, assert }) => {
    const session = await authenticateAsAdministrator(client)
    const response = await client.get('/documentation').cookies(session)

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'text/html')
    assert.include(response.text(), '/openapi.json')
  })

  test('nenhuma delas aparece no documento', async ({ assert }) => {
    const { paths } = await lerDocumento()

    for (const caminho of ['/', '/health', '/openapi.json', '/documentation']) {
      assert.isUndefined(paths[caminho], `${caminho} está documentado, e não é operação de API`)
    }
  })

  test('a raiz e a sonda não exigem sessão', async ({ client, assert }) => {
    for (const caminho of ['/', '/health']) {
      const response = await client.get(caminho).redirects(0)

      assert.equal(response.status(), 200, `${caminho} exigiu sessão`)
    }
  })

  test('a referência não responde 401 nem 403 sem sessão', async ({ client, assert }) => {
    // Ela **exige** sessão, mas não pode dizer isso: 401 e 403 confirmam que a
    // rota existe. O 404 é a recusa que não conta nada.
    for (const caminho of ['/openapi.json', '/documentation']) {
      const response = await client.get(caminho).redirects(0)

      assert.equal(response.status(), 404, `${caminho} contou que existe`)
    }
  })
})
