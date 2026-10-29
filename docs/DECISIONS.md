# Decisões

**<Projeto>** · escolhas difíceis de desfazer, com o porquê e o custo aceito

> Leia antes de decidir para não reabrir o que já foi resolvido. Decisão nova entra no fim.
> Só entra o que cumpre os três critérios: difícil de reverter, surpreendente para quem chega sem
> contexto, e com troca real (`_standards/documentation.md` §5).
> Regra que vale para todo projeto não fica aqui: vai para `_standards/DECISIONS.md` (upstream).
> Decisão ainda aberta fica na issue ou em `.specs/features/<f>/context.md`; fechada, vira linha aqui.

| # | Data | Tema | Decisão | Por quê | Alternativas descartadas | Custo aceito |
|---|---|---|---|---|---|---|
| 1 | AAAA-MM-DD | <Sessão em Redis> | <sessão no Redis com TTL nativo> | <expira sem job de limpeza> | <Postgres: exige varredura de expiração> | <um serviço a mais no compose e no deploy> |

- **Tema** é a decisão como substantivo ("Sessão em Redis"), não a pergunta ("Onde guardar a sessão?").
- **Por quê** traz as forças que pesaram, com número quando houver.
- **Alternativas descartadas** dizem a propriedade que desqualificou cada uma ("não expressa o
  próximo estado"), não um juízo vago ("menos limpo").
- **Custo aceito** é a consequência negativa honesta da escolha. Linha sem custo não foi pensada.

Decisão não se edita nem se apaga: a linha nova diz "substitui #N" e a antiga ganha
"substituída por #M" no Tema.
