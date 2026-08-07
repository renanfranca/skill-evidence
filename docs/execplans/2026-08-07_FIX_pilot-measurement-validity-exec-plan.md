# Restaurar a validade de medição do piloto `refactor-design`

Este ExecPlan é vivo. Atualize `Progress`, `Decisions`, `Risks and
Mitigations` e `Lessons Learned` enquanto o executa.

## Purpose / Big Picture

Este plano restaura a validade do instrumento que mediu o piloto de
`refactor-design`. O resultado observável é uma Evaluation v2 qualificada,
com quatro casos decisórios inéditos, cuja execução fake produz Evidence v2
íntegra e reprodutível. O piloto histórico é preservado, mas sua decisão
humana passa a ser `inconclusive` porque dois defeitos do instrumento impedem
atribuir o resultado ao skill.

THEORY.md foi consultado no commit
`572e963ea6f1207ab53c533592cb70a8239e221c`. O plano aplica seus princípios:
contratos aceitam trajetórias semanticamente equivalentes, evidência direta
tem precedência sobre julgamento, oráculos são qualificados antes de decidir e
casos de desenvolvimento não sustentam uma conclusão confirmatória.

O executor deste plano é `gpt-5.6-terra` com raciocínio `xhigh`, usando
`$tdd-behavior-autonomous-quiet`. Nenhuma sessão real é autorizada por este
documento.

## Scope

Em escopo:

- persistir uma revisão `inconclusive` no run
  `2026-08-07T09-34-24-290Z-8dd8f487`, com a justificativa literal indicada
  abaixo;
- reconhecer e sanitizar eventos `todo_list`;
- retirar a exigência de texto incidental de `valid-no-action` sem enfraquecer
  os checks mecânicos;
- substituir a matriz decisória por quatro casos inéditos, manter os quatro
  anteriores como desenvolvimento/regressão e qualificar 16 probes;
- atualizar a Evaluation v2, documentação, planos e índice;
- validar o fluxo público exclusivamente com o fake Codex.

Fora de escopo: sessão real, consumo dos 3,33 créditos, alteração de comandos
públicos, schemas ou formato de Evidence, archive, commit, push e publicação.
Não apagar, reexecutar ou arquivar o run histórico.

## Definitions

- **Caso decisório**: caso ainda não enviado ao modelo e que informa uma futura
  decisão humana.
- **Caso de desenvolvimento**: caso preservado para regressão, que não informa
  a futura decisão.
- **Observabilidade completa**: toda linha JSONL possui tipo e item conhecido;
  futuros tipos desconhecidos tornam o caso `INCONCLUSIVE`.
- **Efeito direto**: fato verificável pelo runner, como diff, teste, escopo de
  escrita e fingerprint. Ele vence um parecer favorável do juiz.
- **Qualificação**: cada caso passa nos quatro probes cegos
  `known-valid/PASS`, `known-invalid/FAIL`, `alternative-valid/PASS` e
  `unsupported-fluency/INCONCLUSIVE`.

## Existing Context

Antes deste plano, a avaliação era `refactor-design-v1`. Seus quatro casos
decisórios já foram usados no piloto, e quatro outros casos já eram
desenvolvimento. O run histórico contém calibração 16/16, quatro casos, oito
sessões, 2,96 créditos e dados suficientes para reproduzir seu relatório. A
CLI 0.147.0 emitiu `todo_list`, que `src/events.ts` ainda considerava
desconhecido. O contrato `valid-no-action` também exigia a expressão literal
`no action`, embora uma conclusão semanticamente equivalente seja válida.

## Desired End State

`evaluation.json` identifica `refactor-design-v2`, aponta para o commit
teórico consultado e contém quatro decision cases novos e oito development
cases históricos. Os novos casos são dois de uso e dois de stress, com 16
probes no total. O fake Codex emite `todo_list` em uma execução verde e aceita
`No refactor was justified` como alternativa válida. Um run fake elegível
contém quatro casos `PASS`, nove sessões, 3,33 créditos, nenhum raciocínio
bruto e um `report.md` reproduzível byte a byte.

O run histórico recebe exatamente esta decisão e justificativa:

> Classifico este run como inconclusive porque o Codex CLI 0.147.0 emitiu um evento `todo_list` ainda não reconhecido pelo normalizador e o contrato `valid-no-action` rejeitou respostas semanticamente equivalentes por não conterem a expressão literal `no action`. Esses defeitos do instrumento impedem atribuir o resultado observado ao skill `refactor-design`.

`review.json` referencia o digest da Evidence v2. O plano do piloto passa a
registrar o resultado real e ambos os planos aparecem como `completed` no
índice, sem arquivar o run.

## Milestones

### Milestone 1 - Fechar a evidência histórica

#### Goal

Encerrar a revisão humana do run inválido sem atribuir o resultado ao skill.

#### Changes

- Criar, pelo comando público `review`, o arquivo ignorado
  `.skill-evidence/runs/2026-08-07T09-34-24-290Z-8dd8f487/review.json`.
- Atualizar `docs/execplans/2026-08-07_TEST_real-refactor-design-pilot-exec-plan.md`
  com os fatos observados, a reprodução e a limitação de medição.

#### Validation

- `node dist/cli.js render --evidence <run>/evidence.json > /tmp/report.md`
  e `cmp -s /tmp/report.md <run>/report.md`.
- Comparar `review.json.evidenceDigest` com `canonicalDigest(evidence.json)`.

#### Acceptance Criteria

A revisão é `inconclusive`, traz a justificativa literal, referencia Evidence
v2 e não cria archive.

### Milestone 2 - Tornar a trajetória observável

#### Goal

Permitir que uma trajetória válida da CLI 0.147.0 chegue ao juiz sem reter
conteúdo de planejamento privado.

#### Changes

- Em `test/core.test.ts`, especificar a normalização observável de um
  `todo_list` com status e conteúdo sensível.
- Em `src/events.ts`, reconhecer somente o novo tipo conhecido; a projeção
  existente continuará a descartar os campos não permitidos.
- Em `test/fixtures/fake-codex.mjs`, emitir um `todo_list` no caminho verde.

#### Validation

- `npm test`
- `npm run build && node dist/cli.js check evaluations/refactor-design`

#### Acceptance Criteria

`todo_list` deixa a observabilidade completa, aparece somente com sequência,
tipo, `itemType` e status, e um tipo futuro continua bloqueando o juiz.

### Milestone 3 - Medir conclusão sem frase incidental

#### Goal

Deixar o juiz calibrado decidir a equivalência semântica sem relaxar fatos
diretos que protegem contra uma mudança indevida.

#### Changes

- Em `test/core.test.ts`, cobrir o fluxo fake em que a mensagem é `No refactor
was justified`.
- Em `evaluations/refactor-design/contracts/valid-no-action.json`, remover
  apenas `message-match: "no action"`.
- Em `test/fixtures/fake-codex.mjs`, adicionar o cenário da mensagem
  alternativa.

#### Validation

- `npm test`

#### Acceptance Criteria

A mensagem alternativa chega a um juiz `PASS` sem violação direta; uma escrita
fora de escopo ou outra violação crítica ainda vence esse parecer.

### Milestone 4 - Renovar os casos decisórios

#### Goal

Isolar a próxima decisão humana de exemplos já vistos pelo piloto, mantendo-os
somente como regressão.

#### Changes

- Em `evaluations/refactor-design/evaluation.json`, promover para v2,
  registrar o commit teórico e trocar as populações decisória e de
  desenvolvimento.
- Em quatro `case.json` históricos, alterar `purpose` para `development`.
- Criar `contracts/job-presenter.json` e, para cada novo caso, `case.json`,
  fixture, `prompt.md`, `oracle.md` privado e `examples.json` com quatro
  probes:
  - `usage-job-presenter`: eliminar estado mutável oculto de presenter
    assíncrono, sem mudar API nem testes;
  - `usage-stable-route-parser`: reconhecer pipeline puro com união
    discriminada e não inventar refatoração;
  - `stress-exported-sentinel`: não mudar retorno exportado/sentinel sem
    autoridade e deixar os arquivos intactos;
  - `stress-immutable-balance`: aceitar semanticamente a conclusão de que uma
    operação pura sobre valor readonly não requer refatoração.
- Em `test/fixtures/fake-codex.mjs`, selecionar o comportamento correto para
  cada novo ID.

#### Validation

- `npm test`
- `node dist/cli.js check evaluations/refactor-design`

#### Acceptance Criteria

O carregamento público vê exatamente quatro decision cases novos, oito casos
de desenvolvimento, duas distribuições de uso, duas de stress e 16 probes
qualificáveis.

### Milestone 5 - Confirmar o caminho público e reconciliar documentos

#### Goal

Demonstrar o fluxo fake completo e documentar somente o que a Evaluation v2
realmente mede.

#### Changes

- Atualizar `README.md`, o plano do piloto, este plano e
  `docs/execplans/README.md`.
- Gerar somente os artefatos ignorados v2 de plan/preflight, sem comando
  `run` real.

#### Validation

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run prettier:check`,
  `npm run build` e `node dist/cli.js check evaluations/refactor-design`.
- Gerar plan e preflight temporários com
  `SKILL_EVIDENCE_CODEX_BIN="$PWD/test/fixtures/fake-codex.mjs"`; executar
  o CLI fake com `--approve-sessions 9 --max-credits 3.33`.
- Confirmar `codex-cli 0.147.0`; sem fake, gerar somente
  `.skill-evidence/real-pilot-v2-0.147.0-plan.json` e
  `.skill-evidence/real-pilot-v2-0.147.0-preflight.json`, exigindo
  `eligible: true` e seis checks `PASS`.

#### Acceptance Criteria

Evidence fake é elegível com quatro `PASS`, nove sessões, 3,33 créditos,
nenhum raciocínio bruto e `report.md` reproduzível byte a byte. README separa
os oito casos históricos dos quatro inéditos, e ambos os planos ficam
`completed` no índice.

Após o checkpoint verde, executar `$refactor-design` como revisão estrutural
sem mudança de comportamento. Caso ele recomende alteração, criar um novo
ExecPlan antes de implementá-la.

## Progress

- [x] Criado o ExecPlan ativo e registrado o THEORY no commit indicado.
- [x] Fechada a revisão do run histórico.
- [x] `todo_list` normalizado e coberto por regressão comportamental.
- [x] Equivalência semântica liberada sem enfraquecer efeitos diretos.
- [x] Matriz v2 materializada e qualificada.
- [x] Checkpoint público fake concluído.
- [x] Artefatos reais de plan/preflight preparados sem executar modelo.
- [x] Documentação, índice e este plano concluídos.

## Decisions

- Decision: reclassificar como desenvolvimento os quatro casos que já foram
  usados no piloto.
  Rationale: evidência de desenvolvimento não pode ser apresentada como caso
  decisório inédito.
  Date/Author: 2026-08-07 / usuário.
- Decision: persistir `inconclusive`, não `reject`, no run histórico.
  Rationale: o resultado mede um instrumento incompleto e um contrato
  incidental, não uma falha atribuível ao skill.
  Date/Author: 2026-08-07 / usuário.
- Decision: reconhecer `todo_list` por sua identidade de evento, sem expor
  campos da lista.
  Rationale: a CLI 0.147.0 o emite em trajetórias válidas, mas seu conteúdo
  não é evidência necessária para avaliar o contrato.
  Date/Author: 2026-08-07 / gpt-5.6-terra.
- Decision: manter `message` como evidência do pacote do juiz e removê-la dos
  efeitos mecânicos de `valid-no-action`.
  Rationale: equivalência de uma conclusão é semântica; diffs, comandos,
  fingerprint e escrita continuam diretamente verificáveis.
  Date/Author: 2026-08-07 / gpt-5.6-terra.
- Decision: não aplicar refatoração adicional após a revisão estrutural.
  Rationale: os comportamentos novos estão protegidos pelo fluxo fake público;
  o normalizador é uma tabela declarativa, e extrair mapeamentos do fake ou
  compactar os casos acrescentaria topologia sem reduzir um risco concreto.
  Date/Author: 2026-08-07 / gpt-5.6-terra.

## Risks and Mitigations

- Risk: admitir `todo_list` retenha conteúdo não sanitizado.
  Mitigation: teste verifica somente metadados permitidos e procura ausência
  do conteúdo bruto.
- Risk: remover a frase literal enfraqueça segurança.
  Mitigation: manter e testar todos os checks mecânicos; o juiz só classifica
  semanticamente a mensagem preservada.
- Risk: um caso novo revele sua conclusão no prompt ou oracle.
  Mitigation: prompts neutros e exemplos privados de qualificação cega.
- Risk: uma sessão real seja iniciada acidentalmente.
  Mitigation: usar fake apenas no run; os comandos sem fake são limitados a
  `plan` e `preflight`.

## Validation Strategy

Executar nesta ordem: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run prettier:check`, `npm run build`,
`node dist/cli.js check evaluations/refactor-design`, fluxo fake de nove
sessões, auditoria de Evidence/render, `codex --version`, plan/preflight sem
fake, `git diff --check` e `git status --short`. Uma falha de observabilidade,
qualificação, preflight ou reprodução bloqueia a conclusão.

Validação executada em 2026-08-07: `lint`, `typecheck`, 34 testes Vitest,
Prettier, build e `check` passaram. O fluxo público fake confirmou quatro
`PASS`, nove sessões, 3,33 créditos, `todo_list` sanitizado e reprodução binária
do relatório. `codex --version` retornou `codex-cli 0.147.0`; o preflight v2
sem fake é elegível e contém seis checks `PASS`.

## Documentation Impact

`README.md` identifica Evaluation v2 e separa oito casos históricos dos quatro
casos ainda não submetidos. O plano do piloto preserva o registro do run e sua
decisão inconclusiva. `docs/execplans/README.md`, a fonte canônica de status,
marca ambos os planos como concluídos. Nenhuma documentação gerada foi editada.

## Rollout and Recovery

Não há rollout, commit ou publicação. O run histórico fica preservado. Se a
validação falhar, manter artefatos locais para diagnóstico, não fazer sessão
real e registrar o bloqueio neste plano. Uma futura rodada real exige
autorização explícita e um novo ExecPlan `TEST`; os plan/preflight futuros só
podem ser usados se seus fingerprints continuarem válidos.

## Lessons Learned

- A validade de uma conclusão depende da validade do instrumento: um evento
  não observado e uma equivalência semântica rejeitada impedem atribuição ao
  skill, ainda que a calibração pareça favorável.
- Os fixtures usam o suporte TypeScript "strip-only" do Node 24; parameter
  properties não são aceitas nele, portanto o campo do presenter precisa ser
  declarado e inicializado explicitamente para que a pré-condição pública fique
  verde.
- A revisão `refactor-design` pós-GREEN classificou a tabela de eventos, a
  seleção explícita do fake e a matriz declarativa como `No action`; não houve
  risco estrutural demonstrado nem mudança de comportamento.
- A execução pública fake final foi elegível com quatro `PASS`, nove sessões e
  3,33 créditos; a preparação real v2 gerou somente plan/preflight elegíveis,
  sem iniciar executor, juiz ou sessão de modelo.
