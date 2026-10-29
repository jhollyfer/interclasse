# Documento de requisitos

**Interclasse** · sistema dos Jogos Interclasse (JIC) do CMEI Cosme Jean: inscrição de atletas, sorteio das chaves, tabela de jogos, placar e classificação

| Versão | Status | Data | Dono do produto | Meta |
|---|---|---|---|---|
| 0.1 | Em produção | 2026-10-29 | A confirmar (ver §8) | Operação dos jogos inteira no sistema, com o site público no ar |

> Escopo é decisão do dono do produto. O agente não altera este arquivo sem pedido; viu
> contradição entre a tarefa e o PRD, pergunta.

## 1. Problema

A organização dos Jogos Interclasse envolve turmas do 3º ao 9º ano, várias modalidades, listas de
atletas por turma, sorteio das chaves, agenda de partidas e placar. Sem um sistema, a lista de atletas
e o sorteio ficam em papel e planilha, o professor não sabe quem a turma inscreveu, e o público
(alunos e famílias) não tem onde ver o próximo jogo e a classificação. O sistema reúne tudo isso e
publica o resultado num site aberto.

O produto vem do site anterior dos jogos, cuja identidade visual (verde de campo e amarelo) ele herda.

## 2. Para quem

| Perfil | Quem é | O que precisa |
|---|---|---|
| Organização (`ADMINISTRATOR`) | quem coordena os jogos | cadastrar turmas, modalidades e contas; sortear as chaves; agendar partidas e lançar placar e cartões; publicar avisos, fotos e o conteúdo do site; ver relatórios |
| Professor conselheiro (`ADVISOR`) | professor responsável por uma turma (uma só) | cadastrar os alunos da turma e inscrever atletas por modalidade, inclusive depois do sorteio; enviar fotos dos jogos |
| Aluno representante (`REPRESENTATIVE`) | aluno que representa a turma | montar a lista de atletas da própria turma antes do sorteio |
| Público | alunos, famílias e comunidade escolar, sem conta | ver jogos, classificação, avisos, a página Sobre, o regulamento e as fotos |

## 3. Objetivos

- Toda a operação dos jogos (turmas, inscrições, sorteio, partidas, placar, cartões) passa pelo sistema, sem planilha paralela.
- O sorteio de cada modalidade e categoria acontece uma vez e não se perde: repetir o pedido devolve a chave já sorteada.
- O público consulta jogos e classificação por categoria e modalidade, no celular, sem criar conta.
- O conteúdo do site (Sobre, regulamento, Instagram, fotos) é mantido pela organização, sem mexer em código.
- A troca de idioma entre português, espanhol e inglês funciona de ponta a ponta na API (mensagens de erro e de validação); os textos das telas seguem em português até a tarefa 1.8 de `TASKS.md`.

## 4. Primeira versão (MVP)

| # | Funcionalidade | Para quem | Fluxo |
|---|---|---|---|
| 1 | Entrar e sair; perfil da conta | os três papéis | `USER-FLOWS.md#entrar-no-painel` |
| 2 | Cadastro de turmas (3º ao 9º ano), com categoria derivada do ano, conselheiro e representante | organização | `USER-FLOWS.md#cadastrar-uma-turma` |
| 3 | Cadastro de modalidades com mínimo e máximo de atletas | organização | `USER-FLOWS.md#cadastrar-uma-modalidade` |
| 4 | Contas de acesso: criar, editar, arquivar, desarquivar, excluir | organização | `USER-FLOWS.md#gerir-contas` |
| 5 | Alunos da turma e lista de atletas por modalidade | conselheiro, representante | `USER-FLOWS.md#inscrever-atletas` |
| 6 | Aviso de atleta tirado de modalidade, com motivo | conselheiro, organização | `USER-FLOWS.md#tirar-um-atleta-de-uma-modalidade` |
| 7 | Sorteio das chaves de mata-mata por modalidade e categoria; excluir chave | organização | `USER-FLOWS.md#sortear-uma-chave` |
| 8 | Partidas: agenda, placar, desfazer placar, e cartões amarelos e vermelhos | organização | `USER-FLOWS.md#lançar-o-placar` |
| 9 | Avisos publicados no site | organização | `USER-FLOWS.md#publicar-um-aviso` |
| 10 | Site público: início, jogos, classificação em abas, avisos, Sobre | público | `USER-FLOWS.md#consultar-o-site-público` |
| 11 | Página Sobre, regulamento em PDF e Instagram editáveis | organização | `USER-FLOWS.md#editar-o-site` |
| 12 | Carrossel de fotos: o conselheiro envia, a organização aprova ou recusa | conselheiro, organização | `USER-FLOWS.md#enviar-e-aprovar-fotos` |
| 13 | Relatórios de turmas, alunos e atletas, com exportação em CSV | organização | `USER-FLOWS.md#baixar-o-relatório` |
| 14 | Troca de idioma pt-BR, es e en; a API responde na língua escolhida | todos | `USER-FLOWS.md#trocar-o-idioma` |

## 5. Fica de fora (nesta versão)

- Galeria de fotos completa e páginas de edições anteriores do site antigo: o carrossel de fotos aprovadas substitui a galeria.
- Cadastro público de conta e recuperação de senha: as contas são criadas pela organização.
- Fases de grupos e pontos corridos: o formato é só mata-mata, do sorteio à final, com folga para as turmas que sobram.
- Aplicativo de celular: o site é responsivo.
- Tradução dos textos das telas para espanhol e inglês: fica para a tarefa 1.8 de `TASKS.md`.

## 6. Requisitos não funcionais

| Tema | Requisito |
|---|---|
| Desempenho | listas do painel paginadas no servidor; páginas públicas com dados renderizados no servidor (SSR) |
| Disponibilidade | durante o período dos jogos; deploy por imagem Docker com health check em `/health-check` |
| Acessibilidade | WCAG 2.1 AA (`DESIGN.md` §10) |
| Dispositivos | celular primeiro; o público consulta pelo celular, a organização usa também o computador |
| Idiomas | pt-BR (base), es e en nas mensagens da API e na troca de idioma; telas ainda só em pt-BR |
| Fuso | horários guardados em UTC e mostrados em `America/Manaus` |
| Dados pessoais | nome de aluno (menor de idade), nome, e-mail e senha de usuário, foto enviada pelo conselheiro; o site público não mostra nome de atleta (detalhe em `SECURITY.md` §8) |

## 7. Métricas de sucesso

| Métrica | Hoje | Meta | Como medir |
|---|---|---|---|
| Não definidas pelo dono | n/d | n/d | ver §8 |

## 8. Perguntas em aberto

- [ ] Quem é o dono do produto e qual é a meta, com data, para a próxima edição dos jogos? Quem responde: organização dos jogos.
- [ ] Quais métricas de sucesso valem (por exemplo, listas fechadas antes do sorteio, acessos ao site durante os jogos)? Quem responde: organização dos jogos.
- [ ] Qual e-mail recebe os relatos de falha de segurança (`SECURITY.md` §1)? Quem responde: organização dos jogos.
- [ ] O cadastro de conta continua só pela organização, ou conselheiro e representante poderão pedir acesso? Quem responde: organização dos jogos.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-10-29 | Primeira versão, escrita a partir do código |
