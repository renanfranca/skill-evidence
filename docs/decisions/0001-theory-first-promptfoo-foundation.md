# RFC 0001: Theory First Promptfoo Foundation

- Data: 2026-08-08
- Status: direção arquitetural aprovada com ressalvas; não aprovada como ExecPlan único
- Branch de trabalho: feat/theory-first-promptfoo-foundation
- Base: main
- THEORY consultada: commit [572e963ea6f1207ab53c533592cb70a8239e221c](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Revisão técnica: 2026-08-08

## Status e regra de interpretação

Este documento preserva integralmente a especificação apresentada pelo analista, com formatação Markdown e sem o artefato de interface “Pensou por 41s”. A direção foi aprovada como RFC arquitetural e roadmap experimental.

Este RFC não aprova E0–E11 como um único ExecPlan. Antes da implementação de cada etapa, os bloqueadores da revisão técnica precisam ser resolvidos no ExecPlan correspondente. Em caso de conflito, a THEORY prevalece; em seguida, as ressalvas da revisão técnica limitam a execução da especificação preservada.

## Fontes verificadas

- [A Theory of Evaluating Probabilistic Skills](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- [OpenAI Codex SDK provider](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/)
- [Promptfoo Node API](https://www.promptfoo.dev/docs/usage/node-api-reference/)
- [Promptfoo Codex App Server provider](https://www.promptfoo.dev/docs/providers/openai-codex-app-server/)
- [Promptfoo Agent Rubric](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/agent-rubric/)
- [OpenAI GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)

## Evidência de viabilidade em 2026-08-08

No momento da revisão:

- a branch estava baseada diretamente em main e continha apenas LICENSE, .gitignore e AGENTS.md;
- nenhum código da V1 havia sido copiado;
- Node 24.16.0 e npm 11.13.0 estavam ativos;
- Codex CLI 0.147.0 estava instalado;
- Codex estava autenticado por ChatGPT;
- OPENAI_API_KEY e CODEX_API_KEY estavam ausentes;
- Promptfoo e @openai/codex-sdk ainda não estavam instalados na nova branch.

Essas observações tornam E1 plausível, mas não substituem o smoke test nem autorizam registrar provenance que o provider não exponha diretamente.

## Revisão técnica normativa

### Decisões aprovadas

- THEORY é a autoridade normativa; a V1 é corpus histórico e não arquitetura de referência.
- Promptfoo deve possuir infraestrutura genérica enquanto preservar as propriedades semânticas exigidas.
- Claims, behavioral contracts, qualification, eligibility e evidence policy pertencem ao Skill Evidence.
- Evidência direta prevalece sobre inferência semântica e judges.
- Ausência de evidência obrigatória produz INCONCLUSIVE; falha de infraestrutura produz ERROR.
- Development material e decision material permanecem separados.
- Eval Author, Executor e Judge possuem configuração e provenance independentes.
- Codex SDK é o baseline; App Server exige evidência experimental e ExecPlan separado.

### Bloqueadores antes de um ExecPlan end-to-end

1. A interface pode começar somente com a skill, mas a skill não fornece necessariamente decisão, população, thresholds, tolerância a dano ou precisão exigida. O Author deve poder produzir Blueprint DRAFT ou BLOCKED e questões obrigatórias, sem inventar contexto decisório.
2. EvaluationBlueprint 0.1 precisa definir condições e contrastes, medidas primárias e secundárias, thresholds, limites de dano, incerteza, randomização, blocking, repetições, inclusão, exclusão, missing trials, multiplicidade e aggregation.
3. Os estados de Blueprint, Oracle e Run precisam ser formalizados. O mínimo recomendado é:
   - Blueprint: DRAFT, READY, BLOCKED, FROZEN, SUPERSEDED;
   - Oracle: ELIGIBLE, NOT_ELIGIBLE;
   - Run purpose: DEVELOPMENT, DECISION;
   - Run status: COMPLETED, ABORTED, INVALIDATED, ERROR.
4. Intake precisa definir symlinks, traversal, arquivos ignorados, binários, limites, credenciais, canonicalização, ordenação, permissões e mutação concorrente.
5. Qualification precisa definir repetições, regra de aprovação, respostas inválidas, divergência, múltiplos avaliadores, adjudicação, escopo e invalidação.
6. E2 precisa provar se eventos desconhecidos e lacunas de observabilidade chegam ao Skill Evidence. Se Promptfoo ocultar a lacuna, R2 não pode ser garantido apenas pelo agregador.

### Limites técnicos

- Preferir a API Node pública evaluate() do Promptfoo e evitar process orchestration própria. O compiler deve produzir uma representação serializável e determinística consumida pelo runner.
- Tracing é uma superfície experimental. Qualquer evidência decisória dependente dela exige versão fixada, characterization test e invalidação após mudança.
- CODEX_HOME deve apontar para um home externo já autenticado. Credenciais nunca entram no repositório ou nos artefatos.
- authMode = chatgpt só pode ser registrado como fato se E1 demonstrar uma observação confiável; ausência de API keys, isoladamente, não deve ser apresentada como metadado emitido pelo provider.
- Sandbox, approvals e rede precisam ser definidos separadamente para Author, Executor, Judge e cada experimento.

### Decomposição obrigatória

- RFC: este documento.
- ExecPlan 1: E0–E2, terminando na caracterização de observabilidade e ownership matrix provisória.
- ExecPlan 2: E3, corpus arqueológico offline.
- ExecPlan 3: E4–E5, Eval Author e benchmark cego.
- E6–E9: somente após aprovação dos gates anteriores.
- E10 e E11: fora da feature foundation e em ExecPlans próprios.

### Critérios para promoção

Uma etapa deste RFC pode virar ExecPlan quando:

- suas decisões públicas e estados estiverem completos;
- entradas, outputs e failure semantics estiverem definidos;
- dependências de experimentos anteriores tiverem resultado registrado;
- critérios RED/GREEN e validações forem reproduzíveis;
- custos, chamadas reais e autorizações estiverem limitados;
- o ExecPlan registrar o commit vigente da THEORY.

---

## Especificação original preservada

A especificação abaixo já está orientada para uma nova implementação, e não para migração incremental da V1. O branch antigo entra apenas como corpus de aprendizagem e regressão.

# FEATURE: Theory First Promptfoo Foundation

## Especificação de implementação

### Status

Proposta para implementação em branch novo.

### Branch proposto

"feat/theory-first-promptfoo-foundation"

### Base obrigatória

Criar o branch a partir de "main".

Não criar a partir de "feat/skill-evidence-v1".

Não fazer merge, rebase ou cherry pick do branch antigo para iniciar esta implementação.

O estado atual de "main" contém somente a licença, permitindo uma fundação efetivamente limpa. A implementação existente permanece isolada em "feat/skill-evidence-v1".

---

## 1. Decisão arquitetural

Esta implementação não é uma V2 incremental do runner atual.

Ela parte de uma nova premissa:

> O Skill Evidence não deve implementar infraestrutura genérica de avaliação quando uma infraestrutura madura, como Promptfoo, puder assumir essa responsabilidade sem enfraquecer as conclusões autorizadas pela THEORY.

A referência normativa não é a implementação existente.

A referência normativa é:

A Theory of Evaluating Probabilistic Skills.

A implementação antiga passa a possuir três papéis apenas:

1. fonte histórica de problemas reais;
2. corpus de regressões;
3. referência comparativa para comportamentos que precisem ser novamente justificados.

Ela não é gold standard.

Ela não define automaticamente a arquitetura futura.

Ela não deve ser copiada por compatibilidade.

## 2. Hierarquia de autoridade

Quando houver conflito entre fontes, usar a seguinte precedência:

~~~
THEORY
  ↓
esta especificação
  ↓
contratos e schemas da nova implementação
  ↓
comportamento documentado do Promptfoo
  ↓
experimentos executados na nova implementação
  ↓
implementação histórica
~~~

A implementação histórica nunca deve prevalecer sobre a THEORY apenas porque determinado comportamento já existe.

A THEORY estabelece, entre outras propriedades, que:

- a avaliação mede uma distribuição de comportamento condicionada ao sistema e ambiente avaliados;
- claims diferentes exigem desenhos diferentes;
- behavioral contracts são a unidade semântica da avaliação;
- evidência diretamente verificável deve ser preferida quando disponível;
- judges não podem fabricar evidência ausente;
- development cases devem permanecer separados de decision cases;
- oracles precisam ser qualificados antes de sustentar decisões;
- evidência de um claim não autoriza automaticamente outro claim;
- um critical direct failure não pode ser neutralizado por um judge favorável.

## 3. Objetivo do produto

A experiência alvo continua sendo:

~~~
skill-evidence evaluate <skill-directory>
~~~

O operador fornece somente a skill.

O sistema deverá progressivamente ser capaz de:

~~~
skill directory
      ↓
understanding
      ↓
Evaluation Blueprint
      ↓
qualified evaluation
      ↓
Promptfoo execution
      ↓
evidence
      ↓
bounded conclusions
~~~

O usuário não deve precisar fornecer manualmente:

- cases;
- contracts;
- fixtures;
- assertions;
- rubrics;
- oracles;
- qualification examples.

Isso não significa que o sistema esteja autorizado a inventá los livremente.

O sistema deve derivá los de forma auditável e declarar explicitamente quando informação suficiente não puder ser inferida.

## 4. Definição de skill

"<skill-directory>" significa o diretório completo da skill.

O intake deve considerar:

~~~
SKILL.md
references/
scripts/
templates/
examples/
schemas/
outros artefatos locais pertencentes à skill
~~~

"SKILL.md" é a entrada principal, mas não deve ser assumido como representação completa da skill.

Uma futura modalidade estrita:

~~~
skill-evidence evaluate ./SKILL.md
~~~

fica fora do escopo inicial.

## 5. Princípio de implementação mínima

A nova arquitetura deve seguir:

> Promptfoo owns generic eval infrastructure unless evidence demonstrates that it cannot preserve a required semantic property.

Portanto, não criar inicialmente abstrações próprias para:

- execução Codex;
- parsing genérico do protocolo Codex;
- gerenciamento genérico de sessões;
- framework genérico de assertions;
- sistema genérico de model graders;
- sistema genérico de datasets;
- tracing genérico;
- provider abstraction genérica;
- orchestration genérica que Promptfoo já oferece.

Promptfoo atualmente oferece provider "openai:codex-sdk" com working directory, sandbox, approval policy, network controls, modelo explícito, reasoning effort, token usage, session IDs e tracing de shell/MCP/search/file.

Código próprio nessas áreas exige justificativa experimental explícita.

## 6. Regra contra arqueologia arquitetural

Nenhum arquivo de implementação de "feat/skill-evidence-v1" deve ser copiado para o novo branch apenas para acelerar desenvolvimento.

Em particular, não copiar inicialmente equivalentes de:

~~~
runner.ts
checks.ts
events.ts
process orchestration
Codex JSONL parser
judge invocation layer
workspace orchestration layer
~~~

Uma ideia da implementação anterior pode ser reimplementada somente quando:

1. a THEORY exigir aquela propriedade; ou
2. um experimento demonstrar que Promptfoo não a fornece adequadamente.

O código novo deve nascer da responsabilidade atual, e não da forma como a responsabilidade era implementada anteriormente.

## 7. Uso permitido do branch histórico

O branch histórico deve continuar disponível.

Ele poderá ser consultado para construir um:

"Archaeological Regression Corpus"

Esse corpus deve capturar classes de falha descobertas anteriormente sem importar a arquitetura que as produziu.

No mínimo:

### R1. Absolute executable path

Um caminho absoluto correspondente ao executável observado não pode ser automaticamente interpretado como escrita fora do workspace.

### R2. Unknown executor event

Um novo tipo de evento relevante para observabilidade não pode ser silenciosamente ignorado.

Se comprometer evidência necessária:

~~~
case → INCONCLUSIVE
~~~

e não:

~~~
case → PASS
~~~

### R3. Semantic equivalence

Uma resposta como:

> No refactor was justified.

não pode falhar simplesmente porque uma implementação procurava literalmente:

> no action

quando identidade lexical não faz parte do contrato.

### R4. Judge blindness

Calibration input não pode revelar direta ou indiretamente o expected status.

### R5. Missing evidence

Judge não pode transformar ausência de observabilidade em PASS.

### R6. Direct critical violation

Uma violação crítica observada diretamente deve prevalecer sobre julgamento semântico favorável.

Essas regressões devem ser implementadas novamente a partir de seus princípios, não copiando os antigos checkers.

## 8. Arquitetura alvo

~~~
                     SKILL DIRECTORY
                           │
                           ▼
                        INTAKE
                  fingerprint / snapshot
                           │
                           ▼
                    EVALUATION AUTHOR
                       model A
                           │
                           ▼
                 EVALUATION BLUEPRINT
                           │
                    schema validation
                           │
                   author qualification
                           │
                           ▼
                       COMPILER
                           │
                           ▼
                       PROMPTFOO
               ┌───────────┼───────────┐
               │           │           │
               ▼           ▼           ▼
           EXECUTOR     DIRECT      SEMANTIC
                       EVIDENCE       JUDGE
            Luna          │        Terra initially
             │            │           │
             └────────────┼───────────┘
                          ▼
                     RAW RESULTS
                          │
                          ▼
                   SKILL EVIDENCE
                 qualification
                   eligibility
                     claims
                   provenance
                     review
~~~

Promptfoo é infrastructure.

Skill Evidence é semantics + qualification + evidence policy.

## 9. Três funções de modelo distintas

Não tratar “usar IA” como uma única função.

Existem três papéis:

~~~
Eval Author
Executor
Judge
~~~

Eles devem possuir configuração e provenance independentes.

### Baseline inicial

#### Executor

~~~
model = gpt-5.6-luna
reasoning = max
~~~

#### Judge

~~~
model = gpt-5.6-terra
reasoning = xhigh
~~~

#### Eval Author

TBD

Não escolher imediatamente o modelo mais caro para autoria.

Primeiro criar benchmark.

Depois selecionar o menor compute que preserve a qualidade necessária.

Promptfoo atualmente suporta "model" e "model_reasoning_effort" no provider Codex SDK, incluindo Luna, Terra e Sol da família GPT 5.6.

## 10. Authentication baseline

Usar inicialmente:

~~~
Promptfoo
   ↓
openai:codex-sdk
   ↓
Codex SDK
   ↓
ChatGPT authentication
~~~

Não depender de API key no baseline.

A documentação atual informa que o provider consegue reutilizar um login Codex/ChatGPT existente quando "apiKey", "OPENAI_API_KEY" e "CODEX_API_KEY" não estão presentes.

Usar "CODEX_HOME" explicitamente controlado.

Não habilitar:

~~~
inherit_process_env: true
~~~

sem necessidade demonstrada.

Promptfoo utiliza por padrão um ambiente reduzido para o subprocesso Codex, o que é preferível para isolamento.

## 11. Evaluation Blueprint

O output principal do Eval Author não deve ser YAML Promptfoo.

O output principal será um artefato próprio:

"EvaluationBlueprint"

Versão inicial:

~~~json
{
  "schemaVersion": "0.1",
  "skill": {},
  "decision": {},
  "population": {},
  "claims": [],
  "exclusions": [],
  "contracts": [],
  "activationRegions": {
    "positive": [],
    "negative": [],
    "boundary": []
  },
  "usageFamilies": [],
  "stressFamilies": [],
  "requiredEvidence": [],
  "oracleQualificationPlan": [],
  "samplingPlan": {},
  "stoppingConditions": [],
  "untestedRisks": [],
  "authorProvenance": {}
}
~~~

## 12. Claims

Cada claim deve possuir pelo menos:

~~~
id
type
statement
population
conditions
requiredEvidence
decisionCritical
limitations
~~~

Tipos iniciais deverão ser alinhados à THEORY, por exemplo:

~~~
observed-behavior
activation-quality
instructional-fidelity
outcome-quality
process-compliance
safety-noninterference
operational-efficiency
discriminatory-power
skill-contribution
change-effect
stability
robustness
regression-protection
generalization
~~~

Não autorizar automaticamente todos esses claims.

Se o desenho produzido não puder sustentar determinado claim:

~~~
claim = NOT_EVALUATED
~~~

## 13. Behavioral Contract

Cada contract deverá expressar semanticamente:

~~~
id
claimIds
preconditions
taskFamily
activationExpectation
acceptableDecisionClasses
requiredEffects
prohibitedEffects
temporalConstraints
authorityConstraints
recoveryBehavior
stoppingBehavior
responsibilityBoundary
requiredEvidence
severity
~~~

Contracts não devem prescrever wording acidental.

Exact strings só são permitidas quando identidade textual for realmente uma obrigação externa do comportamento.

A THEORY explicitamente define contratos como conjuntos de trajetórias comportamentalmente equivalentes e recomenda especificar apenas a ordem necessária quando temporalidade importa.

## 14. Evidência

Cada requirement deve declarar de que evidência depende.

Prioridade:

~~~
direct evidence
      ↓
structured deterministic inference
      ↓
semantic evidence
      ↓
LLM judge
~~~

Nunca inverter essa ordem por conveniência.

Exemplos de direct evidence:

~~~
filesystem state
git diff
file existence
file absence
JSON structure
schema validation
command effects
exit status
temporal relation
observable tool use
prohibited write
preserved state
~~~

Promptfoo deve executar essas verificações diretamente sempre que sua assertion surface for suficiente.

Small adapters podem existir quando necessário.

## 15. Regra para criação de adapters

Um adapter próprio somente pode ser criado quando houver um registro semelhante a:

~~~
Required property:
Observable fact:
Why Promptfoo native surface is insufficient:
Proposed adapter:
Failure semantics:
Test proving necessity:
~~~

Não criar adapter porque implementar localmente parece mais simples.

## 16. "skill-used"

Não tratar:

~~~
skill-used = true
~~~

como prova de contribuição causal nem como prova de satisfação do contrato.

No provider Codex SDK, Promptfoo atualmente infere skill usage heuristicamente a partir de leituras observadas de "SKILL.md"; não existe um evento first class de skill invocation nessa superfície.

Portanto:

~~~
skill read
~~~

pode sustentar evidência limitada sobre activation/process.

Não sustenta automaticamente:

~~~
skill caused correct result
~~~

Skill contribution exige contraste adequado.

## 17. App Server escalation rule

Não iniciar com Codex App Server.

Baseline:

~~~
openai:codex-sdk
~~~

App Server somente deve entrar se um experimento provar que uma propriedade decisória precisa de eventos não expostos adequadamente pelo SDK.

Promptfoo recomenda SDK para automação comum e reserva App Server para superfícies mais ricas como streamed items, approvals, skills, plugins, connectors e lifecycle metadata.

A adoção de App Server requer um ExecPlan separado.

## 18. Judge qualification

"llm-rubric" ou "agent-rubric" não são verdade por definição.

Antes de um semantic judge produzir evidência decisória:

~~~
oracle
  ↓
qualification probes
  ↓
judge
  ↓
qualification result
  ↓
eligible / not eligible
~~~

Cada oracle deverá possuir no mínimo:

~~~
known-valid
known-invalid
alternative-valid
unsupported-fluency
~~~

Expected status permanece fora do judge input.

Baseline:

~~~
known-valid          → PASS
known-invalid        → FAIL
alternative-valid    → PASS
unsupported-fluency  → INCONCLUSIVE
~~~

Se o judge falhar na qualification:

~~~
oracle = NOT_ELIGIBLE
~~~

e nenhum resultado produzido por ele poderá sustentar decisão.

## 19. "llm-rubric" versus "agent-rubric"

Não selecionar um único mecanismo antecipadamente.

### "llm-rubric"

Preferir quando todas as evidências necessárias puderem ser serializadas de forma segura e suficiente.

### "agent-rubric"

Investigar quando o grader precisar inspecionar:

~~~
workspace
source
generated artifacts
repository state
file relationships
~~~

Promptfoo disponibiliza "agent-rubric" especificamente para graders com acesso a workspace e recomenda sandbox read only para esse uso.

Todo agent grader deve usar inicialmente:

~~~
sandbox_mode: read-only
approval_policy: never
network_access_enabled: false
~~~

## 20. Prompt injection boundary

Todo conteúdo produzido pelo executor ou presente no workspace avaliado é dado não confiável para o judge.

O judge não deve obedecer instruções encontradas nesses artefatos.

Qualification deverá incluir probes adversariais contra:

~~~
embedded instructions
fabricated evidence
confidence theater
misleading fluency
condition leakage
~~~

## 21. Development versus decision

A separação é obrigatória.

Pipeline:

~~~
development
    ↓
author development
    ↓
contract refinement
    ↓
oracle refinement
    ↓
evaluation strategy freeze
    ↓
fresh decision material
    ↓
decision execution
~~~

Nunca selecionar retrospectivamente os melhores resultados de development como decision evidence.

Decision cases expostos durante debugging deixam de ser decision cases.

## 22. Evaluation Author

O principal experimento desta implementação é:

~~~
skill directory
      ↓
Eval Author
      ↓
Evaluation Blueprint
~~~

O Eval Author receberá inicialmente somente:

~~~
skill snapshot
THEORY based authoring instructions
Promptfoo Evals operational knowledge
~~~

Não receberá:

~~~
historic evaluation
historic contracts
historic cases
historic oracles
historic judge packets
historic expected answers
historic qualification packages
~~~

O Promptfoo Evals skill pode servir como conhecimento operacional, mas não como teoria de avaliação.

A própria skill oficial do Promptfoo pressupõe conhecimento sobre o que está sendo avaliado e sobre acceptance criteria/failure modes; quando essas informações não existem, ela recomenda scaffolding em vez de inferir uma avaliação epistemologicamente completa.

Portanto, descobrir esses critérios é responsabilidade do Skill Evidence Author.

## 23. Author uncertainty

O Eval Author não deve ser recompensado por parecer completo.

Ele deve poder declarar:

~~~
UNKNOWN
UNSUPPORTED
INSUFFICIENT_INFORMATION
UNTETESTABLE_FROM_AVAILABLE_ENVIRONMENT
~~~

Inventar um contrato plausível é pior do que declarar incerteza.

## 24. Benchmark do Eval Author

A avaliação histórica não deve ser chamada de gold.

Ela será:

"adjudicated reference evaluation"

O benchmark deve ser cego.

O Author recebe apenas a skill e os inputs permitidos.

Depois comparar:

~~~
claim recall
claim precision
critical contract recall
invented contract rate
overly specific contract rate
positive activation coverage
negative activation coverage
boundary coverage
prohibited effects
blocking decisions
recovery paths
temporal constraints
valid alternatives
required direct evidence
oracle requirements
unsupported claim exclusions
~~~

Toda divergência importante entre Author e reference deve ser adjudicada com base na THEORY.

A referência humana também pode estar errada ou incompleta.

## 25. Promptfoo compiler

Somente depois de existir um Blueprint validado:

~~~
Evaluation Blueprint
        ↓
compiler
        ↓
Promptfoo suite
~~~

O compiler deve ser essencialmente determinístico.

Ele não deve reinterpretar semanticamente a skill.

Suas responsabilidades incluem:

~~~
contracts → test families
direct evidence → deterministic assertions
semantic requirements → qualified rubrics
fixtures → Promptfoo vars/workspaces
models → explicit providers
budgets → execution configuration
provenance → metadata
~~~

Blueprint é source of truth.

YAML Promptfoo é build artifact.

## 26. Case expansion

Separar:

~~~
structure discovery
~~~

de:

~~~
case expansion
~~~

O Author descobre estrutura.

Promptfoo ou um generator pode ampliar:

~~~
semantic variants
personas
values
locale variations
edge cases
stress variants
~~~

Nenhum generator pode criar silenciosamente um novo contract decisório.

Se uma expansão revelar um novo failure mechanism:

~~~
candidate contract
      ↓
author/adjudication
      ↓
blueprint revision
~~~

## 27. Cost policy

Primeiro reduzir chamadas.

Depois reduzir compute.

Ordem obrigatória:

1. eliminate unnecessary LLM calls
2. replace semantic checks with direct evidence
3. consolidate compatible semantic grading
4. reduce reasoning effort
5. compare cheaper models

Não otimizar começando pela troca de Terra por Luna.

## 28. Budget gates

Não usar uma estimativa monetária como único mecanismo de autorização.

Gates controláveis:

~~~
maximum author sessions
maximum generated cases
maximum development cases
maximum decision cases
maximum repetitions
maximum executor calls
maximum judge calls
per case timeout
maximum total execution time
~~~

Registrar quando disponíveis:

~~~
input tokens
cached input tokens
output tokens
reasoning tokens
estimated cost
~~~

Não produzir falsa precisão quando Promptfoo não conseguir calcular custo completo.

A documentação atual informa que token usage é exposto pelo Codex SDK provider, enquanto certos custos podem permanecer indefinidos dependendo das informações de pricing disponíveis.

## 29. Provenance

Toda chamada de modelo relevante deve registrar:

~~~json
{
  "role": "author | executor | judge",
  "provider": "openai:codex-sdk",
  "model": "...",
  "reasoningEffort": "...",
  "providerConfigFingerprint": "...",
  "promptfooVersion": "...",
  "codexSdkVersion": "...",
  "codexCliVersion": "...",
  "authMode": "chatgpt",
  "sessionId": "...",
  "tokenUsage": {},
  "caseId": "...",
  "assertionId": "...",
  "qualificationId": "..."
}
~~~

Nunca armazenar apenas:

~~~
judge = Codex
~~~

## 30. Status semantics

Preservar semanticamente, mas reimplementar do zero:

### Case

~~~
PASS
FAIL
INCONCLUSIVE
ERROR
~~~

### Claim

~~~
SUPPORTED
NOT_SUPPORTED
INCONCLUSIVE
NOT_EVALUATED
~~~

Regras:

~~~
missing required evidence
    → INCONCLUSIVE

runtime/infrastructure failure
    → ERROR

qualified evidence violates contract
    → FAIL

all mandatory qualified evidence satisfies contract
    → PASS
~~~

Claim aggregation deve respeitar os requisitos declarados no Blueprint.

Uma média favorável não pode compensar uma violação crítica.

## 31. Suggested repository structure

Estrutura inicial mínima:

~~~
src/
  cli/
  intake/
  blueprint/
    schema.ts
    types.ts
  author/
  promptfoo/
    compiler/
    runner/
  qualification/
  evidence/
  provenance/
  adapters/

schemas/
  evaluation-blueprint.schema.json
  evidence.schema.json

tests/
  unit/
  integration/
  regression/
    archaeological/

fixtures/
  skills/
  workspaces/

experiments/
  E1-auth/
  E2-observability/
  E3-regressions/
  E4-author/
  E5-author-benchmark/
  E6-compiler/
  E7-oracle-qualification/

docs/
  execplans/
  decisions/
~~~

Não criar pastas sem uso imediato.

## 32. CLI durante desenvolvimento

A interface final continua:

~~~
skill-evidence evaluate <skill>
~~~

Mas a exploração pode expor comandos internos menores:

~~~
skill-evidence inspect <skill>

skill-evidence author <skill>
  --out blueprint.json

skill-evidence validate-blueprint blueprint.json

skill-evidence compile blueprint.json
  --out .skill-evidence/suite/

skill-evidence run blueprint.json
~~~

Esses comandos existem para tornar cada estágio observável e testável.

"evaluate" posteriormente compõe o pipeline.

## 33. Ordem dos experimentos

### E0 — Clean foundation

Criar branch a partir de "main".

Adicionar somente:

~~~
package scaffold
TypeScript
lint
format
tests
Promptfoo dependency
Codex SDK dependency
minimal CLI
~~~

Critério:

~~~
zero implementation code copied from v1
~~~

### E1 — Authentication smoke test

Provar:

~~~
Promptfoo
→ openai:codex-sdk
→ ChatGPT login
→ Luna Max
~~~

Sem "OPENAI_API_KEY".

Sem "CODEX_API_KEY".

Output esperado simples e determinístico.

Registrar versões.

#### Gate G1

Não avançar se authentication mode não estiver inequivocamente provado.

### E2 — Disposable observability canary

Criar uma skill e workspace descartáveis exclusivamente para o experimento.

Não usar decision case histórico.

Verificar se Promptfoo entrega superfície suficiente para observar:

~~~
final response
session ID
token usage
filesystem consequences
command trajectory
file operations
runtime errors
skill usage metadata
~~~

#### Gate G2

Classificar cada necessidade:

~~~
NATIVE
ADAPTER
INSUFFICIENT
~~~

Se uma evidência crítica for insuficiente, decidir entre adapter e spike App Server.

### E3 — Archaeological regression corpus

Reimplementar offline as classes de falha históricas.

Nenhuma chamada real de modelo necessária.

O objetivo é provar que a nova evidence semantics não reproduz bugs já conhecidos.

#### Gate G3

Todos os regressions devem passar antes de qualquer decision material.

### E4 — Evaluation Author v0

Implementar:

~~~
skill
→ blueprint
~~~

Sem compiler Promptfoo completo.

Sem execução decisória.

Primeiro objetivo:

conseguimos descobrir uma avaliação defensável?

### E5 — Blind Author benchmark

Executar o Author sobre uma skill com reference evaluation existente sem mostrar a reference.

Adjudicar divergências.

Medir precision e recall de estrutura.

#### Gate G5

Não avançar para automação end to end se o Author:

- inventar requisitos críticos frequentemente;
- perder contratos críticos;
- confundir usage com stress;
- não identificar negative activation;
- produzir evidência incompatível com os claims;
- produzir oracles não qualificáveis.

### E6 — Blueprint compiler

Implementar deterministicamente:

~~~
blueprint
→ Promptfoo suite
~~~

Testar compiler sem modelos sempre que possível.

### E7 — Oracle generation and qualification

Gerar qualification probes.

Executar judge baseline.

Confirmar:

~~~
known valid
known invalid
alternative valid
unsupported fluency
~~~

#### Gate G7

Nenhum oracle não qualificado entra em decision suite.

### E8 — Development canary real

Executar material exclusivamente development.

Exercitar:

~~~
author output
compiler
Promptfoo
executor
direct assertions
judge qualification
semantic judge
evidence aggregation
~~~

Não produzir conclusão sobre a skill.

#### Gate G8

Qualquer mudança material posterior em:

~~~
Blueprint
compiler
schemas
Promptfoo version
Codex SDK
model condition
judge policy
~~~

revoga o canary.

### E9 — Freeze

Congelar:

~~~
skill fingerprint
Blueprint
compiler version
Promptfoo version
Codex SDK version
model configuration
judge configuration
qualification
sampling plan
stopping rules
~~~

Só então gerar ou selecionar fresh decision material.

### E10 — Decision evaluation

Executar casos inéditos.

Nenhuma alteração retrospectiva de contrato ou threshold é permitida para transformar resultado desfavorável em favorável.

Mudança necessária após início da decision evaluation:

~~~
run invalidated
→ finding becomes development information
→ new decision material required
~~~

### E11 — Model optimization

Somente depois do pipeline qualificado.

#### Executor

Comparar inicialmente:

~~~
Luna max
Luna xhigh
Luna high
~~~

#### Judge

Comparar:

~~~
Terra xhigh
Terra high
Luna max
~~~

#### Author

Criar matriz própria conforme benchmark demonstrar necessidade.

Critério:

> menor compute que continua preservando as propriedades decisórias exigidas.

## 34. Responsabilidades presumidas

A investigação começa com esta hipótese:

| Responsabilidade | Dono presumido |
| --- | --- |
| Codex invocation | Promptfoo |
| Provider lifecycle | Promptfoo |
| Generic sandbox configuration | Promptfoo |
| Session IDs | Promptfoo |
| Generic trajectory | Promptfoo |
| Token usage | Promptfoo |
| Generic assertions | Promptfoo |
| Dataset expansion | Promptfoo |
| LLM grader invocation | Promptfoo |
| Agent grader invocation | Promptfoo |
| Skill intake | Skill Evidence |
| Fingerprint policy | Skill Evidence |
| Evaluation Blueprint | Skill Evidence |
| Claims | Skill Evidence |
| Behavioral contracts | Skill Evidence |
| Activation boundaries | Skill Evidence |
| Required evidence policy | Skill Evidence |
| Oracle generation policy | Skill Evidence |
| Oracle qualification | Skill Evidence |
| Eligibility | Skill Evidence |
| Case/claim semantics | Skill Evidence |
| Development/decision isolation | Skill Evidence |
| Provenance requirements | Skill Evidence |
| Review | Skill Evidence |
| Archive | Skill Evidence |
| Missing deterministic checks | Small Adapter |
| Rich Codex protocol events | Not justified yet |

A exploração pode mudar essa tabela.

Não presumir que Skill Evidence precisa manter uma responsabilidade apenas porque ela existia anteriormente.

## 35. Definition of Done desta feature

Esta feature não termina quando Promptfoo executa um YAML.

Ela termina quando conseguimos demonstrar:

1. branch novo realmente independente da V1;
2. autenticação ChatGPT funcionando via Codex SDK;
3. modelos e reasoning explicitamente fixados;
4. observabilidade Promptfoo caracterizada;
5. regressões arqueológicas protegidas;
6. Evaluation Blueprint schema implementado;
7. Eval Author produzindo Blueprint a partir somente da skill;
8. Author benchmark cego executado;
9. falsos contratos medidos;
10. compiler Blueprint → Promptfoo funcionando;
11. direct evidence priorizada;
12. judges semanticamente separados do executor;
13. oracle qualification funcionando;
14. development e decision material separados;
15. provenance suficiente para auditoria;
16. um development canary real concluído sem defeito de instrumento;
17. uma ownership matrix final produzida;
18. todo código próprio existente possuir justificativa explícita.

## 36. Critério de fracasso da exploração

A exploração também deve poder concluir que uma hipótese não funciona.

Resultados válidos incluem:

~~~
Promptfoo observability insufficient
Eval Author unreliable
automatic contract inference insufficient
oracle generation not defensible
certain evidence requires custom adapter
App Server required
some claims cannot be automated
~~~

Não contornar um resultado negativo apenas adicionando mais código até o experimento “passar”.

O objetivo é descobrir a menor arquitetura defensável.

## 37. Regra de stop

Não executar decision cases reais enquanto qualquer um destes pontos estiver aberto:

~~~
instrument instability
unknown critical event
unqualified oracle
unfrozen Blueprint
unfrozen decision rules
missing required evidence
unresolved regression from historical corpus
~~~

Nenhuma quantidade de judge compute corrige measurement invalidity.

## 38. Resultado arquitetural desejado

Se a hipótese principal se confirmar, o produto deverá convergir para:

~~~
Skill Evidence
│
├── intake
├── Evaluation Author
├── Evaluation Blueprint
├── qualification
├── evidence policy
├── eligibility
├── provenance
├── review
└── archive
        │
        ▼
     Promptfoo
        │
   ┌────┼────┐
   │    │    │
 cases checks agents
   │    │    │
   └────┼────┘
        ▼
   Codex SDK
~~~

O diferencial do produto deixa de ser:

> “possuímos nosso próprio framework de avaliação”.

E passa a ser:

> “transformamos uma skill probabilística em uma avaliação fundamentada, auditável e falsificável, qualificamos a evidência antes de permitir conclusões e delegamos execução genérica a uma infraestrutura especializada.”

## 39. Pergunta que deve orientar cada Pull Request

Antes de adicionar uma nova abstração própria, responder:

> Esta responsabilidade é necessária para preservar alguma propriedade exigida pela THEORY que Promptfoo não consegue fornecer?

Se a resposta for:

~~~
não
~~~

não implementar.

Se for:

~~~
não sabemos
~~~

fazer spike.

Somente se for:

~~~
sim, e temos evidência
~~~

a responsabilidade entra no Skill Evidence.

## 40. Princípio final

Esta feature não é uma migração da V1.

É uma reconstrução da arquitetura a partir das responsabilidades essenciais.

A V1 permanece valiosa porque revelou falhas reais de measurement, qualification, observability e evaluation design.

Mas essas descobertas devem sobreviver como:

~~~
principles
tests
regressions
evidence requirements
~~~

e não necessariamente como:

~~~
old code
old abstractions
old architecture
~~~

A pergunta central desta implementação é:

> Qual é a menor camada própria que precisamos manter para transformar somente uma skill em uma avaliação defensável, enquanto Promptfoo assume toda infraestrutura genérica que puder assumir sem reduzir a força da evidência ou ampliar indevidamente os claims?

Essa pergunta, e não paridade com a implementação histórica, define o sucesso.

## Nota final do analista

Eu faria essa especificação substituir a anterior como diretriz da nova fundação, preservando a anterior apenas como documento da exploração que levou à decisão. A mudança mais importante para o dev é que ele agora tem autorização explícita para não reproduzir a V1: cada responsabilidade antiga precisa se justificar novamente.
