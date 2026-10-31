# Fluxos do usuário

**Interclasse** · cada passo do primeiro acesso até concluir a tarefa

> Um fluxo por funcionalidade do `PRD.md` §4. Tela nova ou fluxo novo entra aqui no mesmo
> commit. O teste de ponta a ponta segue estes passos (`TEST-PLAN.md`).

## Jornadas principais

| Fluxo | Quem | Tela inicial | Resultado |
|---|---|---|---|
| [Entrar no painel](#entrar-no-painel) | os três papéis | `/sign-in` | painel aberto na primeira tela do papel |
| [Cadastrar uma turma](#cadastrar-uma-turma) | organização | `/administrator/classrooms` | turma no cartão da categoria certa |
| [Cadastrar uma modalidade](#cadastrar-uma-modalidade) | organização | `/administrator/sports` | modalidade na lista |
| [Gerir contas](#gerir-contas) | organização | `/administrator/users` | conta criada, arquivada ou excluída |
| [Inscrever atletas](#inscrever-atletas) | conselheiro, representante | `/advisor`, `/representative` | lista de atletas salva |
| [Tirar um atleta de uma modalidade](#tirar-um-atleta-de-uma-modalidade) | conselheiro | `/advisor` | atleta fora e aviso à organização |
| [Sortear uma chave](#sortear-uma-chave) | organização | `/administrator/brackets` | chave inteira montada |
| [Lançar o placar](#lançar-o-placar) | organização | `/administrator/matches` | vencedor avança; campeã ao fim |
| [Publicar um aviso](#publicar-um-aviso) | organização | `/administrator/announcements` | aviso no site |
| [Consultar o site público](#consultar-o-site-público) | público | `/` | jogos e classificação à vista |
| [Editar o site](#editar-o-site) | organização | `/administrator/site` | Sobre, regulamento e Instagram atualizados |
| [Enviar e aprovar fotos](#enviar-e-aprovar-fotos) | conselheiro, organização | `/advisor/photos`, `/administrator/photos` | foto no carrossel |
| [Baixar o relatório](#baixar-o-relatório) | organização | `/administrator/reports` | CSV baixado |
| [Trocar o idioma](#trocar-o-idioma) | todos | cabeçalho | mesma página no outro idioma |

---

## Entrar no painel

**Entrada:** botão "Entrar" no cabeçalho do site
**Pré-condição:** conta criada pela organização; não há cadastro público

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre "Entrar" | mostra o formulário | `/sign-in` |
| 2 | preenche e-mail e senha e envia | cria a sessão em cookie e abre o painel | `/dashboard` |
| 3 | nada | redireciona cada papel à primeira tela: organização em `/administrator`, conselheiro em `/advisor`, representante em `/representative` | área do papel |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| E-mail ou senha errados, conta arquivada ou inativa | a mesma mensagem de credenciais inválidas (401), sem dizer qual falhou |
| Muitas tentativas | a API bloqueia por 10 minutos (429) |
| Link com `?redirect=` | volta ao caminho interno pedido; endereço de fora é ignorado |
| Sessão vencida no painel | a API renova pelo cookie de refresh; se falhar, volta à tela de entrada |
| Papel sem acesso à área (403) | mensagem de acesso negado |

**Sair:** o menu da conta pede confirmação e apaga os tokens da sessão.

---

## Cadastrar uma turma

**Entrada:** Turmas › "Nova turma"
**Ação:** informa nome, ano (3º ao 9º), conselheiro e representante
**Sucesso:** a turma aparece no cartão da categoria que o ano determina (Fundamental 1 ou 2); toast de confirmação
**Falha:** mantém o formulário preenchido e marca o campo com o erro

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre Turmas | mostra cartões separados em Fundamental 1 e Fundamental 2 | `/administrator/classrooms` |
| 2 | clica em "Nova turma" e preenche | calcula a categoria pelo ano; lista só contas com o papel certo | `/administrator/classrooms/new` |
| 3 | salva | grava e volta à lista | `/administrator/classrooms` |
| 4 | abre uma turma | mostra conselheiro, representante e alunos | `/administrator/classrooms/$id` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Nome repetido | 409 no campo do nome |
| Ano fora de 3 a 9 | erro de validação |
| Conselheiro com outra turma (`ADVISOR_TAKEN`) | recusa; um conselheiro cuida de uma turma só |
| Conta indicada sem o papel certo | recusa (`ADVISOR_NOT_FOUND`, `REPRESENTATIVE_NOT_FOUND`) |
| Mudar o ano para outra categoria ou apagar a turma depois do sorteio | recusa (`CLASSROOM_CATEGORY_LOCKED`, `CLASSROOM_IN_COMPETITION`) |
| Sem turmas | estado vazio com "Nova turma" |

---

## Cadastrar uma modalidade

**Entrada:** Modalidades › "Nova modalidade"
**Ação:** informa nome, mínimo e máximo de atletas por turma
**Sucesso:** aparece na lista; passa a existir na lista de atletas das turmas
**Falha:** mantém o formulário e mostra o erro

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre Modalidades | lista paginada | `/administrator/sports` |
| 2 | cria ou edita | grava e gera o `slug` do nome | `/administrator/sports/new`, `/administrator/sports/$id/edit` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Mínimo maior que o máximo | recusa (`SPORT_INVALID_LIMITS`) |
| Reduzir o máximo abaixo do maior elenco já inscrito | recusa (`SPORT_ROSTER_ABOVE_LIMIT`) |
| Nome repetido | 409 |

---

## Gerir contas

**Entrada:** Usuários
**Ação:** criar, editar, arquivar, desarquivar ou excluir uma conta de um dos três papéis

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre Usuários | lista com filtros e ações em lote | `/administrator/users` |
| 2 | cria ou edita | grava; mudar senha ou papel encerra as sessões da conta | `/administrator/users/new`, `/administrator/users/$id/edit` |
| 3 | arquiva | a conta deixa de entrar e perde a sessão | menu da linha |
| 4 | desarquiva ou exclui | a conta volta a entrar, ou sai de vez | menu da linha |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| E-mail já usado | `USER_ALREADY_EXISTS` no campo do e-mail |
| Arquivar quem já está arquivado | `USER_ALREADY_ARCHIVED` |
| Excluir ou arquivar em lote | pede confirmação |

---

## Inscrever atletas

**Entrada:** o conselheiro abre "Minha turma"; o representante abre "Atletas da turma"
**Pré-condição:** turma com alunos cadastrados e modalidades criadas
**Ação:** marca os alunos de cada modalidade e salva a lista inteira
**Sucesso:** a lista fica salva; toast de confirmação

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | (conselheiro) cadastra os alunos da turma | grava os nomes | `/advisor/$classroomId` |
| 2 | marca os alunos por modalidade | mostra o contador contra o máximo da modalidade | `/advisor`, `/representative` |
| 3 | salva | troca a lista inteira de uma vez | |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Acima do máximo da modalidade | 422 (`ENROLLMENT_LIMIT_EXCEEDED`) com o máximo |
| Aluno de outra turma ou repetido | 422 apontando o campo |
| Representante depois do sorteio | 409 (`ENROLLMENT_LOCKED`); a lista trava para ele |
| Representante tentando tirar atleta já inscrito | 403; tirar é do conselheiro |
| Representante sem turma vinculada | 404 |
| Conselheiro depois do sorteio | pode trocar a lista; o time é a turma, e a chave não muda |
| Remover aluno que joga modalidade já sorteada | recusa (`STUDENT_IN_COMPETITION`) |

---

## Tirar um atleta de uma modalidade

**Entrada:** conselheiro, na lista de atletas
**Ação:** desmarca o aluno e informa o motivo
**Sucesso:** o atleta sai e a organização recebe um aviso pendente com o nome e o motivo

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | desmarca o atleta e escreve o motivo | grava a lista e cria o aviso | `/advisor` |
| 2 | (organização) abre Remoções de atleta | pendentes primeiro, com o contador | `/administrator/removals` |
| 3 | clica em "Ciente" | tira o aviso do contador; a data da primeira ciência não muda | |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Motivo vazio | 422 (`ENROLLMENT_REASON_REQUIRED`) e nada muda |
| Administrador tira o atleta | o aviso já nasce lido |
| Sem avisos | estado vazio |

---

## Sortear uma chave

**Entrada:** Chaves › "Sortear chave"
**Pré-condição:** modalidade com listas de atletas fechadas; pelo menos duas turmas na categoria com o mínimo de atletas
**Ação:** escolhe modalidade e categoria; a tela mostra antes quais turmas entram e quais ficam de fora
**Sucesso:** a chave inteira nasce, da primeira fase à final; abre o detalhe da chave
**Falha:** mostra o motivo e não grava nada

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | clica em "Sortear chave" | abre o diálogo | `/administrator/brackets` |
| 2 | escolhe modalidade e categoria | lista as turmas que entram ("Ficam de fora" lista as sem atletas suficientes) | diálogo |
| 3 | confirma | sorteia, grava chave, times e partidas e abre a chave | `/administrator/brackets/$id` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Sortear de novo a mesma modalidade e categoria | devolve a chave já sorteada, sem erro e sem novo sorteio |
| Menos de duas turmas (`NOT_ENOUGH_TEAMS`) | 409 |
| Mais turmas que a maior chave (`TOO_MANY_TEAMS`) | recusa |
| Número de turmas que não fecha potência de dois | as que sobram ficam de folga e entram direto na fase seguinte |
| Excluir a chave pela lista | pede confirmação; só sai sem placar lançado (`BRACKET_HAS_RESULTS`); as inscrições reabrem |
| Sem chaves | estado vazio com "Sortear chave" |

---

## Lançar o placar

**Entrada:** Partidas
**Pré-condição:** chave sorteada; partida com os dois times definidos
**Ação:** agenda data, hora e local; lança o placar; lança cartões
**Sucesso:** o vencedor avança para a partida seguinte; a final encerra a chave e define a campeã

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre Partidas | lista paginada com filtros | `/administrator/matches` |
| 2 | agenda a partida | grava data, hora e local | diálogo da partida |
| 3 | lança o placar (com "Venceu nos pênaltis" em caso de empate) | encerra a partida e move o vencedor | diálogo da partida |
| 4 | lança cartão (atleta, cor, observação) | grava o cartão no time do atleta | `/administrator/cards` ou diálogo |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Empate sem vencedor, ou vencedor de fora da partida | 422 (`MATCH_WINNER_REQUIRED`) |
| Placar negativo ou fracionado | 422 e nada grava |
| Partida sem os dois times (`MATCH_TEAMS_PENDING`) | 409 |
| Placar errado | "Desfazer placar" tira o resultado e o vencedor da partida seguinte |
| Desfazer ou corrigir com a partida seguinte já jogada | recusa (`MATCH_NEXT_PLAYED_ON_UNSCORE`, `MATCH_NEXT_PLAYED_ON_SCORE`) |
| Cartão para atleta que não é das duas turmas | recusa (`STUDENT_NOT_IN_MATCH`) |

---

## Publicar um aviso

**Entrada:** Avisos › "Novo aviso"
**Ação:** título, texto e se fica fixado
**Sucesso:** o aviso aparece em "Avisos" no site e na home

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | cria, edita ou apaga | grava; aviso fixado vem primeiro | `/administrator/announcements` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Sem avisos | o site mostra o estado vazio; o painel, "Novo aviso" |
| Título ou texto vazio | erro de validação no campo |

---

## Consultar o site público

**Entrada:** o endereço do site; não exige conta
**Resultado:** o público vê o próximo jogo, a tabela de jogos, a classificação e os avisos

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o site | mostra os últimos resultados, os próximos jogos, a classificação em abas, avisos e o carrossel de fotos aprovadas | `/` |
| 2 | abre "Jogos" | tabela com filtros de modalidade, categoria e situação | `/matches` |
| 3 | abre "Classificação" | abas por categoria (Fundamental 1, Fundamental 2) e modalidade, sem sair da página | `/standings` |
| 4 | abre uma chave | árvore do mata-mata | `/standings/$id` |
| 5 | abre "Avisos" | lista paginada | `/announcements` |
| 6 | abre "Sobre" | texto da organização, regulamento em PDF e Instagram | `/about` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Sem jogos marcados | "Nenhum jogo marcado. A agenda sai depois do sorteio." |
| Filtro sem resultado | "Nenhum jogo neste recorte." |
| Chave que não carrega | "Não foi possível carregar esta chave agora." |
| Sobre ainda não escrito | "A organização ainda não escreveu a apresentação dos jogos." |
| Endereço que não existe | página de não encontrado |

---

## Editar o site

**Entrada:** Site
**Ação:** edita "O que são os jogos", quem organiza, edição atual, ano da primeira edição, Instagram da escola e do desenvolvedor (sem @) e envia o regulamento em PDF
**Sucesso:** a página Sobre e o rodapé mostram o novo conteúdo

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | preenche os campos | valida | `/administrator/site` |
| 2 | envia o PDF do regulamento | sobe direto ao bucket e confirma | `/administrator/site` |
| 3 | salva | o site passa a mostrar o link de download | `/about` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Arquivo que não é PDF | recusa (`REGULATION_NOT_PDF`) |
| Upload interrompido | retoma pelas partes já enviadas |
| Campo deixado sem preencher | o site mostra o que a organização preencheu, nada inventado |

---

## Enviar e aprovar fotos

**Entrada:** o conselheiro abre "Fotos dos jogos"; a organização abre "Fotos"
**Ação:** o conselheiro envia a foto com legenda; a organização aprova ou recusa
**Sucesso:** a foto aprovada entra no carrossel do site

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | (conselheiro) envia a foto | grava como pendente e avisa que a organização aprova antes de ir ao ar | `/advisor/photos` |
| 2 | (organização) abre Fotos, filtra por situação | lista pendentes, aprovadas e recusadas | `/administrator/photos` |
| 3 | aprova ou recusa | aprovada entra no carrossel | `/` |
| 4 | muda de ideia | a decisão se refaz; a aprovada sai do ar sem ser apagada | `/administrator/photos` |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Foto enviada pela organização | já nasce aprovada |
| Arquivo que não é imagem | 422 (`PHOTO_NOT_IMAGE`) |
| Conselheiro apagando foto de outro | 404 |
| Apagar | pede confirmação ("Apagar esta foto?") |

---

## Baixar o relatório

**Entrada:** Relatórios
**Ação:** consulta os totais e exporta o CSV
**Sucesso:** o arquivo baixa e abre no Excel com acentos corretos

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre Relatórios | mostra totais por categoria, por modalidade e por turma (conselheiro, representante, alunos, atletas) | `/administrator/reports` |
| 2 | clica em exportar | baixa o CSV de turmas com BOM e `;` | download |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Sem turmas | totais zerados |
| Célula que começa com `=`, `+`, `-` ou `@` | sai com `'` na frente |

---

## Trocar o idioma

**Entrada:** o seletor de idioma no cabeçalho do site e do painel
**Resultado:** a mesma página no idioma escolhido (pt-BR, es ou en)

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | escolhe o idioma | leva à mesma página no outro idioma e passa o idioma à API | qualquer |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Mensagem de erro ou de validação da API | vem na língua escolhida; o `code` do erro não se traduz |
| Texto da tela sem tradução | continua em português até a tarefa 1.8 de `TASKS.md` |

---

## Checklist de todo fluxo

- [ ] Entrada clara (de onde o usuário chega).
- [ ] Toda ação tem retorno: carregando, sucesso, erro.
- [ ] Dá para voltar ao passo anterior.
- [ ] Estados vazio e de erro desenhados.
- [ ] Sucesso visível (mensagem ou mudança na tela).
- [ ] Funciona no celular.
