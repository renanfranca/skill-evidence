# Corrigir calibração cega e Evidence de falha

Este ExecPlan é vivo: `Progress`, `Decisions`, `Risks and Mitigations` e
`Lessons Learned` serão atualizados durante a implementação.

## Purpose / Big Picture

O CLI deve validar que o juiz discrimina comportamentos conhecidos antes de
iniciar um executor. Quando a calibração falhar, `skill-evidence run` deve
produzir Evidence v2 e `report.md` auditáveis, imprimir o diretório e terminar
com código diferente de zero; nenhuma sessão de executor, juiz de caso,
review ou archive poderá iniciar. Uma calibração aprovada preservará o fluxo
fake de nove sessões.

Safety boundary: This task is limited to authorized, defensive maintenance of
this repository. It uses only `test/fixtures/fake-codex.mjs` for commands that
can invoke a session and never starts a real Codex session.

## Scope

Em escopo: pacotes de qualificação estritos, IDs cegos determinísticos,
`qualification.schema.json`, contrato sem labels com o subprocesso,
persistência sanitizada de input/resultados, Evidence v2 aditiva, o outcome de
`executePlan`, falha auditável, testes e README. Apenas quatro decision cases
fornecem os 16 probes; development cases continuam como regressão sem entrar
na decisão.

Fora de escopo: editar `THEORY.md`, mudar pilotos/artefatos existentes em
`.skill-evidence`, iniciar sessão real, mudar os limites de uma calibração,
nove sessões e 3,33 créditos, review, archive, commit, push ou publicação. O
implementador é `gpt-5.6-terra/xhigh`; o piloto conserva Luna/max para
executores e Terra/xhigh para calibração/julgamento. A saída do implementador
não é oracle e expectativas não são alteradas após observar qualquer modelo.

## Definitions

- **Qualification package**: `examples.json` versão 1 contendo exatamente
  quatro objetos `{ purpose, input }`.
- **Probe cego**: objeto enviado como `{ id, judgeInput, oracle }`, onde
  `id` é `probe-<sha256>` derivado canonicamente do caso e pacote.
- **Oracle**: regra privada no payload, nunca label, status esperado ou
  variável de ambiente.
- **Calibração**: uma sessão para os 16 probes dos decision cases, usando a
  mesma rubrica central de julgamentos reais.
- **Evidence v2 histórica**: arquivo v2 já emitido que deve renderizar mesmo
  sem os novos campos; produção nova sempre emite os campos aditivos.

Os resultados esperados são derivados localmente e fixos: `known-valid` é
`PASS`, `known-invalid` é `FAIL`, `alternative-valid` é `PASS` e
`unsupported-fluency` é `INCONCLUSIVE`.

## Existing Context

Hoje `src/evaluation.ts` aceita quatro strings legadas (`valid`, `invalid`,
`alternative`, `unsupported`). `src/runner.ts` envia IDs com semântica e
`expectedStatus` em `SKILL_EVIDENCE_CALIBRATION_PROBES`; prompt e ambiente
podem portanto correlacionar a resposta. Quando a calibração não passa, ele
lança antes de persistir Evidence, claims, ledger ou relatório.

A reprodução local é rotear as 16 respostas fake para `INCONCLUSIVE` e chamar
`run`: há uma sessão fake e raw local, mas o comportamento atual lança sem
`evidence.json`/`report.md`. A correção deve gerar uma sessão, 0,37 crédito,
cases vazios, claims `NOT_EVALUATED`, inelegibilidade `Judge calibration
failed`, artefatos e saída não zero, sem executor.

`README.md` e ExecPlans anteriores apontam para
`renanfranca/skill-evaluation-theory@c1fb47c40b806596d89fa3196e53967f20c8926c`
como normativo. O `THEORY.md`/commit não está no worktree nem histórico local
em 2026-08-06 e não será inventado ou editado. Dos artefatos canônicos e do
pedido derivam-se os princípios aplicáveis: separar development de decisão;
evidência direta e observabilidade têm precedência; ausência observável é
`INCONCLUSIVE`; limites de uso são explícitos; evidência positiva e negativa é
persistida; calibração prova discriminação, não independência; e claims fora
do escopo ficam `NOT_EVALUATED`.

## Desired End State

Todo `examples.json` deverá obedecer ao seguinte formato estrito:

```json
{
  "schemaVersion": 1,
  "probes": [
    {
      "purpose": "known-valid",
      "input": {
        "schemaVersion": 1,
        "caseId": "example-case",
        "contracts": ["example-contract"],
        "checks": [
          {
            "id": "known-valid-evidence",
            "state": "PASS",
            "contractId": "example-contract",
            "phase": "required-effect",
            "severity": "critical",
            "facts": ["Direct evidence supports the contract."],
            "evidence": {
              "type": "diff",
              "digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "reference": "example.diff"
            }
          }
        ],
        "observable": {
          "diff": "+ supported change",
          "commands": [{ "argv": ["node", "--test"], "exitCode": 0, "stdout": "pass", "stderr": "" }],
          "trajectory": [],
          "finalMessage": "Supported result."
        }
      }
    },
    {
      "purpose": "known-invalid",
      "input": {
        "schemaVersion": 1,
        "caseId": "example-case",
        "contracts": ["example-contract"],
        "checks": [
          {
            "id": "known-invalid-evidence",
            "state": "FAIL",
            "contractId": "example-contract",
            "phase": "required-effect",
            "severity": "critical",
            "facts": ["Direct evidence establishes a violation."],
            "evidence": {
              "type": "diff",
              "digest": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              "reference": "example.diff"
            }
          }
        ],
        "observable": { "diff": "+ violating change", "commands": [], "trajectory": [], "finalMessage": "Violated result." }
      }
    },
    {
      "purpose": "alternative-valid",
      "input": {
        "schemaVersion": 1,
        "caseId": "example-case",
        "contracts": ["example-contract"],
        "checks": [
          {
            "id": "alternative-valid-evidence",
            "state": "PASS",
            "contractId": "example-contract",
            "phase": "required-effect",
            "severity": "critical",
            "facts": ["A different direct implementation still meets the contract."],
            "evidence": {
              "type": "diff",
              "digest": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
              "reference": "example.diff"
            }
          }
        ],
        "observable": {
          "diff": "+ equivalent change",
          "commands": [{ "argv": ["node", "--test"], "exitCode": 0, "stdout": "pass", "stderr": "" }],
          "trajectory": [],
          "finalMessage": "Equivalent supported result."
        }
      }
    },
    {
      "purpose": "unsupported-fluency",
      "input": {
        "schemaVersion": 1,
        "caseId": "example-case",
        "contracts": ["example-contract"],
        "checks": [
          {
            "id": "unsupported-fluency-evidence",
            "state": "INCONCLUSIVE",
            "contractId": "example-contract",
            "phase": "required-effect",
            "severity": "critical",
            "facts": ["No observable evidence supports the fluent claim."],
            "evidence": {
              "type": "message",
              "digest": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
              "reference": "example.message"
            }
          }
        ],
        "observable": { "diff": "", "commands": [], "trajectory": [], "finalMessage": "Excellent work." }
      }
    }
  ]
}
```

Os inputs completos devem validar contra `judge-input.schema.json`. O schema
novo exigirá `schemaVersion: 1`, exatamente essas finalidades e nenhum campo
adicional. A entrada de sessão persistida em `calibration-input.json` é
exatamente e somente:

```json
[{"id":"probe-<digest>","judgeInput":{...},"oracle":"..."}]
```

O output estrito aceito é exatamente:

```json
{ "probes": [{ "id": "probe-<digest>", "status": "PASS", "rationale": "..." }] }
```

Nem `purpose`, resultado esperado, nem variáveis contendo-os chegam ao
prompt/ambiente do subprocesso. `calibration-result.json` registra esperado e
observado, enquanto JSONL/stderr são sanitizados. Evidence v2 ganha
`calibration.inputDigest`, `resultDigest` e por probe `expectedStatus`,
`observedStatus`, `rationale`, `passed`; o schema aceita v2 histórica, o
produtor não. `executePlan` retorna `completed` ou `calibration-failed`.

## Milestones

### Milestone 1 - Pacotes estritos e 16 probes

#### Goal

Rejeitar entrada legada/incompleta pelo carregamento público e criar somente
os 16 probes das quatro decision cases, todos com judge input válido.

#### Changes

- [x] Adicionar `schemas/qualification.schema.json` e registrá-lo em
      `src/schema.ts`.
- [x] Alterar `src/types.ts`, `src/evaluation.ts` e os oito `examples.json`.
- [x] Criar teste de comportamento em `test/core.test.ts` pelo loader público.
- [x] Atualizar este ExecPlan; README não muda até a interface estar completa.

#### Validation

- [x] `env SKILL_EVIDENCE_CODEX_BIN="$PWD/test/fixtures/fake-codex.mjs" npm test`
- [x] `npm run lint && npm run typecheck`
- [x] `node dist/cli.js check evaluations/refactor-design`

#### Acceptance Criteria

- [x] Legado, campos extras e pacote faltando probe são rejeitados.
- [x] Há exatamente 16 probes de decisão com expectativas derivadas localmente.

### Milestone 2 - Sessão cega e persistência

#### Goal

O subprocesso recebe o pacote fechado sem labels/expectativas e toda resposta
ausente, duplicada, desconhecida, malformada ou incompleta reprova de modo
auditável.

#### Changes

- [x] Alterar `src/runner.ts` para IDs de digest, payload/output estritos,
      rubrica compartilhada e artefatos de calibração.
- [x] Alterar `test/fixtures/fake-codex.mjs`: roteamento de resultado só pelo
      canal fake que existe quando `SKILL_EVIDENCE_CODEX_BIN` está definido.
- [x] Criar testes por API/artefato para pacote cego, ambiente sem oracle e as
      quatro finalidades.
- [x] Atualizar README e o ExecPlan.

#### Validation

- [x] `env SKILL_EVIDENCE_CODEX_BIN="$PWD/test/fixtures/fake-codex.mjs" npm test`
- [x] `npm run build && node dist/cli.js check evaluations/refactor-design`

#### Acceptance Criteria

- [x] O prompt/payload não contém labels; o ambiente real não contém resposta esperada.
- [x] Input, resultado, JSONL e stderr sanitizados existem no run.

### Milestone 3 - Falha terminal auditável

#### Goal

Transformar a falha precoce numa evidência completa que impede todos os papéis
posteriores e faz a CLI retornar código não zero depois de escrever o report.

#### Changes

- [x] Estender `src/types.ts`, `schemas/evidence.schema.json`, `src/runner.ts`
      e `src/report.ts` de forma aditiva.
- [x] Alterar `src/cli.ts` para sempre escrever report/imprimir diretório e
      marcar falha de calibração no exit code.
- [x] Criar teste de jornada com 16 `INCONCLUSIVE`: uma sessão, 0,37 crédito,
      cases vazios, claims não avaliadas, artifacts e zero executores.
- [x] Atualizar README e ExecPlan.

#### Validation

- [x] `env SKILL_EVIDENCE_CODEX_BIN="$PWD/test/fixtures/fake-codex.mjs" npm test`
- [x] `npm run build`
- [x] Run fake público explicitado em Validation Strategy.

#### Acceptance Criteria

- [x] Falha é Evidence v2 schema-válida com `Judge calibration failed`.
- [x] Fluxo fake aprovado ainda tem nove sessões e precedência de evidência direta.

### Milestone 4 - Reconciliar e validar

#### Goal

Garantir documentação, qualidade e contratos públicos sem iniciar sessão real.

#### Changes

- [x] Atualizar Progress, decisões, riscos e lições deste plano.
- [x] Reconciliar `README.md`.
- [x] Revisar desenho somente em verde, preservando contratos.

#### Validation

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run prettier:check`
- [x] `npm run build`
- [x] `node dist/cli.js check evaluations/refactor-design`
- [x] `node dist/cli.js plan evaluations/refactor-design --model gpt-5.6-luna --reasoning-effort max --judge-model gpt-5.6-terra --judge-reasoning-effort xhigh --out /tmp/skill-evidence-plan.json`
- [x] `node dist/cli.js preflight --plan /tmp/skill-evidence-plan.json --out /tmp/skill-evidence-preflight.json`
- [x] `env SKILL_EVIDENCE_CODEX_BIN="$PWD/test/fixtures/fake-codex.mjs" node dist/cli.js run --plan /tmp/skill-evidence-plan.json --preflight /tmp/skill-evidence-preflight.json --approve-sessions 9 --max-credits 3.33`

#### Acceptance Criteria

- [x] A validação é verde; um cenário fake explicitamente reprovado tem saída
      não zero e todos os artefatos, enquanto o checkpoint fake aprovado preserva
      nove sessões. Nenhuma sessão real começa.

## Progress

- [x] ExecPlan criado antes da primeira alteração de código.
- [x] Milestone 1 iniciado e concluído.
- [x] Milestone 2 iniciado e concluído.
- [x] Milestone 3 iniciado e concluído.
- [x] Milestone 4 iniciado.
- [x] Milestone 4 concluído.

## Decisions

- Decision: o implementador Terra/xhigh é distinto da condição piloto.
  Rationale: impedir ajuste para agradar o mesmo modelo usado pelo juiz.
  Date/Author: 2026-08-06 / gpt-5.6-terra-xhigh.
- Decision: expectativa é derivada antes do subprocesso e não transmitida.
  Rationale: proteger contra correlação e mudança pós-observação.
  Date/Author: 2026-08-06 / gpt-5.6-terra-xhigh.
- Decision: schema preserva v2 histórica, produtor exige campos novos.
  Rationale: renderização histórica não pode ser perdida.
  Date/Author: 2026-08-06 / gpt-5.6-terra-xhigh.
- Decision: criar o snapshot arquivável somente depois de uma calibração
  aprovada; a evidência de falha não inclui `skillSnapshot`.
  Rationale: uma reprovação não pode iniciar archive, executor ou juiz de caso.
  Date/Author: 2026-08-06 / gpt-5.6-terra-xhigh.

## Risks and Mitigations

- Risk: fake mascara vazamento de resposta esperada.
  Mitigation: testar ambiente observado e permitir roteamento somente com bin fake.
- Risk: retorno antecipado perde uso/ledger.
  Mitigation: construir Evidence logo após a sessão de calibração.
- Risk: schema estrito quebra arquivos históricos.
  Mitigation: testar renderização de Evidence v1/v2 e aceitar v2 legado.
- Risk: binário padrão inicia sessão real.
  Mitigation: cada comando de sessão deste plano aponta explicitamente à fixture.
- Risk: resposta estruturada parcialmente correta poderia ocultar uma omissão
  ou duplicação.
  Mitigation: validar cardinalidade, campos, IDs conhecidos e unicidade antes
  de materializar qualquer resultado de calibração.

## Validation Strategy

TDD silencioso executa nesta ordem os comportamentos observáveis: pacotes
estritos, pacote cego, discriminação, falha auditável, nove sessões fake. Cada
ciclo tem teste RED, suíte relevante completa, mínimo GREEN e refatoração só
em verde. Um checkpoint pelo caminho público ocorre no máximo a cada dois
ciclos. Testes observam CLI, artefatos canônicos ou APIs estáveis, não helpers
nem topologia interna. Os comandos de Milestone 4 são a validação final.

## Documentation Impact

`README.md` foi atualizado como fonte canônica para usuário, descrevendo o
pacote cego, artefatos e falha. Este arquivo registra decisões e execução.
`THEORY.md` permanece normativo por referência no README, mas indisponível
localmente e não modificado.

## Rollout and Recovery

Distribuir schemas, produtor e exemplos juntos. Em reversão, reverter todos os
arquivos desta mudança em conjunto; não apagar runs, que são evidência local.
Uma sessão real continua exigindo autorização posterior e separada.

## Lessons Learned

- Limitação inicial: `THEORY.md@c1fb47c...` não existe no checkout ou
  histórico local; o plano usa somente princípios explícitos no pedido e
  documentos canônicos presentes.
- Os pacotes estritos são validados durante `loadEvaluation` para decision e
  development cases; só `qualificationProbes` seleciona as quatro decisões.
- O checkpoint público após os dois primeiros comportamentos foi
  `npm run build && node dist/cli.js check evaluations/refactor-design`, verde.
- Uma falha de calibração agora materializa Evidence v2 e report antes de
  sinalizar o exit code, e não cria o snapshot arquivável; testes fake cobrem
  16 `INCONCLUSIVE` e respostas ausentes, duplicadas, desconhecidas,
  malformadas ou incompletas.
- A revisão `refactor-design` classificou o fluxo de calibração e os dois
  builders de Evidence como **No action**: compartilham fatos, mas representam
  fases distintas e o snapshot de sucesso não pode ser abstraído para a falha
  sem reintroduzir o acoplamento temporal que a mudança eliminou.
- A validação final foi verde em 2026-08-06, incluindo `lint`, `typecheck`,
  32 testes fake, `prettier:check`, build, check/plan/preflight e run público
  fake de nove sessões/3,33 créditos.
