# Retrospectiva do skill-evidence

> **Status:** projeto arquivado pelo owner em 2026-08-15. Este documento consolida aprendizado histórico. Ele não reabre o projeto, não autoriza campanhas e não transforma resultados de desenvolvimento em qualificação de modelo.

## Resumo executivo

O projeto produziu conhecimento técnico real: distinguiu evidência direta de julgamento semântico, separou operabilidade de qualidade, preservou campanhas irrepetíveis e registrou resultados negativos sem convertê-los artificialmente em sucesso. O encerramento não apaga esse valor.

O projeto, porém, não se mostrou viável como produto ou fluxo de trabalho. A causa principal não foi um único bug ou um único modelo. O mecanismo criado para provar que o avaliador era confiável cresceu mais rápido do que a capacidade de avaliar skills. Autoria automática, schemas, fingerprints, reservas, receipts, lifecycle, revisão cega, resolução, supervisão da entrega e revisão da própria supervisão formaram um ciclo em que cada garantia criava outra superfície a garantir.

O erro estratégico foi aplicar cedo demais rigor de evidência decisória a uma infraestrutura cujo valor mínimo ainda não havia sido demonstrado. O resultado foi uma base tecnicamente cuidadosa, mas cara para operar, difícil de compreender e desproporcional ao problema inicial.

Para um futuro processo enxuto, a preferência do owner é clara:

- especificação e oracle escritos manualmente;
- checks determinísticos antes de qualquer julgamento por modelo;
- `gpt-5.6-luna` com esforço `max` como executor model-backed inicial;
- `gpt-5.6-terra` com esforço `xhigh` apenas como escalonamento ou contraste controlado;
- uma chamada no primeiro canário, zero retry e orçamento de conta explícito;
- nenhum Author automático, supervisor recursivo ou painel de revisores antes de o fluxo simples provar valor.

Essa preferência não é uma qualificação. O arquivo não contém evidência de que Luna/max seja o melhor modelo geral, nem de que Terra/xhigh seja confiável como Author ou juiz. Ele contém evidência suficiente para escolher uma ordem econômica de tentativa e impor limites mais fortes.

## Escala alcançada

No commit de arquivamento `caebb8fa998573e695206805841d4997961dd28b`, o repositório registrava:

| Indicador                                                       |                   Valor | Limite da leitura                                                                                    |
| --------------------------------------------------------------- | ----------------------: | ---------------------------------------------------------------------------------------------------- |
| Período do histórico Git                                        | 2026-08-06 a 2026-08-15 | Nove dias com commits; não mede horas trabalhadas                                                    |
| Commits                                                         |                     118 | Inclui merges, documentação e correções                                                              |
| ExecPlans numerados                                             |                      25 | O índice também contém um registro histórico não numerado                                            |
| Arquivos diferentes do primeiro commit                          |                     264 | Inclui código, schemas, fixtures, relatórios e documentação                                          |
| Linhas líquidas adicionadas desde o primeiro commit             |                  75.293 | Mede tamanho do artefato, não produtividade ou qualidade                                             |
| Testes no último gate completo antes do arquivo                 |      251 em 19 arquivos | O commit final documental não repete a matriz                                                        |
| Invocações model-backed comprováveis nos relatórios versionados |                      24 | Não inclui sessões de desenvolvimento, revisores sem telemetria ou chamadas sem relatório preservado |

Esses números não são um argumento contra testes, documentação ou segurança. Eles mostram que o custo estrutural cresceu antes de existir uma resposta positiva para a pergunta central: “este mecanismo torna a avaliação de uma skill materialmente melhor e economicamente sustentável?”.

## Trajetória e resultados

| Fase             | O que tentou responder                                                                   | Resultado preservado                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation E0–E3 | Promptfoo, Codex SDK, tracing, persistência e regressões podiam sustentar o instrumento? | Integrações locais e limites de observabilidade foram caracterizados; model identity efetiva continuou indisponível.                                                             |
| E4               | Um Evaluation Author poderia gerar um Blueprint útil?                                    | Duas chamadas Terra/xhigh terminaram em erro de provider; a terceira produziu um `BLOCKED` útil para planejar E5, sem qualificar confiabilidade.                                 |
| E5               | Terra/xhigh ou Luna/max sustentavam um Author automático em oito casos cegos?            | Luna não completou nenhum dos oito casos no limite de cinco minutos. Terra completou os oito, mas falhou um gate crítico. Campanha `INSUFFICIENT`, sem condição selecionada.     |
| E18              | O problema de Luna era apenas o limite de cinco minutos?                                 | Uma chamada Luna/max também não concluiu em 600 segundos. Qualidade semântica permaneceu não observada.                                                                          |
| E19              | Luna/max era viável com teto final de 30 minutos?                                        | Concluiu em 569.958 ms, mas produziu lifecycle `DRAFT` por evidência direta obrigatória ausente. Resultado `NOT_VIABLE_FOR_AUTHOR`.                                              |
| E20              | Terra/xhigh reproduziria a falha de Luna no mesmo pacote?                                | Concluiu em 136.475 ms e não reproduziu a falha lexical; marcou blockers conhecidos como não bloqueantes e produziu `READY`. Resultado `TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT`. |
| E21              | O protocolo poderia retirar do modelo o controle sobre fatos e lifecycle críticos?       | Protocolo v3 foi endurecido e qualificado mecanicamente apenas com processos locais.                                                                                             |
| E22              | Terra/xhigh produziria um Blueprint v3 utilizável em uma chamada?                        | Instrumento foi preparado, mas o projeto foi arquivado antes da chamada. E22 permanece não consumido e sem resultado model-backed.                                               |

Fontes principais: [relatório E5](experiments/e5-author-benchmark-20260811-r1.json), [relatório E18](experiments/e18-luna-max-locale-catalog-20260812-r1.json), [relatório E19](experiments/e19-luna-max-locale-catalog-20260813-r1.json), [relatório E20](experiments/e20-terra-xhigh-locale-catalog-20260813-r1.json) e [ExecPlan E22 arquivado](execplans/2026-08-14-gate-terra-xhigh-author-protocol-v3-canary.md).

## Custos

### Invocações comprováveis

Os artefatos versionados permitem contar diretamente 24 invocações:

| Campanha            | Condição    | Invocações | Resultado resumido                                          |
| ------------------- | ----------- | ---------: | ----------------------------------------------------------- |
| Foundation E1 R2/R3 | Luna/max    |          2 | Dois smokes concluídos                                      |
| E4 R1–R3            | Terra/xhigh |          3 | Dois erros de provider; um Blueprint útil para planejamento |
| E5                  | Luna/max    |          8 | Oito timeouts                                               |
| E5                  | Terra/xhigh |          8 | Oito Blueprints; condição não qualificada                   |
| E18                 | Luna/max    |          1 | Timeout em 600.649 ms                                       |
| E19                 | Luna/max    |          1 | Conclusão mecanicamente não viável                          |
| E20                 | Terra/xhigh |          1 | Conclusão com lifecycle inadequado                          |
| E22                 | Terra/xhigh |          0 | Arquivado antes da reserva                                  |

Esse total não captura os custos de sessões de implementação, criação de instrumentos, revisores independentes, resolução, supervisores, consolidadores ou repetição de contexto. Esses trabalhos consumiram capacidade da conta, mas o repositório não possui telemetria que permita contá-los com honestidade.

### Estimativa API-equivalent incompleta

As preparações congelaram os preços oficiais então vigentes e ainda confirmados em 2026-08-15:

| Modelo | Input / MTok | Cached input / MTok | Output / MTok |
| ------ | -----------: | ------------------: | ------------: |
| Luna   |     US$ 0,20 |            US$ 0,02 |      US$ 1,20 |
| Terra  |     US$ 2,00 |            US$ 0,20 |     US$ 12,00 |

Fontes: [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) e [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

Aplicando esses preços somente aos relatórios que preservaram tokens, com cached input tratado como subconjunto do input e reasoning já contido no output informado, obtém-se:

| Evidência com usage         | Estimativa API-equivalent |
| --------------------------- | ------------------------: |
| Foundation Luna R2/R3       |              US$ 0,003802 |
| Oito conclusões Terra no E5 |              US$ 1,047971 |
| Luna no E19                 |              US$ 0,040822 |
| Terra no E20                |              US$ 0,107802 |
| **Subtotal conhecido**      |          **US$ 1,200397** |

Esse subtotal é uma estimativa analítica incompleta, não uma conta. Ele exclui timeouts sem usage, erros, E4 R3 sem usage preservado, chamadas de revisão e toda a execução feita através da conta ChatGPT. O próprio contrato do projeto registra o custo real da conta como `UNKNOWN`.

O sinal operacional mais relevante veio do owner: para sustentar o trabalho, houve migração do ChatGPT Plus para o Pro e, em uma única noite no encerramento do projeto, o indicador de uso caiu de 100% para 62%. Isso representa 38 pontos percentuais do limite exibido, mas não pode ser convertido em dólares porque o denominador, a janela e a fórmula de consumo não são expostos nos artefatos. Ainda assim, é evidência suficiente de que o processo era insustentável para o owner.

### Tempo e custo humano

No E5, as oito chamadas Luna consumiram aproximadamente 39,4 minutos até timeout; as oito chamadas Terra consumiram aproximadamente 22,3 minutos. E18–E20 acrescentaram aproximadamente 21,8 minutos. São pelo menos 83,5 minutos de espera model-backed apenas nessas campanhas, sem contar E4, Foundation, preparação, CI ou revisão.

O custo dominante, contudo, não foi o tempo de provider. Foi o trabalho de construir e verificar o instrumento:

- cada nova proteção alterava identidades e podia invalidar revisão anterior;
- correções pequenas retornavam a matrizes extensas de validação;
- a supervisão da entrega passou a precisar de receipts, rounds, revisão da revisão e regras para impedir revisão infinita;
- grandes quantidades de contexto precisavam ser relidas por agentes novos para preservar independência;
- o orçamento era expresso principalmente em chamadas de campanha, não no consumo total da conta e do processo.

## O que funcionou

### Resultados negativos permaneceram negativos

O projeto não promoveu um timeout a falha semântica, não tratou um Blueprint estruturalmente válido como qualificação e não declarou vencedor quando os gates não permitiam. E5 terminou sem condição selecionada; E19 e E20 preservaram falhas diferentes; E22 terminou sem chamada.

### Operabilidade, qualidade e decisão foram separadas

Terra completar não significou Terra passar. Luna não completar não permitiu inferir que seu Blueprint seria semanticamente ruim. Um `BLOCKED` honesto podia ser autoria completa, enquanto `READY` podia ser falha quando faltava autoridade decisória.

### Evidência direta teve precedência

Checks de schema, lifecycle, proveniência, efeitos proibidos e presença de evidência foram tratados mecanicamente antes de revisão semântica. Essa ordem reduz custo e impede que fluência compense uma violação objetiva.

### Campanhas foram limitadas e irrepetíveis

Reservas atômicas, zero retry e receipts terminais evitaram que um resultado desfavorável fosse reexecutado até passar. Isso preservou a honestidade experimental, embora tenha acrescentado complexidade excessiva para o estágio do produto.

### Instrumentos locais evitaram gasto desnecessário

Os qualifiers determinísticos encontraram muitos defeitos de routing, persistência e composição sem acessar provider. A lição não é abandonar testes locais; é limitar o sistema testado ao menor mecanismo que responde à pergunta do produto.

## O que tornou o projeto inviável

| Problema                                  | Como apareceu                                                                                                            | Regra futura                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Framework antes do valor mínimo           | O pipeline completo foi construído antes de três avaliações simples demonstrarem utilidade recorrente.                   | Fazer avaliações manuais primeiro; automatizar somente repetição observada.                            |
| Author automático prematuro               | Grande parte do projeto passou a avaliar um modelo que escrevia o plano de avaliação, em vez da skill.                   | O MVP usa contrato, fixtures e oracle escritos manualmente.                                            |
| Governança recursiva                      | O supervisor precisou de identidades, receipts, rounds e revisão de sua própria revisão.                                 | Nenhum mecanismo de supervisão pode exigir supervisão model-backed de si próprio.                      |
| Hardening desproporcional                 | Symlink races, atomicidade multifile, commit freeze e recuperação parcial foram resolvidos antes da viabilidade central. | Segurança deve ser proporcional ao risco e ao estágio; decisão-grade vem depois do valor.              |
| Revisão excessiva                         | Dois revisores e um consolidator foram repetidos após mudanças materiais, inclusive durante remediação.                  | Desenvolvimento usa checks locais; revisão independente ocorre uma vez, somente antes de decisão real. |
| Testes sem estratificação econômica       | Matrizes completas eram repetidas após mudanças pequenas e documentais.                                                  | Rodar testes focados durante desenvolvimento e a matriz completa uma vez antes de publicar.            |
| Documentação autorreferente               | Atualizar estado operacional alterava identidades ou exigia exceções para não revisar infinitamente.                     | Um documento curto e canônico descreve o estado atual; planos encerrados ficam históricos.             |
| Orçamento incompleto                      | O limite de chamadas não capturava reviewers, tokens sem usage, tempo de agentes nem consumo ChatGPT.                    | Toda fase precisa de teto de chamadas, tempo, consumo de conta e fan-out de agentes.                   |
| Mais esforço tratado como proteção        | `max`, `xhigh` e múltiplos agentes aumentaram custo sem garantir semântica correta.                                      | Comparar configurações em casos representativos e usar o menor esforço que preserve os critérios.      |
| GREEN confundido com progresso do produto | Centenas de testes provaram o mecanismo, enquanto a seleção automática continuava indefensável.                          | Cada incremento precisa alterar uma decisão do usuário ou reduzir custo observável.                    |

## Análise de Luna/max

### O que a documentação sustenta

A documentação oficial descreve GPT-5.6 Luna como otimizado para workloads de alto volume e sensíveis a custo. Ele suporta esforço `max`, mas a orientação da família GPT-5.6 recomenda testar o esforço atual e um nível inferior em trabalho representativo. `max` deve ser reservado para tarefas difíceis que demonstrem ganho, não adotado como sinônimo de qualidade. Fontes: [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) e [Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model).

### O que o projeto observou

- No E5, Luna/max não entregou nenhum Blueprint nos oito limites de cinco minutos. Isso prova uma falha operacional da condição exata, não uma falha semântica.
- No E18, a mesma condição também não completou em dez minutos.
- No E19, Luna/max completou o pacote em 569.958 ms, com 16.928 input tokens, 31.197 output tokens e 22.487 reasoning-output tokens.
- O Blueprint E19 registrou um blocker real, mas omitiu evidência `DIRECT` obrigatória. O sistema derivou `DRAFT`, então a condição foi `NOT_VIABLE_FOR_AUTHOR`.
- Nenhum desses experimentos avaliou Luna/max como executor ordinário de uma skill pequena; eles avaliaram principalmente o papel mais amplo e custoso de Author.

### Conclusão sobre Luna/max

Luna/max é o **executor padrão desejado** pelo owner para um futuro processo enxuto. A escolha é uma preferência econômica fundamentada na tarifa e no posicionamento de alto volume, não uma qualificação produzida por este projeto.

Essa escolha vale somente para executar a skill nos primeiros casos model-backed. Ela não transforma Luna em Author, juiz, resolver ou modelo universal. O primeiro canário deve confirmar que a condição conclui dentro do limite e preserva os contratos; se não confirmar, o processo para sem retry.

## Análise de Terra/xhigh

### O que a documentação sustenta

A documentação oficial descreve GPT-5.6 Terra como um modelo que equilibra inteligência e custo. Suas tarifas de texto são dez vezes as tarifas de Luna em input, cached input e output. `xhigh` é suportado, mas, assim como `max`, deve ser usado quando avaliações representativas mostrarem ganho mensurável. Fontes: [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra) e [Using GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model).

### O que o projeto observou

- E4 R3 mostrou que uma chamada Terra/xhigh podia produzir um Blueprint útil para planejar E5. Uma amostra adaptável não estabeleceu confiabilidade.
- No E5, Terra completou os oito casos entre 119.555 e 262.743 ms, com média de aproximadamente 167.190 ms.
- Apesar da operabilidade, Terra correspondeu ao lifecycle de apenas 3/8 referências. Houve uma violação crítica, e o resultado foi `NOT_QUALIFIED`.
- No E20, Terra recebeu exatamente o pacote model-facing de E19. Concluiu em 136.475 ms, reconheceu quatro incertezas reais, mas marcou todas como não bloqueantes e produziu `READY`.
- Esse resultado não reproduziu a falha lexical de Luna; revelou outra falha: under-blocking de contexto decisório ausente.
- E22 pretendia observar Terra/xhigh sob protocolo v3, no qual blockers seriam compostos pelo sistema. Como E22 nunca foi executado, não existe evidência de que Terra passe sob esse protocolo.

### Contraste controlado E19/E20

| Indicador                 |            Luna/max E19 |                          Terra/xhigh E20 | Leitura permitida                                                       |
| ------------------------- | ----------------------: | ---------------------------------------: | ----------------------------------------------------------------------- |
| Tempo                     |              569.958 ms |                               136.475 ms | Luna foi 4,18× mais lento nesse pacote                                  |
| Input tokens              |                  16.928 |                                   18.981 | Volumes de entrada próximos                                             |
| Output tokens             |                  31.197 |                                    5.820 | Luna produziu 5,36× mais output                                         |
| Reasoning-output tokens   |                  22.487 |                                    1.382 | Luna registrou 16,27× mais reasoning output                             |
| Estimativa API-equivalent |            US$ 0,040822 |                             US$ 0,107802 | Terra custou aproximadamente 2,64× mais, apesar de concluir mais rápido |
| Lifecycle                 |                 `DRAFT` |                                  `READY` | Ambos inadequados por razões diferentes                                 |
| Resultado                 | `NOT_VIABLE_FOR_AUTHOR` | `TERRA_DOES_NOT_PASS_CURRENT_INSTRUMENT` | Nenhum modelo passou                                                    |

O contraste mostra que maior preço, menor latência e menor output não garantem decisão correta. Também mostra que menor tarifa não garante melhor custo total quando uma condição usa mais tokens ou falha repetidamente. Escolha de modelo precisa combinar sucesso, tempo, tokens e custo; qualquer comparação que omita um desses eixos é incompleta.

### Conclusão sobre Terra/xhigh

Terra/xhigh é o **perfil de escalonamento e contraste controlado**, não o executor padrão de alto volume. Ele demonstrou operabilidade superior nos casos do Author, mas não confiabilidade semântica suficiente.

Uma futura avaliação só deve escalonar de Luna para Terra quando:

1. Luna falhar em um caso representativo sem que o oracle ou o contrato estejam ambíguos;
2. o mesmo pacote puder ser preservado para isolar a condição do modelo;
3. o contraste responder a uma hipótese que altere a decisão do owner;
4. uma única chamada Terra tiver orçamento separado e explicitamente aprovado.

Terra não deve ser promovido automaticamente a juiz. Este arquivo não qualificou nenhum modelo para julgamento semântico geral.

## Papéis recomendados

| Papel                      | Default futuro                            | Motivo                                                                                   |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Especificação da avaliação | Humano + template simples                 | Remove o Author automático do caminho crítico                                            |
| Oracle mecânico            | Código determinístico                     | Mais barato, auditável e reprodutível                                                    |
| Executor da skill          | Luna/max                                  | Preferência econômica do owner, sujeita a um canário de uma chamada                      |
| Escalonamento do executor  | Terra/xhigh                               | Contraste pontual quando a maior tarifa puder responder a uma hipótese decisiva          |
| Julgamento semântico       | Nenhum modelo default                     | Usar somente no resíduo que checks diretos não resolvem; precisa de qualificação própria |
| Revisão independente       | Humano ou contexto realmente independente | Somente antes de uma decisão material, nunca em todo ciclo de desenvolvimento            |

## Playbook enxuto para uma futura avaliação

O projeto não deve ser retomado como está. Se o aprendizado for reutilizado em outro trabalho, o fluxo recomendado é:

### 1. Definir a decisão antes do instrumento

Escrever em uma página:

- qual decisão a avaliação pode mudar;
- população e exclusões;
- três a cinco contratos observáveis;
- falhas críticas;
- evidência mínima;
- teto de chamadas, tempo, consumo de conta e agentes;
- regra de parada.

Se a decisão não puder ser escrita de forma simples, não construir infraestrutura.

### 2. Criar o menor instrumento manual

- Um caso positivo representativo.
- Um caso inválido ou de segurança.
- Um caso near-boundary.
- Oracle determinístico para tudo que puder ser comparado diretamente.
- Rubrica semântica apenas para o que não puder ser observado mecanicamente.

Não criar schema versionado, Author automático, fingerprints compostos ou sistema de review enquanto esses três casos ainda mudarem frequentemente.

### 3. Fazer um canário Luna/max

- Uma chamada.
- Zero retry.
- Timeout prespecificado, nunca superior a 600 segundos no primeiro canário e menor quando a tarefa permitir.
- Sem subagentes ou revisores.
- Medir conclusão, contratos, tempo, input, cached input, output, reasoning output e mudança observada no indicador da conta.

Falha de instrumento encerra a fase e volta para correção offline. Falha do modelo encerra a condição; não autoriza repetir o mesmo canário.

### 4. Expandir somente após o canário passar

Executar no máximo três chamadas Luna/max totais, incluindo o canário, cobrindo os três casos. Não adicionar repetições para criar aparência de estabilidade. Se os três resultados forem úteis e o processo ainda for economicamente aceitável, planejar separadamente qualquer evidência de estabilidade.

### 5. Escalonar para Terra somente por hipótese

Usar uma chamada Terra/xhigh, no mesmo pacote congelado, apenas quando o contraste puder distinguir uma limitação de Luna de uma limitação do instrumento. O resultado não promove Terra automaticamente; ele responde somente à hipótese prespecificada.

### 6. Adicionar julgamento apenas no resíduo

Aplicar checks determinísticos primeiro. Se o candidato falhar mecanicamente, não gerar trabalho para juiz. Se restar uma decisão semântica real, usar um único julgamento independente. Dois revisores e resolução só se justificam quando uma decisão de consequência material depende de uma divergência observada.

### 7. Parar pelo custo total, não pela contagem de provider

Antes e depois de cada fase, registrar:

- chamadas por papel;
- tokens e tempo quando disponíveis;
- estimativa API-equivalent;
- indicador de uso da conta ChatGPT;
- quantidade de agentes/revisores;
- horas humanas aproximadas;
- decisão que a fase mudou.

Se o consumo real não puder ser observado, o orçamento deve ser menor, não maior. Se uma fase não alterar uma decisão nem reduzir custo observável, ela termina.

## Regras estruturais para evitar outra explosão

1. **Um plano ativo:** não abrir uma cadeia de ExecPlans para corrigir cada consequência do instrumento.
2. **Uma fonte canônica curta:** estado operacional não deve ser duplicado em README, AGENTS, ADR, plano e receipts.
3. **Sem framework antes de três usos manuais:** repetir manualmente revela a abstração real.
4. **Sem Author no MVP:** avaliação gerada por modelo só volta à pauta depois que avaliações manuais forem úteis e frequentes.
5. **Sem supervisor recursivo:** o processo de revisão não pode exigir revisão model-backed de suas próprias atualizações.
6. **Validação proporcional:** testes focados durante desenvolvimento; matriz completa uma vez antes de uma publicação material.
7. **Freeze somente para decisão irreversível:** commits e fingerprints exatos não pertencem ao uso cotidiano.
8. **Segurança proporcional ao estágio:** proteger credenciais e efeitos externos desde o início; adiar hardening contra adversário local até existir valor e ameaça concreta.
9. **Modelo não compensa contrato incompleto:** mais esforço, mais agentes ou modelo mais caro não resolvem decisão ambígua.
10. **Resultado negativo encerra a fase:** não transformar `INSUFFICIENT` ou `NOT_VIABLE` em backlog ilimitado de remediação.

## Conclusão

O skill-evidence não fracassou por ter registrado resultados negativos. Sua maior contribuição foi demonstrar que uma avaliação pode ser cientificamente cuidadosa e ainda assim ser economicamente e operacionalmente inviável.

O aprendizado reutilizável não é o pipeline inteiro. É uma sequência menor:

> decisão explícita → fixture manual → oracle direto → uma chamada Luna/max → no máximo três casos → Terra/xhigh somente por hipótese → julgamento apenas no resíduo → parada por custo total.

O projeto permanece arquivado. E5 e E18–E20 permanecem consumidos e não podem ser repetidos. E22 permanece não consumido e não autorizado. Nenhuma conclusão deste documento qualifica Luna, Terra, o Evaluation Author ou um fluxo automático de avaliação.
