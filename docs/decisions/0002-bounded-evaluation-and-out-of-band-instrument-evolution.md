# ADR 0002: Bounded Evaluation and Out-of-Band Instrument Evolution

- Data: 2026-08-08
- Status: aprovado
- Complementa: [RFC 0001: Theory First Promptfoo Foundation](0001-theory-first-promptfoo-foundation.md)
- Branch de trabalho: feat/theory-first-promptfoo-foundation

## Contexto

O RFC 0001 estabelece que ausência de evidência e observabilidade insuficiente não podem ser promovidas a sucesso. Também define budgets, stopping conditions, separação entre desenvolvimento e decisão, invalidação de runs e evolução condicionada da infraestrutura.

Essas regras não tornam explícito, porém, se um resultado `INCONCLUSIVE` encerra a tentativa corrente ou autoriza o sistema a modificar repetidamente Judge, reasoning, tracing, adapters ou provider até obter uma conclusão.

Sem uma regra adicional, uma implementação poderia transformar:

~~~
evaluate skill
→ insufficient evidence
→ INCONCLUSIVE
~~~

em um ciclo adaptativo de desenvolvimento do instrumento. Isso tornaria custo, término e condição experimental dependentes dos resultados observados.

## Decisão

### 1. Bounded evaluation

Toda avaliação deve possuir configuração, orçamento, política de repetição e condições de término prespecificados.

`INCONCLUSIVE` é terminal para o case ou claim naquela execução. Não significa:

~~~
RETRY_UNTIL_CONCLUSIVE
~~~

`INCONCLUSIVE` é status de case ou claim, não `RunStatus`. Um run pode terminar como `COMPLETED` contendo resultados inconclusivos e uma conclusão limitada ou inelegível.

### 2. Capability preflight

Antes de qualquer chamada de Executor ou Judge, o sistema deve confrontar cada required evidence com a capability/observability matrix aplicável à condição exata do instrumento.

A matrix deve ser identificada por versão e registrar a elegibilidade da capacidade para o propósito do run. A mera disponibilidade de um sinal experimental não o torna elegível para decisão.

O preflight avalia a semântica completa de cada evidence requirement, incluindo conjunções obrigatórias e caminhos alternativos permitidos pelo Blueprint. A indisponibilidade de um item isolado não bloqueia nem exclui um claim quando outro caminho elegível ainda consegue satisfazer o requirement.

O preflight aplica estas regras:

| Condição | Resultado |
| --- | --- |
| Nenhum caminho elegível consegue satisfazer o evidence requirement de claim decision critical | `BLOCKED`; nenhum decision run é iniciado |
| Nenhum caminho elegível consegue satisfazer o evidence requirement de claim não crítico | claim `NOT_EVALUATED`, com limitação explícita |
| Ao menos um caminho elegível satisfaz cada evidence requirement dos claims críticos | execução pode prosseguir, sujeita aos demais gates |

Uma decisão favorável pode ser produzida sem avaliar claims não críticos somente quando a decision policy prespecificada permitir e a conclusão excluir explicitamente esses claims.

### 3. Deficiências descobertas durante a execução

A execução corrente nunca modifica o instrumento para perseguir conclusividade.

Quando uma deficiência é descoberta depois do preflight:

| Situação | Semântica |
| --- | --- |
| O instrumento funcionou conforme sua condição elegível, mas a observação necessária para determinar satisfação ou violação permaneceu indisponível ou ambígua | case ou claim `INCONCLUSIVE` |
| Evidência direta qualificada estabelece a ausência de um efeito obrigatório ou a ocorrência de um efeito proibido | case `FAIL`; claim agregado conforme o Blueprint, sem neutralização por Judge favorável |
| Uma capacidade declarada elegível pelo instrumento não foi preservada | run `INVALIDATED`, com `INSTRUMENT_DEFECT` ou `REQUIRED_EVIDENCE_MISSING` |
| O provider ou a infraestrutura falhou operacionalmente | `ERROR` conforme a política do run |

Missing observation e observed absence são semanticamente distintos. Quando a superfície é capaz de observar diretamente uma propriedade e a ausência observada constitui violação do contract, essa observação é evidência de `FAIL`, não falta de evidência.

Esses resultados podem gerar findings de desenvolvimento, mas não autorizam alteração automática da execução corrente.

### 4. Repetições e retries

Repetições e retries são permitidos somente quando:

- foram prespecificados;
- permanecem dentro dos budgets;
- preservam a configuração congelada do instrumento;
- possuem failure semantics e provenance explícitas.

Retries técnicos de uma mesma operação não podem alterar modelo, reasoning, Judge, rubric, tracing, adapter, provider, required evidence, threshold ou decision policy.

Repetições planejadas representam amostras do desenho declarado. Elas não podem continuar adaptativamente até aparecer um resultado conclusivo ou favorável.

### 5. Infrastructure improvement is out of band

Mudanças em tracing, adapters, App Server, provider surface, Judge, reasoning ou outra infraestrutura pertencem a trabalho separado com propósito `DEVELOPMENT`.

Uma melhoria do instrumento deve produzir, conforme aplicável:

- nova versão ou fingerprint da capacidade;
- capability/observability matrix revisada;
- qualification renovada;
- novo freeze;
- novo `runId`;
- novo decision material quando o material anterior tiver sido exposto ou o run invalidado.

`skill-evidence evaluate <skill>` não cria adapters, troca infraestrutura nem promove automaticamente findings a mudanças do instrumento.

## Consequências

- Falhas conhecidas de capacidade são detectadas antes das chamadas caras de Executor e Judge.
- Caminhos alternativos de evidência permanecem válidos quando satisfazem a semântica declarada pelo Blueprint.
- Ausência diretamente observada que viola o contract permanece `FAIL`, não `INCONCLUSIVE`.
- Claims não críticos não bloqueiam automaticamente toda a decisão, mas permanecem explicitamente fora do alcance da conclusão.
- Claims críticos sem evidência elegível bloqueiam a decision run.
- Custos e término não dependem de uma busca adaptativa por conclusividade.
- Melhorias do instrumento permanecem auditáveis e separadas da avaliação da skill.

## Relação com o RFC 0001

Esta decisão não altera os status, gates ou a arquitetura do RFC 0001. Ela torna normativa a interpretação operacional de bounded conclusions, budget gates, development/decision separation, run invalidation e stop rules.

O ExecPlan 1 de E0–E2 continua inalterado. A capability/observability matrix produzida por G2 será uma entrada futura do preflight definido aqui.
