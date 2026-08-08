# RFC 0001: Theory First Promptfoo Foundation

## Especificação arquitetural e roadmap experimental

- Data: 2026-08-08
- Status: aprovado como RFC arquitetural; roadmap experimental condicionado
- Branch de trabalho: feat/theory-first-promptfoo-foundation
- Base: main
- THEORY consultada: commit [572e963ea6f1207ab53c533592cb70a8239e221c](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- Revisão técnica: 2026-08-08

Este documento possui dois papéis distintos:

1. RFC arquitetural permanente, que define princípios, fronteiras de responsabilidade, contratos normativos e arquitetura alvo.
2. Roadmap experimental condicionado, que descreve hipóteses e experimentos futuros sem presumir antecipadamente que todos serão executados.

Este documento não é um ExecPlan único de E0 a E11.

A primeira implementação autorizável a partir deste RFC deve ser limitada a:

> ExecPlan 1: E0–E2 — Clean Foundation, Authentication e Observability

Os ExecPlans posteriores somente podem ser escritos após os gates dos experimentos anteriores.

## Fontes verificadas

- [A Theory of Evaluating Probabilistic Skills](https://github.com/renanfranca/skill-evaluation-theory/blob/572e963ea6f1207ab53c533592cb70a8239e221c/THEORY.md)
- [OpenAI Codex SDK provider](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/)
- [Promptfoo Node API](https://www.promptfoo.dev/docs/usage/node-api-reference/)
- [Promptfoo Codex App Server provider](https://www.promptfoo.dev/docs/providers/openai-codex-app-server/)
- [Promptfoo Agent Rubric](https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/agent-rubric/)
- [OpenAI GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)

---

## 1. Branch proposto

~~~
feat/theory-first-promptfoo-foundation
~~~

Base obrigatória:

~~~
main
~~~

Não criar a partir de:

~~~
feat/skill-evidence-v1
~~~

Não iniciar por:

~~~
merge
rebase
cherry-pick
copy de implementation files
~~~

da V1.

No início do ExecPlan 1, registrar a ancestry da branch, o commit-base de "main" e confirmar que nenhum implementation file da V1 foi copiado.

A decisão arquitetural é:

> A nova fundação deve começar do menor estado possível e não carregar arquitetura histórica por inércia.

A implementação existente permanece isolada em:

~~~
feat/skill-evidence-v1
~~~

## 2. Decisão arquitetural

Esta implementação não é uma V2 incremental do runner atual.

Ela parte de uma nova premissa:

> Skill Evidence não deve implementar infraestrutura genérica de avaliação quando uma infraestrutura madura, como Promptfoo, puder assumir essa responsabilidade sem enfraquecer as conclusões autorizadas pela THEORY.

A referência normativa não é a implementação existente.

A referência normativa é:

> A Theory of Evaluating Probabilistic Skills

A THEORY define o objeto de avaliação como uma distribuição condicionada pelo modelo, skill, contexto, ambiente, população, procedimento de avaliação e variação estocástica. Ela também exige que claims sejam definidos antes da evidência, que contratos sejam semânticos, que evidência direta seja preferida e que evaluators sejam tratados como instrumentos sujeitos a falha.

A implementação histórica passa a possuir apenas estes papéis:

1. fonte histórica de problemas reais;
2. corpus de regressões;
3. referência comparativa para comportamentos que precisem ser novamente justificados.

Ela:

- não é gold standard;
- não define automaticamente a arquitetura futura;
- não deve ser copiada por compatibilidade;
- não prevalece sobre a THEORY.

## 3. Hierarquia de autoridade

Quando houver conflito entre fontes:

~~~
THEORY
  ↓
este RFC
  ↓
contratos e schemas da nova implementação
  ↓
comportamento público documentado do Promptfoo
  ↓
experimentos executados nesta implementação
  ↓
implementação histórica
~~~

Quando documentação e comportamento observado divergirem:

~~~
observação experimental
  +
versão concreta do software
  +
registro de provenance
~~~

devem governar a decisão prática.

Não presumir comportamento não observado apenas porque a documentação o sugere.

## 4. Tese de produto

A experiência alvo continua sendo:

~~~
skill-evidence evaluate <skill-directory>
~~~

O operador pode iniciar o processo fornecendo somente a skill.

Isso deve ser interpretado corretamente:

> “Somente a skill” é o contrato de entrada inicial da interface.

Não significa:

> “A skill contém necessariamente informação suficiente para uma decisão confirmatória.”

A skill normalmente pode não especificar:

- população operacional;
- frequência real dos task families;
- activation base rate;
- decisão de produto;
- minimum worthwhile improvement;
- maximum acceptable regression;
- severe harm limits;
- efficiency budgets;
- precision necessária;
- política de risco;
- custo aceitável;
- requisitos estatísticos;
- condições externas de deployment.

A THEORY exige que elementos dessa natureza estejam prespecificados antes de uma avaliação confirmatória quando forem necessários ao claim ou à decisão.

Portanto:

~~~
skill directory
      ↓
understanding
      ↓
Evaluation Author
      ↓
Evaluation Blueprint
      ↓
DRAFT | BLOCKED | READY
~~~

O Author deve inferir apenas o que estiver sustentado.

Quando uma informação necessária não puder ser inferida defensavelmente:

~~~
UNKNOWN
UNSUPPORTED
INSUFFICIENT_INFORMATION
UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT
~~~

devem ser resultados válidos.

Inventar contexto decisório para fazer o pipeline continuar é defeito de instrumento.

## 5. Princípio fundamental de blocking

A interface deve conseguir chegar a:

~~~
skill-evidence evaluate ./skill
~~~

e responder conceitualmente:

~~~
Evaluation Blueprint produced.

State: BLOCKED

Decision evaluation cannot start.

Blocking requirements:
- target population not established
- acceptable severe harm limit unknown
- required uncertainty not specified
~~~

Isso é comportamento correto.

"BLOCKED" não representa fracasso do Author.

Pode representar que o Author identificou corretamente o limite da evidência disponível.

## 6. Experiência progressiva do produto

O objetivo continua sendo:

~~~
skill directory
      ↓
intake
      ↓
authoring
      ↓
Evaluation Blueprint
      ↓
qualification
      ↓
compiler
      ↓
Promptfoo execution
      ↓
evidence
      ↓
bounded conclusions
~~~

O usuário não deve precisar escrever manualmente, quando o sistema puder derivá-los defensavelmente:

- cases;
- behavioral contracts;
- fixtures;
- assertions;
- rubrics;
- oracle probes;
- stress families;
- qualification packages;
- direct evidence checks.

Mas o sistema não está autorizado a preencher silenciosamente informações decisórias que a skill não contém.

## 7. Definição de skill

"<skill-directory>" significa o diretório lógico completo da skill.

O intake pode considerar:

~~~
SKILL.md
references/
scripts/
templates/
examples/
schemas/
outros artefatos pertencentes à skill
~~~

"SKILL.md" é a entrada principal.

Não assumir que seja uma representação completa da intervenção.

A modalidade:

~~~
skill-evidence evaluate ./SKILL.md
~~~

fica fora do escopo inicial.

## 8. Fronteira de segurança do intake

“Diretório completo” não significa leitura irrestrita.

O intake deve possuir política explícita antes de ser considerado reproduzível ou seguro.

No mínimo, definir:

~~~
root canonicalization
symlink policy
path traversal policy
ignored directories
binary policy
large file policy
file count limit
total byte limit
per-file limit
credential detection policy
credential redaction policy
permission error policy
ordering policy
fingerprint policy
mutation policy
~~~

### 8.1 Canonicalização

O root da skill deve ser convertido para caminho canônico antes da enumeração.

Nenhum artefato pode escapar do root por:

~~~
..
symlink
junction
mount inesperado
~~~

sem autorização explícita da política.

### 8.2 Symlinks

Default inicial:

~~~
symlink inside canonical skill root
    → may be considered

symlink outside canonical skill root
    → reject or exclude with structured reason
~~~

Nunca seguir silenciosamente um symlink externo.

### 8.3 Exclusões

A política inicial deve tratar explicitamente, entre outros:

~~~
.git/
node_modules/
.skill-evidence/
generated outputs
temporary files
cache directories
~~~

Não assumir que todo arquivo ignorado pelo Git deva ser ignorado pelo intake.

Git ignore e Skill Evidence intake são políticas diferentes.

### 8.4 Arquivos grandes e binários

Definir limites explícitos.

Quando um arquivo não puder ser ingerido:

~~~
artifact
status = EXCLUDED
reason = SIZE_LIMIT | BINARY_UNSUPPORTED | PERMISSION | POLICY
~~~

Se ele for necessário para um claim:

~~~
Blueprint
    → BLOCKED
~~~

ou

~~~
claim
    → NOT_EVALUATED
~~~

conforme o caso.

### 8.5 Segredos

O intake deve possuir tratamento explícito para potenciais credenciais.

A presença de um segredo não autoriza:

~~~
serialize into prompt
persist into blueprint
copy into fixtures
log into provenance
commit into repository
~~~

### 8.6 Snapshot

Author e execução devem operar contra identidade de skill claramente registrada.

Não permitir que:

~~~
Author sees state A
Executor sees mutated state B
report claims state A
~~~

sem detectar a alteração.

## 9. Fingerprint

O fingerprint deve derivar de uma representação canônica.

No mínimo:

~~~
canonical relative path
artifact type
content digest
relevant metadata defined by policy
~~~

com ordenação determinística.

O fingerprint deve descrever exatamente quais artefatos participaram do snapshot.

Registrar também exclusões relevantes.

Exemplo conceitual:

~~~json
{
  "skillFingerprint": "...",
  "includedArtifacts": [],
  "excludedArtifacts": [],
  "intakePolicyVersion": "..."
}
~~~

Não implementar um algoritmo excessivamente sofisticado antes de E0/E2 demonstrarem necessidade.

## 10. Princípio de implementação mínima

A arquitetura segue:

> Promptfoo owns generic eval infrastructure unless evidence demonstrates that it cannot preserve a required semantic property.

Não criar inicialmente abstrações próprias para:

- execução genérica do Codex;
- parsing genérico do protocolo Codex;
- gerenciamento genérico de sessões;
- framework genérico de assertions;
- sistema genérico de LLM graders;
- sistema genérico de datasets;
- tracing genérico;
- provider abstraction genérica;
- subprocess orchestration genérica;
- infraestrutura genérica de eval que Promptfoo já fornece.

O provider "openai:codex-sdk" atualmente expõe resposta final, token usage quando reportado pelo SDK, session/thread IDs, skill usage heurístico e tracing de operações como shell, MCP, search e file quando configurado. Promptfoo também permite modelo, reasoning effort, working directory, sandbox, approvals e rede de forma explícita.

Código próprio nessas áreas exige justificativa experimental.

## 11. Integração programática com Promptfoo

Baseline recomendado:

~~~
Skill Evidence
    ↓
Promptfoo Node API
    ↓
evaluate(testSuite, options)
~~~

Não criar subprocess orchestration para chamar a CLI se a API pública atender à responsabilidade.

A Node API de Promptfoo expõe "evaluate()" como entrada programática estável e também controles explícitos para cache e concorrência.

Arquitetura:

~~~
Evaluation Blueprint
        ↓
deterministic compiler
        ↓
serializable Promptfoo configuration
        ↓
promptfoo.evaluate()
        ↓
raw Promptfoo result
        ↓
Skill Evidence normalization
~~~

O compiler e o runner devem compartilhar a mesma representação serializável.

YAML pode existir como:

~~~
debug artifact
inspection artifact
reproduction artifact
~~~

mas não precisa ser a representação interna primária.

## 12. Regra contra arqueologia arquitetural

Nenhum arquivo de implementação da V1 deve ser copiado apenas para acelerar desenvolvimento.

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

Uma propriedade histórica pode ser reimplementada quando:

1. a THEORY exigir aquela propriedade; ou
2. uma regressão histórica revelar uma requirement legítima; ou
3. um experimento demonstrar insuficiência do Promptfoo.

Mesmo nesses casos:

> reimplementar a propriedade, não a arquitetura antiga.

## 13. Uso permitido da V1

A V1 poderá ser consultada para construir um:

Archaeological Regression Corpus

Esse corpus captura classes de falha e measurement defects sem importar a arquitetura que os produziu.

Regressões iniciais:

### R1. Absolute executable path

Um caminho absoluto correspondente ao executável observado não pode ser automaticamente interpretado como escrita fora do workspace.

### R2. Observability incompleteness

A regra histórica “unknown executor event” deve ser reformulada.

Nova regra:

> Nenhum evento relevante exposto pela superfície adotada pode ser descartado silenciosamente pelo Skill Evidence.

Separadamente:

> Se uma required evidence depende de um fato que a superfície adotada não consegue observar, essa evidência não pode ser considerada satisfeita.

Resultado possível:

~~~
case → INCONCLUSIVE
claim → INCONCLUSIVE
observability requirement → INSUFFICIENT
~~~

Não é possível detectar eventos que a infraestrutura nunca expõe.

E2 deve caracterizar essa fronteira.

### R3. Semantic equivalence

~~~
No refactor was justified.
~~~

não pode falhar apenas porque um checker procurava literalmente:

~~~
no action
~~~

quando identidade textual não faz parte do contrato.

### R4. Judge blindness

Calibration ou qualification input não pode revelar direta ou indiretamente o expected status.

### R5. Missing evidence

Judge não pode converter ausência de observabilidade em "PASS".

### R6. Direct critical violation

Uma violação crítica observada diretamente prevalece sobre julgamento semântico favorável.

Essas regressões serão reimplementadas a partir dos princípios.

## 14. Arquitetura alvo

~~~
                     SKILL DIRECTORY
                           │
                           ▼
                        INTAKE
                  canonical snapshot
                       fingerprint
                           │
                           ▼
                    EVALUATION AUTHOR
                           │
                           ▼
                 EVALUATION BLUEPRINT
                           │
                  schema validation
                           │
                   lifecycle policy
                           │
            ┌──────────────┴──────────────┐
            │                             │
         BLOCKED                       READY
                                          │
                                          ▼
                                    qualification
                                          │
                                          ▼
                                       FROZEN
                                          │
                                          ▼
                                       COMPILER
                                          │
                                          ▼
                                       PROMPTFOO
                            ┌─────────────┼─────────────┐
                            │             │             │
                            ▼             ▼             ▼
                        EXECUTOR        DIRECT        SEMANTIC
                                       EVIDENCE        JUDGE
                            │             │             │
                            └─────────────┼─────────────┘
                                          ▼
                                     RAW RESULTS
                                          │
                                          ▼
                                    SKILL EVIDENCE
                                      eligibility
                                        claims
                                      provenance
                                        review
~~~

Promptfoo é infraestrutura.

Skill Evidence é:

~~~
semantics
qualification
evidence policy
eligibility
lifecycle
provenance
bounded conclusions
~~~

## 15. Papéis de modelo

Não tratar “usar IA” como uma responsabilidade única.

Existem três papéis:

~~~
Evaluation Author
Executor
Judge
~~~

Cada papel possui:

~~~
provider
model
reasoning effort
prompt/instructions fingerprint
qualification state
version
provenance
~~~

independentes.

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

~~~
TBD
~~~

A documentação atual do provider Codex SDK reconhece Luna, Terra e Sol e permite configuração explícita de "model" e "model_reasoning_effort".

Esses modelos são baseline experimental, não dogma arquitetural.

## 16. Política para escolha do Author

Não selecionar automaticamente o modelo mais caro.

Primeiro construir benchmark.

Depois comparar condições.

Objetivo:

> menor compute que preserve as propriedades decisórias exigidas do Author.

O Author precisa ser tratado como instrumento de medição.

A qualidade de sua escrita não é suficiente.

## 17. Authentication baseline

Baseline:

~~~
Promptfoo
   ↓
openai:codex-sdk
   ↓
Codex SDK
   ↓
existing ChatGPT/Codex authentication
~~~

Não depender de API key no baseline.

Quando "apiKey", "OPENAI_API_KEY" e "CODEX_API_KEY" estão ausentes, a documentação atual do provider afirma que o SDK pode reutilizar login Codex/ChatGPT existente.

## 18. CODEX_HOME

"CODEX_HOME" controlado não significa:

~~~
copy credentials into repository
copy auth into fixture
commit auth state
serialize auth state
~~~

Significa:

> usar um caminho externo e explicitamente conhecido que contenha login válido quando E1 necessitar reutilizar autenticação ChatGPT.

Nunca incluir credenciais no repositório.

Não usar:

~~~
inherit_process_env: true
~~~

sem necessidade demonstrada.

Manter ambiente mínimo.

## 19. Authentication provenance

Não registrar automaticamente:

~~~json
{
  "authMode": "chatgpt"
}
~~~

como fato diretamente observado se Promptfoo não o reportar.

E1 deve caracterizar qual evidência existe.

Exemplo possível:

~~~json
{
  "authentication": {
    "mode": "chatgpt",
    "evidenceKind": "configuration-inference",
    "apiKeyPresent": false,
    "codexApiKeyPresent": false
  }
}
~~~

Somente usar:

~~~
evidenceKind = provider-reported
~~~

quando houver observação direta que sustente essa descrição.

Provenance nunca deve aumentar a força da evidência.

## 20. Evaluation Blueprint

O output principal do Evaluation Author não é YAML Promptfoo.

É:

~~~
EvaluationBlueprint
~~~

O Blueprint é a camada semântica e normativa do Skill Evidence.

Promptfoo configuration é build artifact.

## 21. Estrutura conceitual do Blueprint

Versão inicial revisada:

~~~
EvaluationBlueprint
│
├── schemaVersion
├── identity
├── lifecycle
├── skill
├── decisionContext
├── population
├── claims
├── exclusions
├── contracts
├── activationRegions
├── usageFamilies
├── stressFamilies
├── contrasts
├── evidencePlan
├── oracleQualificationPlan
├── samplingPlan
├── analysisPlan
├── developmentPolicy
├── decisionPolicy
├── stoppingConditions
├── unresolvedRequirements
├── untestedRisks
└── authorProvenance
~~~

Objetos vazios não são contrato suficiente.

Cada campo decisório obrigatório deve possuir semântica própria.

## 22. Lifecycle do Blueprint

~~~
DRAFT
BLOCKED
READY
FROZEN
SUPERSEDED
~~~

### DRAFT

Blueprint ainda em autoria ou validação.

Não pode produzir decision run.

### BLOCKED

Há informação ausente que impede claims ou decisão pretendida.

Cada blocker deve ser estruturado.

### READY

Schema válido e sem blocking requirements para o estágio permitido.

"READY" não significa automaticamente pronto para decision run.

Qualification ainda pode ser necessária.

### FROZEN

Configuração confirmatória congelada.

A partir daqui, alterações materiais invalidam o freeze.

### SUPERSEDED

Blueprint substituído por outro.

Nunca sobrescrever silenciosamente um Blueprint congelado.

## 23. Unresolved requirements

Formato mínimo:

~~~
id
field
reason
status
blocking
evidenceNeeded
source
affectedClaimIds
~~~

Possíveis statuses:

~~~
UNKNOWN
UNSUPPORTED
INSUFFICIENT_INFORMATION
UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT
~~~

Exemplo:

~~~json
{
  "id": "UR-001",
  "field": "decisionContext.minimumWorthwhileImprovement",
  "status": "INSUFFICIENT_INFORMATION",
  "blocking": true,
  "reason": "The skill does not define a decision threshold.",
  "affectedClaimIds": ["C7"]
}
~~~

## 24. Decision Context

O Blueprint deve poder representar explicitamente:

~~~
decision
decision owner or source when available
target population
excluded populations
primary measures
secondary measures
minimum worthwhile improvement
maximum acceptable regression
severe harm limits
efficiency budgets
required uncertainty
decision critical claims
~~~

Não exigir todos os campos para todos os tipos de avaliação.

A obrigatoriedade depende dos claims.

Exemplo:

Um claim limitado a:

~~~
observed behavior in specified development scenarios
~~~

não exige necessariamente uma política populacional completa.

Um claim de:

~~~
generalization
stability
skill contribution
deployment decision
~~~

exige desenho mais forte.

## 25. Claims

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
status
~~~

Tipos alinhados à THEORY:

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

Não autorizar todos automaticamente.

Quando o desenho não sustentar um claim:

~~~
claim = NOT_EVALUATED
~~~

Não reduzir o threshold para manter o claim.

## 26. Contrasts

Claims causais ou comparativos precisam declarar contrastes.

Exemplos:

~~~
skill contribution
    → no-intervention or valid ablation

change effect
    → prior or alternative version

robustness
    → controlled variation

regression protection
    → previously qualified behavior
~~~

A THEORY explicita que sucesso na condição atual não estabelece causalidade e que controles distintos respondem perguntas distintas.

Portanto, "contrasts[]" deve ser first class no Blueprint.

## 27. Behavioral Contract

Cada contract deve expressar semanticamente:

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

Contracts descrevem conjuntos de trajetórias comportamentalmente equivalentes.

Não devem prescrever wording incidental.

Exact string somente quando a identidade textual for obrigação externa real.

## 28. Activation regions

Representar separadamente:

~~~
positive
negative
boundary
~~~

O Author deve procurar explicitamente:

~~~
quando ativar
quando não ativar
quando clarificar
quando bloquear
quando outra responsabilidade prevalece
~~~

Positive activation sem negative activation não é avaliação suficiente de activation quality.

## 29. Evidence Plan

Cada required evidence deve declarar:

~~~
id
claimIds
contractIds
property
evidenceKind
source
mandatory
critical
observabilityRequirement
missingEvidenceSemantics
~~~

Hierarquia:

~~~
direct evidence
      ↓
structured deterministic inference
      ↓
semantic evidence
      ↓
LLM judgment
~~~

Preferir evidência diretamente verificável quando disponível, em consonância com a THEORY.

## 30. Direct evidence

Exemplos:

~~~
filesystem state
git diff
file existence
file absence
JSON structure
schema validation
command result
exit status
temporal relation
observable tool use
prohibited write
preserved state
~~~

Promptfoo deve executar diretamente o que sua assertion surface representar suficientemente.

Small adapters são permitidos quando houver necessity record.

## 31. Regra para adapters

Nenhum adapter entra apenas porque código próprio parece mais simples.

Registro obrigatório:

~~~
Required property:
Affected claims:
Observable fact:
Promptfoo surface tested:
Why native surface is insufficient:
Proposed adapter:
Failure semantics:
Version conditions:
Test proving necessity:
~~~

Se:

~~~
Why native surface is insufficient
~~~

não puder ser demonstrado:

~~~
adapter rejected
~~~

## 32. Observability classification

E2 deve classificar necessidades como:

~~~
NATIVE_STABLE
NATIVE_EXPERIMENTAL
ADAPTER
INSUFFICIENT
~~~

### NATIVE_STABLE

Superfície pública suficientemente estável para a propriedade requerida.

### NATIVE_EXPERIMENTAL

Informação disponível, mas através de superfície documentada como experimental ou cuja estabilidade ainda precisa ser caracterizada.

### ADAPTER

Fato observável, mas necessita pequena adaptação própria.

### INSUFFICIENT

A superfície atual não permite observar evidência suficiente.

Não promover "NATIVE_EXPERIMENTAL" automaticamente a fundação decisória sem justificar o risco.

## 33. Skill usage

Não tratar:

~~~
skill-used = true
~~~

como prova de contribuição causal.

A documentação atual informa que "skill-used" no Codex SDK é inferido heuristicamente a partir de leituras observadas de "SKILL.md", e não de um evento first class de invocation.

Assim:

~~~
observed skill read
~~~

pode sustentar evidência limitada sobre activation/process.

Não sustenta automaticamente:

~~~
skill caused success
~~~

Skill contribution exige contraste.

## 34. App Server escalation

Baseline:

~~~
openai:codex-sdk
~~~

Não iniciar com App Server.

App Server entra somente quando um experimento provar que uma propriedade decisória requer superfície não adequadamente exposta pelo SDK.

Promptfoo posiciona o SDK como adequado para automação comum e o App Server para superfícies mais ricas de protocolo, approvals, lifecycle e eventos específicos.

A adoção de App Server exige ExecPlan separado.

## 35. Oracle lifecycle

Qualification do oracle deve possuir estados:

~~~
ELIGIBLE
NOT_ELIGIBLE
STALE
~~~

### ELIGIBLE

Qualification válida para a condição fingerprintada.

### NOT_ELIGIBLE

Falhou nos critérios definidos.

Resultados desse oracle não podem sustentar decisão.

### STALE

Qualification existia, mas uma mudança material tornou sua validade incerta.

## 36. Qualification scope

Qualification não pertence apenas ao nome do judge.

Ela deve estar vinculada a uma condição semelhante a:

~~~
oracle definition
rubric fingerprint
judge provider
judge model
reasoning effort
judge prompt
Promptfoo version
provider version
relevant environment
qualification dataset
qualification policy
~~~

Trocar qualquer elemento material pode tornar:

~~~
ELIGIBLE → STALE
~~~

## 37. Qualification probes

Famílias mínimas:

~~~
known-valid
known-invalid
alternative-valid
unsupported-fluency
~~~

Resultado semântico esperado:

~~~
known-valid          → PASS
known-invalid        → FAIL
alternative-valid    → PASS
unsupported-fluency  → not PASS
~~~

"unsupported-fluency" pode resultar em:

~~~
FAIL
INCONCLUSIVE
~~~

dependendo da rubric.

O requisito crítico é:

> fluência sem evidência não pode produzir falso PASS.

## 38. Qualification Plan

Quatro exemplos não são qualification suficiente por definição.

O plano deve declarar:

~~~
probe families
probe count
repetitions
acceptance rule
invalid response handling
disagreement handling
minimum agreement when applicable
adjudication policy
evaluator count
expiration conditions
~~~

Casos consequenciais ou ambíguos podem exigir múltiplos avaliadores.

A THEORY recomenda múltiplos evaluators nesses contextos, medição de disagreement e adjudicação apoiada em evidência concreta.

## 39. Expected status blindness

O expected status não entra no judge packet.

Nenhum campo pode vazar direta ou indiretamente:

~~~
expected = PASS
known-valid
gold answer status
reference decision
qualification target label
~~~

O harness conhece o expected status.

O judge não.

## 40. llm-rubric versus agent-rubric

Não escolher um único mecanismo antecipadamente.

### llm-rubric

Preferir quando toda evidência necessária puder ser serializada de maneira segura e suficiente.

### agent-rubric

Investigar quando o grader precisar inspecionar:

~~~
workspace
source
generated artifacts
repository state
file relationships
~~~

Promptfoo define "agent-rubric" para graders capazes de reunir evidência usando workspace e ferramentas. Sua documentação recomenda postura read only quando possível e ressalta que output e workspace avaliados devem ser tratados como conteúdo não confiável.

Default Skill Evidence para agent judge:

~~~
sandbox_mode: read-only
approval_policy: never
network disabled unless explicitly required
~~~

## 41. Prompt injection boundary

Tudo produzido pelo Executor ou contido no workspace avaliado é:

~~~
UNTRUSTED DATA
~~~

para o Judge.

O Judge não deve obedecer instruções presentes nesses artefatos.

Qualification deve incluir ataques contra:

~~~
embedded instructions
fabricated evidence
confidence theater
misleading fluency
condition leakage
verifier manipulation
~~~

## 42. Executor sandbox policy

A sandbox do Executor também deve ser explícita.

Não existe um único default correto para toda skill.

Cada case family deve declarar a capacidade necessária.

Exemplos:

~~~
analysis only
    → read-only

artifact modification required
    → workspace-write

danger-full-access
    → prohibited by default
~~~

Promptfoo documenta "read-only", "workspace-write" e "danger-full-access", e recomenda reduzir rede e permissões ao necessário.

Default de approvals:

~~~
approval_policy: never
~~~

salvo quando approval behavior for explicitamente o objeto do experimento.

Network:

~~~
disabled by default
~~~

e habilitada somente quando o contract realmente depende dela.

Neste RFC, rede desabilitada significa desabilitar rede, live web search e outras capacidades de acesso externo disponíveis ao agente. Não significa bloquear o transporte necessário entre Promptfoo, Codex e OpenAI para autenticação e inferência.

## 43. Workspace isolation

Cada trial deve possuir política explícita:

~~~
workspacePolicy
stateResetPolicy
persistentStatePolicy
executionOrderPolicy
~~~

Possíveis estratégias:

~~~
fresh
reset
intentionally-shared
~~~

Um case não pode contaminar outro por acidente.

Promptfoo também recomenda workspaces descartáveis em avaliações de coding agents quando mutações de uma row poderiam interferir nas seguintes.

Se persistent state for parte do comportamento avaliado:

~~~
intentionally-shared
~~~

deve ser declarado no Blueprint.

Para trials que pretendam ser independentes, configurar explicitamente:

~~~
persist_threads = false
thread_id = absent
~~~

Não depender apenas do default ou de efeitos colaterais de tracing para garantir independência.

## 44. Concurrency policy

Promptfoo permite configurar "maxConcurrency".

Isso não significa que máxima concorrência seja semanticamente válida.

O Blueprint ou compilation policy deve definir:

~~~
maxConcurrency
~~~

de acordo com:

~~~
workspace isolation
shared external state
ordering requirements
rate limits
causal independence
~~~

Quando independência não for demonstrada:

~~~
maxConcurrency = 1
~~~

é um baseline defensável para o experimento relevante.

Não paralelizar apenas para acelerar.

## 45. Cache policy

Promptfoo possui cache habilitado por padrão para provider calls e permite desabilitá-lo programaticamente.

Isso é measurement critical.

Qualquer trial destinado a representar uma nova amostra estocástica deve executar com:

~~~
cache = false
persist_threads = false
thread_id = absent
~~~

Em particular:

~~~
decision trials
stability repetitions
stochastic repetitions
qualification repetitions
~~~

quando a repetição pretende produzir observação independente.

Nunca transformar:

~~~
one model observation
+
four cache replays
~~~

em:

~~~
five stochastic trials
~~~

Cache pode ser usado em operações determinísticas ou desenvolvimento quando semanticamente apropriado, mas sua política deve ser explícita.

Cache policy e thread persistence são mecanismos distintos; desabilitar apenas um deles não prova independência.

## 46. Sampling Plan

O Blueprint deve representar, quando exigido:

~~~
task counts
repetition counts
randomization
blocking
execution order
persistent state
workspace reset
inclusion rules
exclusion rules
missing trial handling
invalid trial handling
subgroups
sampling source
usage/stress separation
~~~

A THEORY exige prespecificação desses elementos antes de observação confirmatória.

## 47. Usage versus stress

Manter resultados separados.

### usage distribution

estima comportamento sob uso pretendido.

### stress distribution

deliberadamente sobre representa mecanismos de risco.

Nunca produzir uma média que destrua as duas interpretações.

## 48. Analysis Plan

Antes de decision material, declarar:

~~~
primary comparisons
secondary comparisons
claim aggregation
subgroup analysis
multiplicity treatment
critical failure rules
missing evidence semantics
uncertainty calculation
decision eligibility
~~~

Não escolher threshold depois de observar decision results.

## 49. Development versus decision

Separação obrigatória:

~~~
development material
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

Decision material exposto durante debugging deixa de ser decision material.

Não selecionar retrospectivamente:

~~~
best runs
best variants
best judge
best threshold
~~~

como evidence confirmatória.

## 50. Run lifecycle

Separar propósito de estado.

### RunPurpose

~~~
DEVELOPMENT
DECISION
~~~

### RunStatus

~~~
PLANNED
RUNNING
COMPLETED
ABORTED
INVALIDATED
ERROR
~~~

Exemplo:

~~~
purpose = DECISION
status = INVALIDATED
~~~

é semanticamente diferente de:

~~~
purpose = DEVELOPMENT
status = COMPLETED
~~~

## 51. Run invalidation

Motivos devem ser estruturados.

Exemplos:

~~~
BLUEPRINT_CHANGED
COMPILER_CHANGED
SKILL_CHANGED
MODEL_CONDITION_CHANGED
JUDGE_CHANGED
ORACLE_STALE
PROMPTFOO_VERSION_CHANGED
SDK_VERSION_CHANGED
REQUIRED_EVIDENCE_MISSING
WORKSPACE_CONTAMINATION
DECISION_MATERIAL_EXPOSED
INSTRUMENT_DEFECT
SAMPLING_POLICY_VIOLATION
~~~

Não sobrescrever um run inválido.

Preservá-lo como desenvolvimento ou historical evidence quando útil.

## 52. Evaluation Author

Experimento central de autoria:

~~~
skill snapshot
      ↓
Evaluation Author
      ↓
Evaluation Blueprint
~~~

O Author recebe inicialmente:

~~~
skill snapshot
THEORY based authoring instructions
Promptfoo operational knowledge
~~~

Não recebe:

~~~
historic evaluation
historic contracts
historic cases
historic oracles
historic judge packets
historic expected answers
historic qualification packages
~~~

durante benchmark cego.

## 53. Author uncertainty

O Author não deve ser recompensado por parecer completo.

Permitir explicitamente:

~~~
UNKNOWN
UNSUPPORTED
INSUFFICIENT_INFORMATION
UNTESTABLE_FROM_AVAILABLE_ENVIRONMENT
~~~

Invented requirement rate é uma métrica negativa crítica.

## 54. Author qualification

Adicionar explicitamente:

> O Evaluation Author também é um instrumento de medição.

Portanto, um Author condition deve ser qualificado antes de permitir promoção automática de seus Blueprints para estágios decisórios.

Estado conceitual:

~~~
AuthorCondition
QUALIFIED
NOT_QUALIFIED
STALE
~~~

Uma configuração inclui:

~~~
model
reasoning
author instructions
THEORY version
schema version
authoring protocol
~~~

Mudança material pode tornar qualification anterior "STALE".

## 55. Author benchmark

A avaliação histórica não é gold.

Ela será:

~~~
adjudicated reference evaluation
~~~

Benchmark cego.

Author recebe somente inputs autorizados.

Comparar:

~~~
claim recall
claim precision
critical contract recall
invented contract rate
overly specific contract rate
positive activation coverage
negative activation coverage
boundary coverage
blocking decisions
recovery paths
prohibited effects
temporal constraints
valid alternatives
required direct evidence
oracle requirements
unsupported claim exclusions
unresolved requirement quality
decision context fabrication rate
~~~

Toda divergência importante deve ser adjudicada usando a THEORY.

A reference humana também pode estar errada.

## 56. Structure discovery versus case expansion

Separar:

~~~
structure discovery
~~~

de:

~~~
case expansion
~~~

O Author descobre estrutura e boundaries.

Promptfoo ou generator pode expandir:

~~~
semantic variants
personas
values
locales
edge cases
stress variants
~~~

Nenhum generator pode criar silenciosamente um novo contract decisório.

Quando surgir um novo failure mechanism:

~~~
candidate contract
      ↓
development review
      ↓
blueprint revision
~~~

## 57. Promptfoo compiler

Somente Blueprint validado entra no compiler.

~~~
Evaluation Blueprint
        ↓
compiler
        ↓
Promptfoo TestSuiteConfiguration
~~~

O compiler deve ser essencialmente determinístico.

Ele não reinterpreta semanticamente a skill.

Responsabilidades:

~~~
contracts → case families
direct evidence → deterministic assertions
semantic requirements → qualified rubrics
fixtures → vars/workspaces
models → explicit providers
budgets → execution options
workspace policies → isolated execution
sampling → repetition configuration
cache policy → execution configuration
provenance → metadata
~~~

Blueprint é source of truth.

Promptfoo config é build artifact.

## 58. Serializable compiler output

Evitar depender de closures JavaScript geradas dinamicamente quando o objetivo for reprodução e fingerprint.

Quando custom logic for necessária, preferir:

~~~
versioned file
fingerprinted adapter
explicit path reference
~~~

em vez de função anônima criada em runtime.

## 59. Evidence precedence

A política de agregação deve codificar:

~~~
critical direct violation
        ↓
cannot be overridden
~~~

Um judge favorável não pode neutralizar:

~~~
prohibited write observed
required file absent
unauthorized action observed
critical command failed
~~~

quando esses fatos fazem parte do contract.

A THEORY é explícita: evaluator score não deve superar evidência direta de violação crítica.

## 60. Case status

~~~
PASS
FAIL
INCONCLUSIVE
ERROR
~~~

Regras:

~~~
missing required evidence
    → INCONCLUSIVE

measurement surface insufficient
    → INCONCLUSIVE

runtime/infrastructure failure
    → ERROR

qualified evidence violates contract
    → FAIL

all mandatory qualified evidence satisfies contract
    → PASS
~~~

Não transformar ausência de evidência em sucesso.

## 61. Claim status

~~~
SUPPORTED
NOT_SUPPORTED
INCONCLUSIVE
NOT_EVALUATED
~~~

### SUPPORTED

Evidence requirements declarados foram satisfeitos sob o desenho requerido.

### NOT_SUPPORTED

Evidence válida contradiz o claim ou não atinge seus critérios prespecificados.

### INCONCLUSIVE

O claim estava sendo avaliado, mas evidence necessária ficou insuficiente ou ambígua.

### NOT_EVALUATED

O desenho não tentou sustentar aquele claim.

## 62. Aggregation

Claim aggregation deve respeitar o Blueprint.

Não usar automaticamente:

~~~
mean score
weighted average
overall pass rate
~~~

como decisão.

Exemplos:

~~~
critical direct failure
    → claim cannot be SUPPORTED

collapsed required subgroup
    → aggregate favorable score insufficient

unqualified judge
    → judge evidence ineligible

missing mandatory evidence
    → claim INCONCLUSIVE
~~~

## 63. Cost policy

Primeiro reduzir chamadas.

Depois reduzir compute.

Ordem:

1. eliminate unnecessary LLM calls
2. replace semantic checks with direct evidence
3. consolidate compatible semantic grading
4. reduce reasoning effort
5. compare cheaper models

Não começar a otimização apenas trocando Terra por Luna.

## 64. Budget gates

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
maximum concurrency
~~~

Registrar quando disponíveis:

~~~
input tokens
cached input tokens
output tokens
reasoning tokens
estimated cost
~~~

Não fabricar custo completo quando a infraestrutura não o conhece.

A documentação do Codex SDK provider informa que token usage pode ser retornado quando o SDK o reporta e que estimativas de custo podem permanecer indefinidas em determinadas condições.

## 65. Provenance

Toda model call relevante deve registrar, quando observável:

~~~json
{
  "role": "author | executor | judge",
  "provider": "openai:codex-sdk",
  "model": "...",
  "reasoningEffort": "...",
  "modelConditionEvidenceKind": "...",
  "providerConfigFingerprint": "...",
  "promptFingerprint": "...",
  "promptfooVersion": "...",
  "codexSdkVersion": "...",
  "codexCliVersion": "...",
  "authentication": {},
  "sessionId": "...",
  "tokenUsage": {},
  "caseId": "...",
  "assertionId": "...",
  "qualificationId": "...",
  "skillFingerprint": "...",
  "blueprintFingerprint": "...",
  "runId": "..."
}
~~~

Campos indisponíveis:

~~~
null + reason
~~~

quando relevantes.

Nunca inventar.

Distinguir configuração solicitada de modelo/reasoning da condição efetivamente observada. Não promover "requested" para "provider-reported" sem evidência correspondente.

Nunca armazenar apenas:

~~~
judge = Codex
~~~

## 66. Suggested repository structure

Estrutura inicial potencial:

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

Não criar pastas antes de seu primeiro uso real.

Esta árvore representa ownership esperado, não scaffold obrigatório de E0.

## 67. CLI durante desenvolvimento

Interface final:

~~~
skill-evidence evaluate <skill>
~~~

Comandos internos permitidos:

~~~
skill-evidence inspect <skill>

skill-evidence author <skill>
  --out blueprint.json

skill-evidence validate-blueprint blueprint.json

skill-evidence compile blueprint.json
  --out .skill-evidence/suite/

skill-evidence run blueprint.json
~~~

Esses comandos existem para tornar cada estágio observável.

"evaluate" posteriormente compõe o pipeline.

Não é requisito da Foundation implementar todos.

## 68. Roadmap experimental

E0–E11 continuam registrados neste RFC.

Eles representam:

~~~
hypotheses
possible next experiments
conditional architecture
~~~

e não uma sequência pré autorizada de implementação.

## 69. E0 — Clean Foundation

Criar branch a partir de "main".

No início do ExecPlan 1, verificar e registrar:

~~~
branch ancestry
main base commit
current branch commit
absence of V1 implementation files
~~~

Adicionar somente o necessário ao primeiro experimento:

~~~
package scaffold
TypeScript
lint
format
tests
Promptfoo dependency
Codex SDK dependency
minimal CLI or experiment harness
~~~

Critério:

~~~
zero V1 implementation code copied
~~~

Também definir os contratos mínimos necessários para E1/E2:

~~~
experiment result format
version capture
provenance skeleton
safe CODEX_HOME handling
~~~

## 70. E1 — Authentication smoke test

Objetivo:

provar empiricamente:

~~~
Promptfoo
→ openai:codex-sdk
→ existing ChatGPT authentication
→ explicitly requested Luna condition
~~~

Sem:

~~~
OPENAI_API_KEY
CODEX_API_KEY
~~~

Output deve ser simples.

Registrar:

~~~
Node version
npm version
Promptfoo version
Codex SDK version
Codex CLI version
requested model
requested reasoning
observed effective model evidence
observed effective reasoning evidence
relevant provider config
authentication evidence
~~~

Requested model/reasoning e effective model/reasoning são fatos distintos. Quando a condição efetiva não puder ser observada diretamente, registrar a limitação e o evidence kind sem inventar confirmação.

### Gate G1

Não avançar se authentication mode ou model condition não puderem ser caracterizados suficientemente para o objetivo do experimento.

Não chamar inference de observation.

## 71. E2 — Disposable Observability Canary

Criar:

~~~
synthetic disposable skill
synthetic disposable workspace
~~~

exclusivamente para o experimento.

Não usar decision material histórico.

Testar deliberadamente capacidades que produzam sinais observáveis.

Caracterizar:

~~~
final response
session ID
token usage
filesystem consequences
command trajectory
file operations
runtime errors
skill usage metadata
ordering information
workspace mutation
provider errors
~~~

Cada necessidade recebe:

~~~
NATIVE_STABLE
NATIVE_EXPERIMENTAL
ADAPTER
INSUFFICIENT
~~~

O canary deve fixar explicitamente:

~~~
cache
persist_threads
thread_id
maxConcurrency
workspace policy
sandbox mode
approval policy
agent network policy
web search policy
~~~

### Gate G2

Produzir:

~~~
Experimental Ownership Matrix
~~~

com evidência para cada responsabilidade.

Se required evidence crítica for "INSUFFICIENT":

~~~
adapter spike
ou
App Server spike
ou
claim weakening
ou
architecture stop
~~~

devem ser considerados explicitamente.

Não continuar adicionando código até transformar artificialmente "INSUFFICIENT" em "PASS".

## 72. Definition of Done do ExecPlan 1

A primeira implementação termina em E2.

DoD:

1. branch criada efetivamente de "main", com ancestry e base registradas no início do ExecPlan;
2. ausência de implementation code copiado da V1;
3. Promptfoo integrado programaticamente pela Node API, salvo impedimento documentado;
4. authentication smoke test executado;
5. configuração solicitada de modelo e reasoning explícita e condição efetiva caracterizada até o limite observável;
6. provenance factual e não inventada;
7. "CODEX_HOME" tratado sem versionar credenciais;
8. sandbox, approvals e agent network explicitamente configurados no canary;
9. cache policy e thread persistence explicitamente controladas;
10. concurrency policy explicitamente controlada;
11. disposable workspace usado;
12. observability surface caracterizada;
13. cada required signal classificado;
14. limitações de tracing registradas;
15. ownership matrix experimental produzida;
16. decisão explícita sobre a viabilidade de continuar Promptfoo SDK first.

Nada de Author production, compiler completo, oracle qualification ou decision run é necessário para concluir ExecPlan 1.

## 73. E3 — Archaeological Regression Corpus

ExecPlan separado após G2.

Reimplementar offline as classes históricas de measurement failure.

Nenhuma model call necessária.

Objetivo:

~~~
protect semantics
not architecture
~~~

Gate:

todos os regressions necessários passam antes de material decisório futuro.

## 74. E4 — Evaluation Author v0

ExecPlan condicionado.

Implementar:

~~~
skill snapshot
→ Blueprint DRAFT/BLOCKED/READY
~~~

Sem:

~~~
full compiler
decision execution
automatic claims promotion
~~~

Primeira pergunta:

> conseguimos descobrir estrutura de avaliação defensável sem fabricar contexto ausente?

## 75. E5 — Blind Author Benchmark

Executar Author contra skill com adjudicated reference evaluation.

Reference permanece oculta.

Avaliar:

~~~
precision
recall
critical omissions
fabrications
uncertainty behavior
blocking quality
contract semantics
evidence compatibility
~~~

### Gate G5

Não avançar para autoria automatizada como caminho normal se o Author:

~~~
inventa requisitos críticos frequentemente
perde contratos críticos
confunde usage e stress
ignora negative activation
prescreve wording incidental
escolhe evidence incompatível
inventa contexto decisório
não sabe bloquear quando deveria
produz oracles não qualificáveis
~~~

Resultado válido:

~~~
automatic Author not defensible
~~~

## 76. E6 — Blueprint Compiler

Somente após Author/schema suficientemente estáveis.

Implementar deterministicamente:

~~~
Blueprint
→ Promptfoo TestSuiteConfiguration
~~~

Testar sem modelos sempre que possível.

## 77. E7 — Oracle Generation and Qualification

Gerar qualification material.

Testar graders.

Nenhum oracle não qualificado entra em future decision suite.

Qualification policy deve já incluir:

~~~
repetitions
acceptance criteria
disagreement handling
validity fingerprint
staleness
~~~

## 78. E8 — Development Canary

Executar somente material DEVELOPMENT.

Exercitar:

~~~
intake
author
blueprint
compiler
Promptfoo
executor
direct assertions
qualification
semantic judge
aggregation
provenance
~~~

Não produzir conclusão confirmatória sobre a skill.

## 79. E9 — Freeze

Congelar:

~~~
skill fingerprint
Blueprint
compiler version
Promptfoo version
Codex SDK version
model condition
judge condition
qualification state
sampling plan
analysis plan
cache policy
thread persistence policy
workspace policy
stopping rules
~~~

Somente depois disso decision material pode ser gerado ou selecionado.

## 80. E10 — Decision Evaluation

E10 não faz parte da Foundation.

É fase posterior.

Executar material inédito sob configuração congelada.

Nenhuma alteração retrospectiva pode transformar resultado desfavorável em favorável.

Mudança material:

~~~
decision run
    → INVALIDATED
~~~

O achado pode migrar para development knowledge.

Novo decision material será necessário.

## 81. E11 — Model Optimization

E11 também está fora da Foundation.

Somente executar depois de pipeline qualificado.

### Executor

Comparações iniciais possíveis:

~~~
Luna max
Luna xhigh
Luna high
~~~

### Judge

~~~
Terra xhigh
Terra high
Luna max
~~~

### Author

Matriz definida com base no Author benchmark.

Critério:

> menor compute que preserve as propriedades decisórias exigidas.

## 82. Ownership matrix inicial

| Responsabilidade | Dono presumido |
| --- | --- |
| Codex invocation | Promptfoo |
| Provider lifecycle | Promptfoo |
| Generic sandbox configuration | Promptfoo |
| Session IDs | Promptfoo |
| Generic provider trajectory | Promptfoo |
| Token usage | Promptfoo |
| Generic assertions | Promptfoo |
| Dataset/case expansion mechanics | Promptfoo |
| LLM grader invocation | Promptfoo |
| Agent grader invocation | Promptfoo |
| Generic cache mechanics | Promptfoo |
| Generic concurrency mechanics | Promptfoo |
| Skill intake policy | Skill Evidence |
| Snapshot/fingerprint policy | Skill Evidence |
| Evaluation Blueprint | Skill Evidence |
| Blueprint lifecycle | Skill Evidence |
| Claims | Skill Evidence |
| Behavioral contracts | Skill Evidence |
| Activation boundaries | Skill Evidence |
| Decision context semantics | Skill Evidence |
| Required evidence policy | Skill Evidence |
| Oracle generation policy | Skill Evidence |
| Oracle qualification | Skill Evidence |
| Author qualification | Skill Evidence |
| Eligibility | Skill Evidence |
| Case/claim semantics | Skill Evidence |
| Development/decision isolation | Skill Evidence |
| Workspace isolation semantics | Skill Evidence |
| Cache admissibility semantics | Skill Evidence |
| Sampling semantics | Skill Evidence |
| Analysis/aggregation policy | Skill Evidence |
| Provenance requirements | Skill Evidence |
| Review/archive | Skill Evidence |
| Missing deterministic check | Small Adapter, if justified |
| Rich Codex protocol events | Not justified yet |

E2 pode modificar essa matriz.

Ela não é uma verdade antecipada.

## 83. Stop rules

Nenhum decision run enquanto existir:

~~~
instrument instability
unknown critical observability requirement
unqualified oracle
stale oracle
unqualified Author condition when required
unfrozen Blueprint
unfrozen decision rules
missing mandatory evidence
unresolved critical regression
workspace contamination risk
invalid cache policy
invalid thread persistence policy
decision material contamination
unresolved sampling design
blocking unresolved requirement
~~~

Nenhuma quantidade de judge compute corrige measurement invalidity.

## 84. Critérios de fracasso legítimo

A exploração pode concluir:

~~~
Promptfoo observability insufficient
Promptfoo experimental trace surface too unstable
SDK insufficient
App Server required
custom adapter required
Eval Author unreliable
automatic contract inference insufficient
decision context cannot be inferred
oracle generation not defensible
judge qualification too unstable
some claims cannot be automated
some skills require human decision input
~~~

Esses são resultados científicos válidos.

Não adicionar arquitetura apenas para evitar concluir que uma hipótese falhou.

## 85. Critério para novas abstrações

Todo Pull Request que introduzir nova responsabilidade própria deve responder:

> Esta responsabilidade é necessária para preservar uma propriedade exigida pela THEORY que Promptfoo não consegue fornecer adequadamente?

Se:

~~~
NO
~~~

não implementar.

Se:

~~~
UNKNOWN
~~~

fazer spike.

Se:

~~~
YES
~~~

o PR precisa trazer a evidência que sustenta a conclusão.

## 86. Definition of Done da Foundation arquitetural

A Foundation completa, considerando múltiplos ExecPlans futuros, não termina quando Promptfoo executa YAML.

Ela deve eventualmente demonstrar:

1. reconstrução independente da V1;
2. infraestrutura genérica delegada quando possível;
3. authentication condition caracterizada;
4. modelos e reasoning explicitamente registrados;
5. intake reproduzível;
6. fingerprint defensável;
7. observability caracterizada;
8. cache, thread persistence e concorrência semanticamente controlados;
9. regressões históricas protegidas;
10. Blueprint normativo implementado;
11. lifecycle formalizado;
12. unresolved requirements first class;
13. Author capaz de bloquear em vez de inventar;
14. Author benchmark cego executado;
15. invented requirement rate medido;
16. compiler determinístico;
17. direct evidence priorizada;
18. judges separados do executor;
19. qualification válida e versionada;
20. development e decision separados;
21. provenance auditável;
22. pelo menos um development canary sem defeito conhecido de instrumento;
23. ownership matrix final;
24. todo código próprio com justificativa explícita.

E10 e E11 não são requisitos para concluir a Foundation.

## 87. Resultado arquitetural desejado

Se a hipótese se confirmar:

~~~
Skill Evidence
│
├── intake
├── snapshot/fingerprint
├── Evaluation Author
├── Evaluation Blueprint
├── lifecycle
├── qualification
├── evidence policy
├── eligibility
├── sampling semantics
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

> “possuímos nosso próprio framework de avaliação.”

E passa a ser:

> “Transformamos uma skill probabilística em uma avaliação fundamentada, auditável e falsificável; explicitamos quando informação decisória está ausente; qualificamos instrumentos e evidência antes de permitir conclusões; e delegamos execução genérica a uma infraestrutura especializada.”

## 88. Distinção essencial sobre automação

O objetivo de automação continua agressivo:

~~~
skill-evidence evaluate <skill>
~~~

Mas existem duas formas de automação.

Forma incorreta:

~~~
missing information
      ↓
LLM guesses
      ↓
complete-looking eval
      ↓
PASS/FAIL
~~~

Forma desejada:

~~~
skill
  ↓
maximum defensible inference
  ↓
explicit uncertainty
  ↓
DRAFT / BLOCKED / READY
  ↓
only qualified evidence
  ↓
bounded conclusion
~~~

O produto deve otimizar para a segunda.

## 89. Princípio de epistemic monotonicity

Adicionar um Judge, um modelo mais caro ou mais reasoning nunca pode aumentar a força de uma conclusão quando a evidência necessária não existe.

Exemplo:

~~~
required filesystem event not observable
~~~

não pode virar:

~~~
probably happened according to Terra
~~~

A resposta permanece:

~~~
INCONCLUSIVE
~~~

até que a observabilidade seja corrigida ou o claim seja enfraquecido.

## 90. Princípio de no silent promotion

Nenhum componente pode promover silenciosamente:

~~~
DRAFT → READY
READY → FROZEN
NOT_ELIGIBLE → ELIGIBLE
INCONCLUSIVE → PASS
NOT_EVALUATED → SUPPORTED
development evidence → decision evidence
heuristic evidence → causal evidence
experimental signal → stable signal
~~~

Toda promoção precisa de regra explícita e provenance.

## 91. Princípio de reversibilidade experimental

Cada estágio deve poder descobrir que a arquitetura presumida está errada.

Especialmente:

~~~
E2 pode rejeitar SDK only
E5 pode rejeitar automatic Author
E7 pode rejeitar determinado Judge
E8 pode revelar defeito de instrumento
~~~

O roadmap não deve transformar essas hipóteses em compromissos arquiteturais antecipados.

## 92. Escopo autorizado imediatamente

Após aprovação deste RFC, o primeiro trabalho autorizado é apenas:

> ExecPlan 1 — Theory First Promptfoo Foundation: E0–E2

Esse ExecPlan deve conter:

~~~
E0 clean foundation
E1 authentication
E2 observability
ownership matrix
G1
G2
~~~

Não deve implementar antecipadamente:

~~~
production Evaluation Author
full Blueprint compiler
historical regression corpus
oracle qualification system
decision evaluation
model optimization
App Server integration
large adapter layer
~~~

a menos que algo mínimo seja indispensável para E0–E2 e esteja explicitamente justificado.

## 93. Entregáveis esperados do ExecPlan 1

Ao final, queremos fatos, não uma arquitetura grande.

Entregáveis:

1. clean branch;
2. minimal TypeScript/package foundation;
3. reproducible Promptfoo Node API integration;
4. authentication experiment;
5. disposable observability canary;
6. version/provenance report;
7. observability capability table;
8. stable vs experimental signal classification;
9. cache/thread/concurrency/workspace findings;
10. Experimental Ownership Matrix;
11. explicit G2 recommendation.

A recomendação final de G2 deve ser uma destas, ou combinação explicitamente justificada:

~~~
CONTINUE_WITH_CODEX_SDK
CONTINUE_WITH_SMALL_ADAPTER
SPIKE_APP_SERVER
WEAKEN_SUPPORTED_CLAIMS
STOP_AND_REASSESS
~~~

## 94. Pergunta final da Foundation

A pergunta central permanece:

> Qual é a menor camada própria necessária para transformar uma skill em uma avaliação defensável, enquanto Promptfoo assume toda infraestrutura genérica que puder assumir sem reduzir a força da evidência, ocultar measurement defects ou ampliar indevidamente os claims?

Agora existe uma segunda pergunta igualmente obrigatória:

> Quando a skill não contém informação suficiente para uma decisão defensável, o sistema consegue reconhecer esse limite e bloquear corretamente em vez de fabricar completude?

As duas perguntas definem o sucesso desta reconstrução.

## 95. Princípio final

Esta feature não é uma migração da V1.

É uma reconstrução a partir de responsabilidades essenciais.

A V1 permanece valiosa porque revelou falhas reais de:

~~~
measurement
qualification
observability
semantic checking
evidence handling
evaluation design
~~~

Essas descobertas devem sobreviver como:

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

Promptfoo também não é presumido correto por autoridade.

Ele é a infraestrutura candidata.

Cada responsabilidade delegada a ele continua sujeita à pergunta:

> A superfície fornecida preserva a propriedade de medição que o claim necessita?

Se sim:

~~~
delegate
~~~

Se não sabemos:

~~~
experiment
~~~

Se não:

~~~
adapter
weaken claim
change infrastructure
or stop
~~~

O objetivo não é maximizar automação.

O objetivo é:

> maximizar automação sem ultrapassar a evidência disponível.
