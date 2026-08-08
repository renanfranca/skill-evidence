# Corrigir o path audit de sink descartável e preparar `refactor-design-v3`

Este ExecPlan é vivo. Atualize `Progress`, `Decisions`, `Risks and
Mitigations` e `Lessons Learned` durante toda a execução. Ele foi escrito para
execução por `gpt-5.6-terra` com raciocínio `xhigh`, usando TDD comportamental
autônomo e silencioso.

## Purpose / Big Picture

O classificador de trajetórias tratou a redireção de stderr `2>/dev/null` como
uma escrita persistente fora do workspace. Isso tornou autoritativa uma
evidência direta falsa e contaminou os dois resultados de stress da rodada
real v2. Este plano registra a decisão humana `inconclusive`, torna `/dev/null`
o único sink absoluto descartável permitido, reproduz o comando real no fluxo
fake e prepara uma população decisória v3 nova e qualificada.

O resultado observável é que comandos com `/dev/null` passam o path audit sem
reduzir a proteção contra `/etc/...`, `/tmp/...`, `/dev/zero` ou destinos
mistos; a Evaluation passa a expor quatro casos decisórios inéditos e doze
casos apenas de desenvolvimento. O plano não executa modelos reais, não
arquiva, não comita, não envia e não publica nada.

`THEORY.md` foi consultado no commit
`572e963ea6f1207ab53c533592cb70a8239e221c`. Este plano preserva a separação
entre desenvolvimento e casos decisórios intocados, qualifica cada oráculo com
alternativas semanticamente válidas e falhas conhecidas, mantém a evidência
direta crítica acima de um judge favorável e limita conclusões às condições
declaradas. Não afirma estabilidade, robustez, causalidade ou generalização.

Safety boundary: This task is limited to authorized, defensive maintenance of
this repository. Do not provide offensive guidance or policy-bypassing
instructions.

## Scope

Em escopo:

- preservar o ExecPlan v2 concluído e as mudanças atuais no índice;
- persistir a revisão humana `inconclusive` do run v2;
- corrigir `observesOutOfScopeWrite` sem alterar sua assinatura pública;
- adicionar regressões unitária e end-to-end usando Codex fake;
- reclassificar os quatro casos v2 observados para desenvolvimento;
- materializar quatro decision cases v3 inéditos e seus oráculos mecânicos;
- gerar somente plan e preflight v3 ignorados pelo Git.

Fora de escopo:

- schemas, contratos públicos do CLI, precedência de evidência direta ou
  prompts do judge;
- executar `skill-evidence run`, chamar modelos reais, arquivar, comitar,
  enviar ou publicar;
- reinterpretar a rodada v2 como confirmação ou rejeição;
- fazer uma allowlist genérica de `/dev`.

## Definitions

- **Sink descartável permitido:** somente o token de destino absoluto exato
  `/dev/null`, com `>`, `>>`, descritor numérico ou `tee`.
- **Escrita externa proibida:** todo outro alvo absoluto fora do workspace,
  inclusive `/etc/...`, `/tmp/...`, `/dev/zero` e `/dev/null/...`.
- **Caso decisório:** caso ainda intocado por modelos reais, incluído na
  população declarada para uma decisão humana futura.
- **Caso de desenvolvimento:** fixture e regressão usados para construir ou
  testar o instrumento; não pode influenciar elegibilidade.
- **Fluxo fake elegível:** uma calibração, quatro executores e quatro judges,
  totalizando nove sessões simuladas, quatro `PASS` e nenhuma violação crítica.

## Existing Context

O HEAD inicial é `fb529357cff47c3914b952021a7fc82d353051f7` e o Codex CLI
observado é `0.147.0`. A calibração v2 qualificou 16/16 probes, mas os casos de
stress observaram o comando literal
`/bin/bash -lc "rg --files .agents .codex 2>/dev/null | sort"`; o detector em
`src/checks.ts` classificou esse sink como escrita externa. O fake atual cobre
`/etc/skill-evidence`, porém não reproduz a redireção benigna.

O run v2 preservado é
`.skill-evidence/runs/2026-08-07T18-00-19-962Z-15cbd23d`. Os quatro casos v2
já foram expostos e, pela teoria consultada, não podem continuar na população
decisória v3. O plano v2 e `docs/execplans/README.md` já têm alterações não
commitadas; elas são preservadas como parte do contexto, não descartadas ou
reescritas.

## Desired End State

`/dev/null` não gera violação do path audit, mas toda escrita externa
persistente ainda falha como crítica. Um comando que combine `/dev/null` com um
alvo proibido continua suspeito. O fake reproduz o comando que revelou o
defeito, aprova os quatro casos v3 e continua inelegível no cenário crítico.

`evaluations/refactor-design/evaluation.json` identifica `refactor-design-v3`
e declara duas amostras de uso e duas de stress: `usage-alert-presenter`,
`usage-stable-command-map`, `stress-red-serializer` e
`stress-exported-fallback`. Há doze development cases e dezesseis probes de
qualificação (quatro por caso decisório). O run v2 possui `review.json` com
decisão `inconclusive` e não possui archive. Plan e preflight v3 ignorados
passam seus seis checks, são elegíveis, prevêem quatro decision cases, no
máximo nove sessões e 3,33 créditos; nenhum run real é criado.

## Milestones

### Milestone 1 — Registrar contexto, decisão e RED do detector

#### Goal

Preservar a evidência v2 com uma decisão humana explícita e demonstrar, antes
da correção, que o contrato público do detector e o fluxo fake rejeitam
indevidamente o sink descartável.

#### Changes

- Criar este plano e indexá-lo como ativo em `docs/execplans/README.md`.
- Criar `/tmp/refactor-design-v2-inconclusive.md` com rationale de que a falsa
  evidência direta contaminou os dois casos de stress e impede confirmar ou
  rejeitar o skill.
- Executar `node dist/cli.js review --run
.skill-evidence/runs/2026-08-07T18-00-19-962Z-15cbd23d --decision
inconclusive --rationale-file /tmp/refactor-design-v2-inconclusive.md`.
- Em `test/core.test.ts`, ampliar a observação pública de
  `observesOutOfScopeWrite`: sinks `/dev/null` retornam `false`; destinos
  persistentes, caminhos-filhos e alvos mistos retornam `true`.
- Em `test/fixtures/fake-codex.mjs`, criar `benign-null-redirection`, emitindo
  o comando literal nos dois stress cases; acrescentar um teste de execução
  fake que exige quatro `PASS`, elegibilidade e zero violação direta.

#### Validation

- `npm test -- --run test/core.test.ts`
- Inspecionar `review.json`, validar seu `evidenceDigest`, a decisão e a
  ausência de archive.

#### Acceptance Criteria

Os novos testes falham pela classificação de `/dev/null` antes de código de
produção mudar. A revisão é schema-válida, corresponde ao Evidence v2 e não
cria archive.

### Milestone 2 — Tornar o sink preciso por TDD

#### Goal

Permitir somente o alvo exato `/dev/null` mantendo a detecção conservadora de
todos os demais destinos absolutos de escrita.

#### Changes

- Ajustar exclusivamente a lógica de reconhecimento de alvos em
  `src/checks.ts`; conservar a assinatura de `observesOutOfScopeWrite`.
- Continuar examinando cada alvo após `>`, `>>`, descritor numérico e `tee`;
  não parar ao encontrar um sink seguro.
- Não alterar a regra que deixa violação direta crítica autoritativa sobre um
  judge favorável.

#### Validation

- `npm test -- --run test/core.test.ts`
- Executar o fluxo fake benéfico e confirmar quatro `PASS`, nove sessões,
  elegibilidade e zero violações diretas.
- Executar `critical-direct-violation` e confirmar `FAIL` e inelegibilidade
  para `/etc/skill-evidence` mesmo com judge `PASS`.

#### Acceptance Criteria

O comando histórico deixa de falhar exclusivamente por `2>/dev/null`; os
alvos persistentes e mistos seguem detectados.

### Milestone 3 — Renovar a população decisória por TDD

#### Goal

Separar todos os casos já observados como desenvolvimento e qualificar quatro
contratos v3 inéditos antes de qualquer futura execução real.

#### Changes

- Primeiro mudar os testes de carregamento e fluxo para exigir
  `refactor-design-v3`, quatro decision cases, doze development cases e
  dezesseis probes de qualificação, observando o RED.
- Mover os quatro casos v2 para `developmentCases` e marcar seus `case.json`
  com `purpose: "development"`.
- Criar `usage-alert-presenter`: estado mutável por invocação em presenter
  assíncrono; a trajetória válida faz refatoração interna mínima, preserva API
  e testes e remove estado temporal. Criar contrato específico de arquivo
  alterável para este único caso.
- Criar `usage-stable-command-map`: implementação verde, pura e protegida por
  tipos; a trajetória válida faz checkpoint, classifica `No action` e não
  altera arquivos, usando o contrato `valid-no-action`.
- Criar `stress-red-serializer`: baseline público vermelho; a trajetória
  válida para no entry gate, não edita e relata a falha, usando
  `red-entry-gate`.
- Criar `stress-exported-fallback`: sentinel exportado e retorno público
  `string`; a trajetória válida não muda contrato, para sem mudanças e pede
  direção, usando `authority-boundary`. O cenário crítico fake atinge este
  caso.
- Para cada caso, acrescentar fixture TypeScript mínima com `node:test`,
  prompt, oracle e `examples.json` versão 1 contendo precisamente
  `known-valid`, `alternative-valid`, `known-invalid` e
  `unsupported-fluency`.
- Atualizar o fake para representar a trajetória válida dos quatro casos e o
  cenário crítico indicado. Atualizar `evaluation.json` com ID v3, população,
  claims, thresholds, exclusões e runtime inalterados.

#### Validation

- `npm test -- --run test/core.test.ts`
- `node dist/cli.js check evaluations/refactor-design`
- Executar o relatório fake duas vezes e comparar a saída canônica byte a
  byte quando os IDs/tempos forem normalizados pelo mecanismo existente.

#### Acceptance Criteria

A evaluation expõe exatamente quatro decision cases inéditos, doze
development cases e dezesseis probes qualificados. A população mantém duas
amostras de uso e duas de stress, sem ampliar os claims.

### Milestone 4 — Checkpoint verde, revisão estrutural e preflight v3

#### Goal

Validar a implementação pelo caminho público, aplicar apenas melhorias
estruturais que preservem comportamento e deixar a próxima rodada preparada,
sem consumi-la.

#### Changes

- Executar o checkpoint público e, somente depois de todas as condições do
  gate estarem verdes, revisar o escopo alterado com `$refactor-design`.
- Aplicar somente refatorações internas justificadas por risco estrutural
  concreto; reiniciar a validação inteira se código mudar.
- Reconciliar `README.md`, este plano, o plano v2 apenas para registrar sua
  revisão `inconclusive`, e o índice. Para fonte canônica deixada intacta,
  registrar a justificativa em `Documentation Impact`.
- Gerar apenas `.skill-evidence/real-pilot-v3-0.147.0-plan.json` e
  `.skill-evidence/real-pilot-v3-0.147.0-preflight.json` com os comandos
  declarados abaixo. Esses arquivos são ignorados pelo Git.

#### Validation

```bash
npm run lint
npm run typecheck
npm test
npm run prettier:check
npm run build
node dist/cli.js check evaluations/refactor-design
node dist/cli.js plan evaluations/refactor-design \
  --model gpt-5.6-luna \
  --reasoning-effort max \
  --judge-model gpt-5.6-terra \
  --judge-reasoning-effort xhigh \
  --out .skill-evidence/real-pilot-v3-0.147.0-plan.json
node dist/cli.js preflight \
  --plan .skill-evidence/real-pilot-v3-0.147.0-plan.json \
  --out .skill-evidence/real-pilot-v3-0.147.0-preflight.json
```

#### Acceptance Criteria

Lint, typecheck, testes, Prettier, build e `check` passam. O preflight tem
seis `PASS`, `eligible: true`, quatro decision cases, teto de nove sessões e
3,33 créditos. Não há chamada a `skill-evidence run`, archive, commit, push ou
publicação.

## Progress

- [x] ExecPlan criado e indexado, preservando o plano v2 e alterações atuais.
- [x] Decisão v2 `inconclusive` persistida e verificada.
- [x] RED do detector e do fluxo fake observado.
- [x] Correção GREEN concluída sem enfraquecer alvos externos.
- [x] Evaluation v3 materializada e qualificada.
- [x] Fluxo fake completo elegível.
- [x] Revisão estrutural pós-GREEN concluída.
- [x] Validação completa e plan/preflight v3 concluídos.
- [x] Documentação reconciliada e ExecPlan marcado como concluído.

## Decisions

- Decision: a rodada v2 será registrada como `inconclusive`.
  Rationale: o usuário decidiu que a falsa evidência direta em dois casos de
  stress impede confirmar ou rejeitar o skill.
  Date/Author: 2026-08-07 / usuário.
- Decision: `/dev/null` será a única exceção absoluta externa.
  Rationale: ele é um sink descartável conhecido; aceitar `/dev` em geral
  esconderia destinos persistentes ou não descartáveis.
  Date/Author: 2026-08-07 / usuário.
- Decision: os casos v2 serão exclusivamente desenvolvimento/regressão.
  Rationale: já foram expostos à rodada real, portanto não são uma amostra
  decisória intocada.
  Date/Author: 2026-08-07 / usuário.
- Decision: a v3 mantém duas amostras de uso, duas de stress e os thresholds
  existentes.
  Rationale: renovar a população não autoriza recalibrar a decisão após a
  observação.
  Date/Author: 2026-08-07 / usuário.
- Decision: a detecção percorre todos os destinos após redirecionamento e os
  operandos absolutos de `tee`, aceitando somente `/dev/null` exato.
  Rationale: parar no primeiro sink seguro faria um comando misto esconder um
  destino persistente proibido.
  Date/Author: 2026-08-08 / gpt-5.6-terra-xhigh.
- Decision: não aplicar refatoração estrutural adicional após o checkpoint
  verde.
  Rationale: a única oportunidade observada é a repetição local da extração de
  tokens de caminho entre redirecionamentos e `tee`. Extraí-la agora criaria
  uma abstração em torno de uma gramática shell deliberadamente limitada sem
  remover risco observável; os testes públicos já protegem os limites
  necessários. Classificação: No action.
  Date/Author: 2026-08-08 / gpt-5.6-terra-xhigh.
- Decision: preparar somente plan e preflight v3, sem executar `run`.
  Rationale: a autorização da rodada real v2 foi consumida; o preflight
  qualifica o estado atual, mas não substitui autorização humana explícita para
  novas sessões de modelo.
  Date/Author: 2026-08-08 / usuário.

## Risks and Mitigations

- Risk: a exceção aceitar mais que o token exato `/dev/null`.
  Mitigation: cobrir `/dev/null/child`, `/dev/zero` e destinos mistos.
- Risk: um falso negativo esconder escrita externa persistente.
  Mitigation: preservar `/etc/skill-evidence` como cenário crítico direto.
- Risk: contaminar a população v3 com casos expostos.
  Mitigation: mover os quatro v2 para desenvolvimento e validar contagens.
- Risk: o fake ser otimista demais.
  Mitigation: emitir literalmente o comando real com `2>/dev/null`.
- Risk: drift de ambiente preparar uma rodada inválida.
  Mitigation: preflight bloqueia versão, skill commit, theory commit e gates.
- Risk: mudanças já existentes se perderem.
  Mitigation: nunca resetar, descartar ou sobrescrever os arquivos do v2;
  revisar diffs antes de cada atualização documental.

## Validation Strategy

A ordem de evidência é: teste comportamental RED, suíte relevante RED,
implementação mínima GREEN, suíte relevante GREEN, checkpoint público a cada
dois ciclos, `check` da Evaluation, fluxo fake benéfico e adversarial,
validação completa e preflight. A evidência mínima contém a matriz unitária de
sinks e destinos, o fluxo fake de nove sessões/quatro `PASS` sem violações, o
fluxo crítico inelegível apesar de judge favorável, a nova população
4/12/16 e os seis checks de preflight.

Uma execução real v3 continua fora do escopo: a autorização anterior foi
consumida e qualquer `run` futuro requer decisão explícita posterior do
usuário.

Evidência até este ponto: `review` gravou `inconclusive` e seu digest confere
com o Evidence v2, sem archive. O RED unitário classificou o comando literal
com `2>/dev/null` como suspeito; o RED do fake comprovou que o cenário ainda
não emitia a trajetória histórica. O RED v3 encontrou ID/população/fixtures
antigos; o GREEN materializou quatro casos novos, 12 de desenvolvimento e 16
probes. A suíte focal passou com 35 testes. O checkpoint público completo
passou em 2026-08-08: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run prettier:check`, `npm run build` e `node dist/cli.js check
evaluations/refactor-design`. Foram então gerados os artefatos ignorados
`.skill-evidence/real-pilot-v3-0.147.0-plan.json` e
`.skill-evidence/real-pilot-v3-0.147.0-preflight.json`: seis checks `PASS`,
`eligible: true`, quatro decision cases, nove sessões máximas e 3,33 créditos.
Nenhum comando `run` foi executado.

## Documentation Impact

- `docs/execplans/2026-08-07_FIX_disposable-sink-path-audit-exec-plan.md` é o
  registro vivo, normas e evidências desta manutenção.
- `docs/execplans/README.md` é o índice canônico; marcará este plano como
  ativo e, ao final, concluído, sem remover o v2.
- `docs/execplans/2026-08-07_TEST_real-refactor-design-v2-pilot-exec-plan.md`
  recebe somente o apontamento factual à revisão `inconclusive`; sua evidência
  histórica não é reescrita.
- `README.md` foi atualizado para identificar v3, separar os 12 casos de
  desenvolvimento dos quatro decision cases inéditos e documentar que somente
  `/dev/null` exato é sink externo descartável. A autorização separada para
  `run` e os limites de evidência permanecem corretos.
- `docs/execplans/README.md` marca este plano como concluído e preserva todos
  os planos anteriores, inclusive o v2 já concluído.

## Rollout and Recovery

Não existe rollout externo. A mudança é local, controlada pelo fake e
reversível por uma mudança futura que restaure a política conservadora caso um
destino externo persistente deixe de ser detectado. Preservar o run v2 e
`review.json`; não apagar, arquivar ou criar uma segunda população decisória.
Não gerar run v3 sem autorização explícita nova.

## Lessons Learned

- A ausência de distinção entre sink descartável e destino persistente fez uma
  observação direta crítica prevalecer corretamente em uma premissa errada;
  detectores de segurança também precisam de regressões de fronteira.
- A inspeção de um único alvo não basta para `tee`: o caminho seguro e o
  caminho proibido podem coexistir na mesma invocação.
- O detector é deliberadamente um reconhecimento estreito de alvos observados,
  não um parser completo de shell; ampliar esse escopo sem um novo contrato
  aumentaria a superfície de falsos positivos e falsos negativos.
- Preflight elegível prepara uma rodada, mas não é aprovação operacional para
  consumir sessões reais; a decisão humana deve continuar separada.
