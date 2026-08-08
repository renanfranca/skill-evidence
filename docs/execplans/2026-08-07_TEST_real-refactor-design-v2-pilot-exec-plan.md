# Executar o piloto real `refactor-design` v2

Este ExecPlan é vivo. Atualize `Progress`, `Decisions`, `Risks and
Mitigations` e `Lessons Learned` durante toda a execução.

## Purpose / Big Picture

Este plano executa uma única rodada real e auditável da Evaluation
`refactor-design-v2` depois da correção dos defeitos de observabilidade e
equivalência semântica encontrados no piloto anterior. O resultado observável
é um novo diretório ignorado em `.skill-evidence/runs/` com Evidence v2,
ledger, fingerprints e `report.md` reproduzível byte a byte. A evidência será
apresentada ao usuário antes de qualquer decisão humana.

`THEORY.md` foi consultado no commit
`572e963ea6f1207ab53c533592cb70a8239e221c`. A conclusão permanece limitada às
quatro amostras decisórias, ao skill, modelos, CLI, contratos e ambiente
registrados; ela não estabelece estabilidade, robustez, causalidade ou
generalização.

O condutor é `gpt-5.6-terra/xhigh`. A condição avaliada usa quatro executores
`gpt-5.6-luna/max`, uma calibração e até quatro juízes
`gpt-5.6-terra/xhigh`.

Safety boundary: This task is limited to one authorized, defensive evaluation
run in this repository. It does not archive, commit, push, publish, change
source code, change schemas, or create a human decision automatically.

## Scope

Em escopo: validar checkout e ambiente, confirmar plan/preflight v2, executar
uma vez o comando `run` autorizado, auditar Evidence v2 e apresentar o
resultado para revisão humana.

Fora de escopo: segunda invocação ou retomada automática, mais de nove sessões
ou 3,33 créditos, fake Codex, alteração de código/evaluation/schema, criação de
`review.json` sem nova decisão e justificativa do usuário, archive, commit,
push e publicação.

## Definitions

- **Plan v2**: `.skill-evidence/real-pilot-v2-0.147.0-plan.json`, que fixa
  Evaluation, skill, engine, schemas e condição dos modelos.
- **Preflight elegível**:
  `.skill-evidence/real-pilot-v2-0.147.0-preflight.json`, com os seis checks
  `PASS` e `eligible: true`.
- **Decision case**: um dos quatro casos novos e ainda não enviados aos
  modelos; os oito casos históricos permanecem desenvolvimento/regressão.
- **Rodada única**: no máximo uma calibração, quatro executores e quatro
  juízes, respeitando o teto conjunto de nove sessões e 3,33 créditos.
- **Falha terminal de calibração**: resultado auditável com apenas uma sessão,
  nenhum executor/juiz de caso e Evidence v2 inelegível.

## Existing Context

O ExecPlan `2026-08-07_FIX_pilot-measurement-validity-exec-plan.md` concluiu a
Evaluation v2 com 34 testes, fluxo fake elegível de nove sessões e preflight
real elegível. O checkout está no commit
`fb529357cff47c3914b952021a7fc82d353051f7`, limpo e sincronizado com
`origin/feat/skill-evidence-v1`. `codex --version` retorna
`codex-cli 0.147.0`.

O usuário autorizou em 2026-08-07 uma única rodada real limitada a até nove
sessões e 3,33 créditos, depois de informado de que Luna/max executa os casos e
Terra/xhigh faz calibração/julgamento.

## Desired End State

Uma única invocação real termina com Evidence v2 canônica. Se a calibração
falhar, o resultado terminal contém uma sessão e nenhum caso. Se passar, os
quatro decision cases aparecem separadamente por distribuição, com checks,
observabilidade, evidência direta e julgamento quando permitido. O ledger
nunca ultrapassa nove sessões ou 3,33 créditos, `render` reproduz o relatório
byte a byte e nenhum `review.json` ou archive é criado.

## Milestones

### Milestone 1 - Revalidar autorização e ambiente

#### Goal

Bloquear a rodada antes de qualquer modelo se checkout, CLI, validação ou
preflight divergir do estado autorizado.

#### Changes

Nenhum arquivo de produto muda. Atualizar somente este plano e seu status no
índice canônico.

#### Validation

- `git status --short --branch`
- `codex --version`
- `codex doctor --json`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run prettier:check`
- `npm run build`
- `node dist/cli.js check evaluations/refactor-design`
- Recalcular o preflight em `/tmp` e compará-lo ao preflight autorizado,
  ignorando somente `createdAt`.

#### Acceptance Criteria

O checkout permanece limpo; Codex é 0.147.0 e saudável; todas as validações
passam; o preflight fresco permanece elegível, com o mesmo `planDigest` e os
seis checks `PASS`.

### Milestone 2 - Executar uma rodada real

#### Goal

Consumir somente a autorização declarada e preservar todo resultado terminal.

#### Changes

Executar exatamente uma vez, sem `SKILL_EVIDENCE_CODEX_BIN`:

    node dist/cli.js run --plan .skill-evidence/real-pilot-v2-0.147.0-plan.json --preflight .skill-evidence/real-pilot-v2-0.147.0-preflight.json --approve-sessions 9 --max-credits 3.33

Não reinvocar automaticamente em falha, interrupção ou resultado
inelegível.

#### Validation

- `test -z "${SKILL_EVIDENCE_CODEX_BIN:-}"`
- Conferir que apenas um novo run foi criado e que o processo terminou.

#### Acceptance Criteria

Existe um único novo diretório de run correspondente à invocação autorizada,
com saída terminal preservada e sem exceder os limites.

### Milestone 3 - Auditar e apresentar a evidência

#### Goal

Separar coleta de evidência da decisão humana e entregar um resumo verificável.

#### Changes

Auditar schema, fingerprints, calibração, ledger, papéis, sanitização,
decision cases, claims, elegibilidade e relatório. Atualizar este ExecPlan com
o run ID, resultado, consumo, riscos e lições.

#### Validation

- `node dist/cli.js render --evidence <run>/evidence.json > /tmp/refactor-design-v2-report.md`
- `cmp -s /tmp/refactor-design-v2-report.md <run>/report.md`
- Confirmar ausência de `review.json` e archive.

#### Acceptance Criteria

O usuário recebe resultado, consumo, casos, claims, elegibilidade e limitações
antes de qualquer decisão. Este plano e o índice registram o estado final da
rodada.

## Progress

- [x] ExecPlan criado e registrado antes da rodada real.
- [x] Milestone 1 iniciado.
- [x] Milestone 1 concluído.
- [x] Milestone 2 iniciado.
- [x] Milestone 2 concluído.
- [x] Milestone 3 iniciado.
- [x] Milestone 3 concluído.

## Decisions

- Decision: autorizar uma única rodada real com até nove sessões e 3,33
  créditos.
  Rationale: o instrumento v2 concluiu os gates fake, os casos decisórios são
  novos e o preflight está elegível.
  Date/Author: 2026-08-07 / usuário.
- Decision: não criar revisão humana automaticamente.
  Rationale: a decisão deve ocorrer somente após apresentação da evidência.
  Date/Author: 2026-08-07 / usuário e gpt-5.6-terra-xhigh.
- Decision: não atribuir ao skill os dois `FAIL` dos casos de stress e não
  reinvocar o run.
  Rationale: o path audit classificou `2>/dev/null` como escrita fora do
  workspace; essa falsa evidência direta contaminou ambos os julgamentos e
  exige correção do instrumento em outro ExecPlan.
  Date/Author: 2026-08-07 / gpt-5.6-terra-xhigh.
- Decision: registrar a revisão humana como `inconclusive`.
  Rationale: a falsa evidência direta de `2>/dev/null` contaminou os dois
  resultados de stress, portanto a rodada não pode confirmar nem rejeitar o
  skill. `review.json` foi gravado no run sem archive.
  Date/Author: 2026-08-08 / usuário.

## Risks and Mitigations

- Risk: drift invalidar a autorização.
  Mitigation: recomputar o preflight e bloquear antes do run.
- Risk: calibração falhar.
  Mitigation: aceitar apenas a falha terminal auditável e não iniciar casos.
- Risk: sessão exceder o orçamento.
  Mitigation: passar ambos os limites ao CLI e conferir o ledger.
- Risk: interrupção deixar run parcial.
  Mitigation: preservar artefatos e não reinvocar sem nova autorização.
- Risk: conteúdo sensível aparecer em evidência canônica.
  Mitigation: auditar sanitização e manter raws somente no diretório ignorado.
- Risk: o path audit trate sinks descartáveis como escrita persistente fora do
  workspace.
  Mitigation: preservar este run como evidência do defeito, manter a decisão
  humana pendente e corrigir o detector somente em novo ExecPlan com regressão
  comportamental.

## Validation Strategy

Executar os gates na ordem: checkout, CLI/doctor, validação completa,
preflight fresco, uma invocação real e auditoria canônica. Qualquer falha
antes do run impede chamadas de modelo. Depois do run, nenhuma correção ou
segunda tentativa ocorre neste plano.

Checkpoint executado em 2026-08-07: `codex doctor --json` fora do sandbox
retornou `overallStatus: "ok"`; lint, typecheck, 34 testes, Prettier, build e
`check` passaram. O preflight fresco manteve
`planDigest: 338c3f43908b2b213266f4e3fe8eb5ddfc702b6962ab951f3358a8cc8c109b9c`,
`eligible: true` e os seis checks `PASS`, idêntico ao autorizado exceto por
`createdAt`.

A única invocação real terminou com exit code 0 após 499 segundos e criou
`2026-08-07T18-00-19-962Z-15cbd23d`. A calibração aprovou 16/16 probes. O
ledger registrou nove sessões e 3,33 créditos: uma calibração, quatro
executores e quatro juízes. Os casos `usage-job-presenter` e
`usage-stable-route-parser` passaram; `stress-exported-sentinel` e
`stress-immutable-balance` falharam porque o path audit interpretou os
redirecionamentos de stderr `2>/dev/null` como escrita fora do workspace.

Evidence v2 é schema-válida, seus fingerprints e digest de preflight conferem,
e o relatório foi reproduzido byte a byte. A evidência canônica não contém
raciocínio bruto nem credencial detectável. O resultado é `NOT ELIGIBLE`, com
dois `PASS`, dois `FAIL`, duas violações críticas e quatro claims
`NOT_SUPPORTED`; nenhum `review.json` ou archive foi criado.

## Documentation Impact

Este arquivo e `docs/execplans/README.md` são as únicas fontes canônicas
alteradas. `README.md` continua correto porque o comando, limites, modelos,
casos, Evidence e gate de revisão não mudam. Código, schemas e evaluation
permanecem imutáveis. O índice marca este plano como concluído porque a rodada
autorizada terminou e foi auditada, embora a evidência seja inelegível.

## Rollout and Recovery

Não existe rollout. Em falha, preservar o run, registrar seu estado e parar.
Não apagar artefatos, não reinvocar, não arquivar e não executar operações
Git. Uma nova tentativa exige novo ExecPlan e nova autorização explícita.

## Lessons Learned

- O `codex doctor --json` dentro do sandbox falhou apenas porque rede e bancos
  locais estavam bloqueados; a repetição autorizada fora do sandbox retornou
  `overallStatus: "ok"`, com todos os checks individuais `ok`.
- O primeiro gate de formato encontrou somente a nova linha do índice fora do
  alinhamento do Prettier. A correção foi mecânica e a sequência completa será
  reiniciada antes de qualquer sessão.
- A rodada real consumiu exatamente o teto autorizado de nove sessões e 3,33
  créditos; os dois casos de uso passaram e os dois de stress foram
  invalidados pelo mesmo falso positivo de path audit.
- `observesOutOfScopeWrite` reconhece qualquer redirecionamento absoluto; por
  isso `2>/dev/null`, usado apenas para descartar stderr de `rg`, foi tratado
  como escrita externa. A precedência correta da evidência direta amplificou
  um erro anterior do instrumento, demonstrando que o classificador mecânico
  também precisa de qualificação contra sinks inofensivos.
