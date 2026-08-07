# Executar o piloto real pós-hardening

Este ExecPlan é vivo. Atualize `Progress`, `Decisions`, `Risks and
Mitigations` e `Lessons Learned` durante toda a execução.

## Purpose / Big Picture

Este plano conduz uma única execução real, limitada e auditável da avaliação
de `refactor-design` após o hardening da calibração. O resultado observável é
um diretório novo em `.skill-evidence/runs/` com Evidence v2, ledger,
fingerprints, dados sanitizados e `report.md` que `render` reproduz byte a
byte. Nenhuma decisão humana será criada automaticamente: após apresentar a
evidência, somente a decisão e a justificativa explicitamente fornecidas pelo
usuário poderão entrar em `review.json`.

Safety boundary: This task is limited to authorized, defensive maintenance of
this repository. It performs one approved evaluation run only; it never
archives, stages, commits, pushes, publishes, changes APIs, or changes schemas.

## Scope

Em escopo: documentação operacional, atualização global exata para Codex CLI
0.147.0, `doctor`, validação local, novo plano e preflight, uma rodada real
nos quatro decision cases, auditoria da evidência e preparação para revisão
humana.

Fora de escopo: reutilizar qualquer `authorized-real-pilot-*`, usar
`SKILL_EVIDENCE_CODEX_BIN`, atualizar código, schemas ou APIs para acomodar a
CLI, criar `review.json` sem decisão e justificativa do usuário, archive,
commit, push e publicação.

O condutor deste plano deve ser a sessão `gpt-5.6-terra/xhigh`. A condição
avaliada permanece separada: quatro executores usam `gpt-5.6-luna/max`; uma
calibração e até quatro juízes usam `gpt-5.6-terra/xhigh`.

## Definitions

- **Decision case**: um dos quatro casos novos que afetam a decisão do
  piloto; casos de desenvolvimento são apenas regressão.
- **Preflight elegível**: arquivo recém-gerado com os seis contratos em
  `PASS` e `eligible: true`.
- **Evidence v2**: registro canônico do run, incluindo claims, casos,
  calibração, fingerprints e ledger de sessões.
- **Calibração terminal**: a única sessão de calibração deve passar antes de
  iniciar executor ou juiz de caso. Se falhar, o run auditável termina não
  zero depois de registrar somente essa sessão.
- **Reprodução byte a byte**: o resultado de `render` é idêntico a
  `report.md` por comparação binária.

## Existing Context

`README.md` descreve o fluxo público. `docs/execplans/README.md` é o índice
canônico de ExecPlans. O plano de hardening
`2026-08-06_FIX_judge-calibration-evidence-exec-plan.md` foi validado em fake
e deixa os artefatos históricos preservados em `.skill-evidence/`.

Antes deste plano, o binário instalado reportou `codex-cli 0.146.0`. Os
artefatos antigos `authorized-real-pilot-plan.json` e
`authorized-real-pilot-preflight.json` existem, mas são somente histórico e
não entram em nenhum comando deste plano.

## Desired End State

O repositório permanece limpo, com documentação reconciliada e validação verde
após a atualização do CLI. Os arquivos
`.skill-evidence/real-pilot-0.147.0-plan.json` e
`.skill-evidence/real-pilot-0.147.0-preflight.json` são novos e o preflight é
elegível nos seis contratos. Um único run real respeita no máximo nove sessões
e 3,33 créditos, produz evidência imutável e auditável, e não cria review,
archive ou alteração de Git automaticamente.

Se a calibração falhar, a execução aceita o resultado terminal auditável: uma
sessão, zero executor/juiz de caso, saída não zero e Evidence v2. Se ela
passar, os quatro decision cases são revisados pela evidência direta,
precedência, claims e elegibilidade antes de solicitar a decisão humana.

## Milestones

### Milestone 1 - Registrar o piloto e reconciliar documentos

#### Goal

Criar o ExecPlan autocontido e alinhar o índice, plano de calibração e README
antes de qualquer sessão real.

#### Changes

- [x] Criar este arquivo no local canônico.
- [x] Marcar o plano de calibração concluído e fechar checks de validação
      cobertos pelo checkpoint final dele.
- [x] Atualizar o índice canônico e fazer o README apontar para ele.

#### Validation

- [x] `git diff --check`
- [x] `git status --short`

#### Acceptance Criteria

- [x] O plano é suficiente para um novo operador continuar sem contexto
      externo.
- [x] Documentos citam o índice, não um único ExecPlan como registro vivo.

### Milestone 2 - Atualizar e aprovar o ambiente

#### Goal

Instalar exatamente Codex 0.147.0 e bloquear o piloto diante de qualquer
diagnóstico diferente de saudável.

#### Changes

- [x] Executar fora do sandbox `npm install -g @openai/codex@0.147.0`.
- [x] Confirmar `codex --version` igual a `codex-cli 0.147.0`.
- [x] Executar fora do sandbox `codex doctor --json` e registrar o resultado.

#### Validation

- [x] `codex --version`
- [x] `codex doctor --json`

#### Acceptance Criteria

- [x] O diagnóstico apresenta exclusivamente estado `ok`.
- [x] Divergência de versão, instalação ou doctor interrompe o plano antes do
      preflight e de qualquer sessão real.

### Milestone 3 - Validar, gerar novo plano e preflight

#### Goal

Provar que o checkout e a interface pública continuam íntegros na versão
instalada e gerar a autorização determinística específica de 0.147.0.

#### Changes

- [x] Executar lint, typecheck, os 32 testes fake, Prettier, build e `check`.
- [x] Gerar `real-pilot-0.147.0-plan.json` com Luna/max e Terra/xhigh.
- [x] Gerar `real-pilot-0.147.0-preflight.json` e verificar os seis contratos.

#### Validation

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run prettier:check`
- [x] `npm run build`
- [x] `node dist/cli.js check evaluations/refactor-design`
- [x] `node dist/cli.js plan evaluations/refactor-design --model gpt-5.6-luna --reasoning-effort max --judge-model gpt-5.6-terra --judge-reasoning-effort xhigh --out .skill-evidence/real-pilot-0.147.0-plan.json`
- [x] `node dist/cli.js preflight --plan .skill-evidence/real-pilot-0.147.0-plan.json --out .skill-evidence/real-pilot-0.147.0-preflight.json`

#### Acceptance Criteria

- [x] Não há regressão em nenhuma validação.
- [x] Os seis contratos de preflight são `PASS`, `eligible` é `true` e nenhum
      artefato histórico é sobrescrito.

### Milestone 4 - Executar e auditar uma única rodada real

#### Goal

Executar estritamente o run autorizado e validar seu registro antes de qualquer
revisão humana.

#### Changes

- [x] Confirmar que `SKILL_EVIDENCE_CODEX_BIN` não está definido.
- [x] Rodar uma vez `node dist/cli.js run --plan .skill-evidence/real-pilot-0.147.0-plan.json --preflight .skill-evidence/real-pilot-0.147.0-preflight.json --approve-sessions 9 --max-credits 3.33`.
- [ ] Validar Evidence v2, fingerprints, ledger, sanitização e a reprodução
      byte a byte de `report.md`.
- [ ] Em sucesso de calibração, revisar casos, claims, precedência da evidência
      direta e elegibilidade; em falha, validar o caminho terminal auditável.

#### Validation

- [ ] `test -z "${SKILL_EVIDENCE_CODEX_BIN:-}"`
- [ ] O comando de `run` acima, uma única vez.
- [ ] `node dist/cli.js render --evidence <run>/evidence.json > <rendered-report>` seguido de `cmp -s <rendered-report> <run>/report.md`.

#### Acceptance Criteria

- [ ] Nunca há mais de nove sessões ou 3,33 créditos no ledger.
- [ ] O run contém somente os papéis permitidos e evidência sanitizada.
- [ ] A falha de calibração tem exatamente uma sessão e zero executor/juiz de
      caso; sucesso contém análise dos quatro decision cases.

### Milestone 5 - Apresentar evidência e concluir após revisão humana

#### Goal

Entregar a evidência verificável ao usuário e somente então persistir uma
decisão humana autorizada.

#### Changes

- [ ] Apresentar resultado, elegibilidade, consumo, casos, claims e riscos ao
      usuário antes de `review.json`.
- [ ] Se o usuário fornecer decisão e justificativa: usar `confirm`, `reject`
      ou `inconclusive` se elegível; somente `reject` ou `inconclusive` se
      inelegível.
- [ ] Finalizar este plano com consumo, resultado, decisão recebida, riscos e
      lições; manter archive/Git fora do escopo.

#### Validation

- [ ] `review.json`, se e somente se a decisão e a justificativa forem
      fornecidas pelo usuário.

#### Acceptance Criteria

- [ ] Nenhuma decisão é inventada pelo executor.
- [ ] O ExecPlan registra a revisão humana e deixa claro se ela ainda está
      pendente.

## Progress

- [x] Milestone 1 iniciado.
- [x] Milestone 1 concluído.
- [x] Milestone 2 iniciado.
- [x] Milestone 2 concluído.
- [x] Milestone 3 iniciado.
- [x] Milestone 3 concluído.
- [x] Milestone 4 iniciado.
- [ ] Milestone 4 concluído.
- [ ] Milestone 5 iniciado.
- [ ] Milestone 5 concluído.

## Decisions

- Decision: gerar artefatos `real-pilot-0.147.0-*` novos em vez de reutilizar
  os artefatos autorizados anteriores.
  Rationale: versionar a autorização determinística com a atualização do CLI
  e preservar a trilha de auditoria existente.
  Date/Author: 2026-08-07 / usuário.
- Decision: a revisão só é criada após apresentação da evidência e usando
  exclusivamente decisão e justificativa fornecidas pelo usuário.
  Rationale: a decisão é humana; o CLI não deve inferi-la da evidência.
  Date/Author: 2026-08-07 / usuário.
- Decision: corrigir exclusivamente a formatação do índice antes de reiniciar
  a validação completa.
  Rationale: o primeiro teste de formatos bloqueou antes da geração do
  preflight; não houve mudança de comportamento, API ou schema.
  Date/Author: 2026-08-07 / gpt-5.6-terra-xhigh.
- Decision: não iniciar uma segunda invocação de `run` após a interrupção da
  primeira.
  Rationale: o CLI não tem opção de retomada; uma nova invocação abriria outra
  calibração e poderia exceder a autorização de uma única rodada/nove sessões.
  Date/Author: 2026-08-07 / gpt-5.6-terra-xhigh.

## Risks and Mitigations

- Risk: a atualização para 0.147.0 é incompatível com a interface atual.
  Mitigation: bloquear antes de sessão real, não alterar APIs/schemas e
  atualizar este plano antes de qualquer trabalho corretivo.
- Risk: `doctor` revela estado não saudável.
  Mitigation: parar antes do preflight e registrar o estado concreto.
- Risk: sessão real excede limite autorizado.
  Mitigation: passar ambos os limites ao CLI e conferir ledger após o run.
- Risk: calibração reprova.
  Mitigation: aceitar apenas o caminho de falha terminal, auditá-lo e não
  iniciar executor/juiz de caso.
- Risk: conteúdo sensível aparece no raw local.
  Mitigation: conferir que Evidence canônica e relatório estão sanitizados;
  raws ignorados permanecem locais para diagnóstico.
- Risk: interrupção externa após calibração aprovada deixa um run parcial sem
  Evidence v2, report ou mecanismo de retomada.
  Mitigation: preservar o diretório parcial, não reinvocar automaticamente e
  exigir autorização e ExecPlan atualizado antes de qualquer tentativa nova.

## Validation Strategy

Executar os gates na ordem: documentos, versão, `doctor`, validação completa,
plano, preflight, uma única sessão real e auditoria canônica. Qualquer falha
antes do run encerra a execução sem iniciar modelo real. Depois do run,
`render` deve produzir o mesmo `report.md` por comparação binária. A revisão
humana é um gate separado e nunca é automatizada.

## Documentation Impact

`docs/execplans/README.md` é a fonte canônica da navegação dos ExecPlans e
passa a listar a conclusão da calibração e este piloto ativo. O plano de
calibração recebe apenas checks de validação já cobertos por sua validação final.
`README.md` troca o link direto para o plano anterior pelo índice canônico.
Não há mudança de contrato de usuário do CLI, portanto nenhuma outra
documentação é necessária.

## Rollout and Recovery

Não existe rollout nem publicação neste plano. Se um gate falhar, preservar
todos os artefatos escritos, não iniciar novas sessões e corrigir somente após
um ExecPlan atualizado e autorização apropriada. Não apagar ou modificar runs
históricos; não fazer archive nem operações Git.

## Lessons Learned

- A instalação global exata `npm install -g @openai/codex@0.147.0` concluiu em
  2026-08-07 e `codex --version` retornou `codex-cli 0.147.0`.
- `codex doctor --json` retornou `overallStatus: "ok"`; todos os checks
  individuais retornaram `status: "ok"`. O diagnóstico também registrou
  `model: "gpt-5.6-terra"`, autenticação ChatGPT configurada e alcance do
  provedor/WebSocket saudável.
- O primeiro `npm test` pós-documentação teve 31/32 testes verdes e bloqueou
  antes de preflight/sessão real porque o teste de formatos apontou somente
  `docs/execplans/README.md` fora do Prettier; a sequência completa será
  reiniciada depois da correção mecânica do formato.
- A sequência reiniciada ficou verde: `lint`, `typecheck`, 32 testes fake,
  `prettier:check`, build e `check`. Os arquivos novos foram gerados sem
  sobrescrever os históricos; o preflight tem `eligible: true` e seis checks
  `PASS` (`engine-fingerprint`, `schema-fingerprint`,
  `evaluation-fingerprint`, `skill-fingerprint`, `model-condition` e
  `executor-sandbox`).
- A única invocação real usou o preflight novo, sem
  `SKILL_EVIDENCE_CODEX_BIN`, e criou
  `.skill-evidence/runs/2026-08-07T09-34-24-290Z-8dd8f487`. A calibração
  retornou 16/16 probes aprovados e JSONL completo (`thread.started`,
  `turn.started`, `item.completed`, `turn.completed`). Antes de haver comando
  de executor, Evidence v2 ou report, o processo deixou de estar ativo e o
  controle da execução não retornou um status final. O diretório contém a
  preparação do primeiro workspace, mas não `executor.command.json`.
- O CLI atual só inicia um run novo e não oferece `resume`; portanto esta
  execução parcial não é um resultado elegível, não tem ledger canônico nem
  pode satisfazer a reprodução de relatório. Nenhum `review.json`, archive ou
  operação Git foi criado.
- Pendente: registrar validações, identificação do run, consumo e conclusão
  da revisão humana.
