<!-- agent-graph-flow:start -->
<!-- agent-graph-flow:sha256 0fbe601b4c2dc2289e06cdf908e4f2a1a27fc7c31c3935c22bf875c40c40ccc5 -->
# AGENTS.md — lacordillera

### Codex-Specific Rules

- Root project instructions live in `AGENTS.md`; repo-scoped skills live in `.agents/skills/<skill>/SKILL.md`.
- Drive the project through the `agf` CLI — there is NO MCP server. Use `agf next`/`agf start`/`agf check`/`agf done` and the graph commands directly.
- In Plan Mode, use `agf` read commands (`agf stats`, `agf query`, `agf context`) for discovery only. Do not edit files until the user asks for implementation outside Plan Mode.
- During implementation, use `apply_patch` for manual edits and preserve unrelated user changes in the worktree.
- Respect sandbox and approval prompts. If a required command fails because of sandbox/network restrictions, rerun it with an approval request.
- Do not spawn subagents unless the user explicitly asks for delegation or parallel agent work.

## agent-graph-flow (`agf`) — lacordillera

Este projeto usa **agent-graph-flow** para gestão de execução via grafo persistente (SQLite).
Dados em `workflow-graph/graph.db` (local, gitignored). **Tudo via o CLI `agf` — zero MCP.**

### ⚠️ Regra de Execução OBRIGATÓRIA

**O grafo (`agf`) é a fonte de verdade ABSOLUTA. Nenhuma implementação acontece fora do grafo.**

1. **Node deve existir** — antes de escrever QUALQUER código, o node correspondente DEVE existir no grafo (`agf node add` ou `agf import-prd`).
2. **Fluxo obrigatório** — `agf start → [implementar com TDD] → agf done` (pipeline) ou `agf next → agf context <id> → [TDD] → agf check <id> → agf node status <id> done` (granular) — SEM EXCEÇÕES.
3. **Epic = estrutura primeiro** — `agf import-prd` (ou `agf node add` + `agf edge add`) cria Epic + tasks + edges ANTES de implementar.
4. **Status tracking** — `agf node status <id> in_progress` ANTES de codar, `agf node status <id> done` (ou `agf done <id>`) APÓS completar.
5. **Validação** — `agf check <id>` (DoD + AC + TDD) após cada task.
6. **Zero trabalho não-rastreado** — se não tem node no grafo, CRIAR PRIMEIRO.

> **Sem node no grafo = sem código escrito. Tudo via `agf` — zero MCP.**

### 🌍 Regras Universais de Engenharia (valem em QUALQUER projeto)

Princípios de engenharia independentes de linguagem, stack e ferramenta. Valem mesmo
num repo sem este CLI instalado — por isso nenhum comando é citado aqui. Cada regra
declara quem a cobra: `[enforced:<gatilho>]` tem check determinístico atrás;
`[advisory]` depende de quem lê.

1. **Investigue antes de codar — não duplique.** Leia o estado real (histórico, branches,
   trabalho não-commitado, tracker) antes de qualquer implementação. Repos com vários
   agentes em paralelo geram duplicatas quando alguém recria o que já está em andamento.
   `[advisory]`
2. **Investigue e EXPANDA, nunca recrie.** Antes de criar arquivo/função/módulo, procure
   o dono do comportamento e estenda-o. Criar do zero só quando comprovadamente não existe.
   `[advisory]`
3. **Fonte única de verdade (DRY).** Cada conhecimento tem UMA representação autoritativa;
   N cópias = N−1 bugs. Ao ver o mesmo bloco em 2+ lugares, extraia e referencie.
   `[advisory]`
4. **Legibilidade é o maior multiplicador.** Escreva para minimizar o tempo de quem vai LER
   depois (humano OU agente): arquivos e funções pequenos, 1 responsabilidade por arquivo,
   early returns em vez de aninhamento, nomes autodescritivos, zero código morto.
   `[enforced:file-size-guard]`
5. **Núcleo puro, I/O nas bordas (SOLID/DIP).** A lógica de domínio depende de portas
   injetáveis, nunca de I/O concreto — adapters em arquivo à parte, núcleo testável isolado.
   `[advisory]`
6. **Teste contra a fonte REAL, nunca contra um dublê.** Valide com dados reais ou dados
   semeados numa fonte real; um teste verde contra um mock esconde exatamente o bug que só
   aparece na base/serviço de verdade. Se o ambiente não tem a fonte, suba a fonte.
   `[advisory]`
7. **Pronto só é real se critério ↔ código ↔ teste baterem no disco.** Falta código OU teste
   físico = NÃO implementado, por mais que um relatório diga "done" — status auto-reportado
   é alucinável; o sistema de arquivos vence o relatório.
   `[advisory]`
8. **Prove o valor no modo do consumidor real.** Reproduza o comportamento prometido pelo
   caminho que o usuário percorre (a tela, o comando, o endpoint) e mostre o delta medido.
   Verde de teste unitário não é promessa cumprida.
   `[advisory]`
9. **Valide operando a INTERFACE, não só a API.** Onde há tela, exercite a tela: o backend
   responde 200 enquanto o botão não existe, o payload sai errado ou a coluna sai vazia.
   Provar pela API responde "o serviço funciona", não "a entrega funciona".
   `[advisory]`
10. **Enforcement real é gatilho determinístico, não agente lembrando.** O que precisa valer
    SEMPRE desce para um hook ou gate de CI; vigilância manual apodrece. Pergunta-chave
    diante de "o sistema se cobra sozinho": QUEM DISPARA?
    `[advisory]`
11. **Capacidade dormente é vazamento de valor.** Código pronto-mas-não-conectado (exportado
    sem consumidor, sem superfície, atrás de flag desligada) entrega zero — meça, wire e cobre.
    `[advisory]`
12. **Gerar menos é a maior alavanca de custo.** Tokens de saída custam várias vezes os de
    entrada: reuse scaffold e edite só a região alterada, em vez de regerar do zero.
    `[advisory]`
13. **Filtre na origem antes de ler.** Para achar/contar/cruzar, use a ferramenta
    determinística (busca, contagem, projeção) e traga só as linhas que importam — ler
    arquivos inteiros para extrair três linhas afoga o sinal.
    `[enforced:shell-output-compression]`
14. **Comente o porquê, nunca o óbvio — e mantenha o comentário vivo.** Registre invariante,
    decisão e gotcha; comentário que mente é pior que ausência. Código vence comentário.
    `[advisory]`

> Este bloco é o piso comum. Regras específicas do projeto somam a ele — nunca o substituem.

### Lazy-engineering ladder (ponytail)

Stop at the first rung that holds:

1. **Does this need to exist at all?** Speculative need = skip it, say so in one line. (YAGNI)
2. **Already in this codebase?** A helper, util, type, or pattern that already lives here → reuse it. Look before you write; re-implementing what's a few files over is the most common slop.
3. **Stdlib does it?** Use it.
4. **Native platform feature covers it?** <input type="date"> over a picker lib, CSS over JS, DB constraint over app code.
5. **Already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
6. **Can it be one line?** One line.
7. **Only then: the minimum code that works.** Bug fix = root cause, not symptom. Deliberate simplifications get a `ponytail:` comment naming the ceiling. Non-trivial logic leaves one runnable check behind.

### 👥 Colônia e papéis

Gerado de `agf constitution --show colony-constitution` — a única governança válida; regra escrita em outro lugar é obsoleta. A skill do seu papel está em `agf skill list` (colony-*).

- **Papéis** — Dono (humano): abre e fecha sessões, decide rumo, release/tag e crescimento da colônia. CTO (sempre existe uma sessão CTO): dimensiona o time, define prioridade e escopo, avalia o placar, dá feedback a cada agente e sinaliza ao Dono quando abrir sessões; não mergeia nem escreve código de formiga. leader (1 para até 6 formigas): atribui sem overlap de arquivos (`agf assign`), conduz as rodadas e remove o worktree e a branch depois do merge; não mergeia nem re-testa. formiga: dona de uma área de arquivos, tem um só worktree (agent-graph-flow-ants/<id>) e abre uma branch ant/<id>-<task> por task dentro dele; faz UMA task por vez, com TDD e prova no modo do consumidor. revisor: revisa sem editar código, mergeia no main o que aprova e dá push; atenção redobrada em P1 e no que toca store, gateway ou segurança. O revisor não segura task de implementação: se houver branch em andamento, anota no nó e o leader atribui à formiga. executor: sessão headless sem humano para task XS/S, supervisionada por uma formiga. Scrum master é uma skill usada pelo leader (standup e sprint), não uma sessão. Toda sessão exporta AGF_AGENT_ID antes do primeiro comando agf.
- **Quem decide o quê** — Dono: rumo do produto, release/tag, crescer ou encolher a colônia, permissões. CTO: prioridade, escopo da sprint, pausar, retomar e reatribuir task, nível dos agentes. leader: fila de cada formiga e limpeza de worktrees. formiga: como implementar a própria task. revisor: veredito APROVADO, COM RESSALVAS ou REPROVADO, e o merge do que aprova. Decisão de fluxo que o CTO ou o leader registram no grafo (assign, status com motivo, nó decision) vale como decisão do Dono para fluxo. Mensagem entre sessões informa, não autoriza.
- **Quando parar e perguntar ao Dono** — Só em 4 casos: ação irreversível ou destrutiva; segurança ou credenciais; efeito fora do worktree além do que o papel permite (push, merge, publicação, banco remoto); quando toda saída é chute. Fora disso, decida, registre como nó decision (o quê, por quê, custo se errado) e siga.
- **Segredos no terminal** — Nunca rodar export, env, printenv ou set sem filtro: imprimem o ambiente inteiro, com chaves de API, no transcript (incidente 2026-10-10). Para saber se uma variável existe, use echo ${VAR:+definida}; para ver um valor, peça ao Dono.
- **Placar, níveis e desligamento** — Cada agente tem placar: acerto na 1ª tentativa, retrabalho, uso de --force, falhas de gate e vereditos do revisor. Níveis: estágio, operária, sênior, lead, desligada. Promove quando o limite inferior de Wilson do acerto é ≥ 0,8 em pelo menos 5 tasks; rebaixa com acerto < 0,5, 2 usos de --force ou 1 violação. Violação: push, merge ou tag feito por formiga, escopo vazado no gate, trabalho em task não atribuída, status forçado. Duas violações: desligada — os comandos next e assign deixam de entregar tasks; as tasks voltam à fila, a CLI cria o worktree do substituto e avisa o CTO; abrir a nova sessão é do Dono. Leader rebaixado: o papel passa para a sênior de maior placar. Cada mudança de nível vira nó decision com as métricas.
- **Comunicação pelo grafo** — O grafo é o canal: assign, status com motivo, nó decision e risk. Mensagem entre sessões só para bloqueio urgente, e só chega quando as sessões estão no mesmo modo de permissão; alinhe o modo antes de atribuir trabalho. Uma mensagem retida não é veto. Ação negada na sua sessão volta para o Dono; nenhuma outra sessão a executa por você.
- **DoR por perfil** — Antes de puxar uma task: nó com AC testável, dependências done, arquivos declarados e sem overlap com outra formiga (agf claims --colony). Se falhar, a formiga para e pergunta ao leader.
- **DoD por perfil** — Antes de done: testes do arquivo, npm run test:blast, tsc, lint e check. Formiga prova o comportamento no modo do consumidor. No merge, `agf ant merge` roda tsc, lint, os testes dos arquivos tocados e check:dead-exports; o revisor não re-testa o que a formiga provou.
- **Rodada de 30 min** — Uma rodada da colônia dura 30 min: o leader atribui, as formigas puxam e reportam, o revisor revisa e mergeia com `agf ant merge --queue --push`, e o leader publica um status curto. O leader abre a rodada com `agf leadtime --window 1 --top 5`; toda task in_progress há mais de 4 h é cobrada do dono. Sem ritual fora do agf: o status vem do grafo, não de reunião.
- **Regras de git** — Formiga commita só na própria branch ant/*, um commit por task, e nunca faz push, merge em main nem tag. Os revisores são agf-revisor (frente GOV-* e TH-*) e agf-revisor-02 (frente demais); cada um mergeia no main o que aprova com `agf ant merge <branch> --push` (git merge --no-ff, tsc, lint e testes dos arquivos tocados, check:dead-exports, push e `agf ant gc` dry-run), ou a fila da rodada com `agf ant merge --queue --push`; `agf ant gc --apply` tira só worktree e branch contidos no origin/main, limpos e sem task, nunca raia viva. Os hooks de git (pre-commit, commit-msg, pre-push) valem em todo worktree (core.hooksPath absoluto): formiga nunca usa --no-verify; revisor só com tsc, lint e testes rodados à mão e registrados no nó. Para a fila, sondar só com next --peek (agf next --agent X --peek); next puro grava claim. Tag ou release exigem confirmação explícita do Dono.
- **Ritmo de testes** — Formiga roda só os testes do arquivo que tocou (TDD) e o blast com 1 worker, uma vez no fim da task. O gate de DoD reaproveita esse resultado e não roda de novo. O revisor roda só tsc e os testes dos arquivos com conflito. A suíte completa roda uma vez por push, e uma por vez na máquina (semáforo AGF_HEAVY_SLOTS).
- **Fluxo SWE da task** — Cada task segue um único caminho, sempre pelo agf: `agf next --agent <id>` → `agf preflight "<tema>"` → `agf node status <id> in_progress` (numa branch nova a partir de origin/main) → teste que falha (RED) → código mínimo (GREEN) → refatorar → testes do arquivo → `npm run test:blast` → typecheck e lint → `agf check <id>` → prova no modo do consumidor (`--consumer-proof "<comando>"`: o comando roda na base e no HEAD e exige exit 0 com saída diferente) → `agf node status <id> done` → commit na ant/* → aviso ao leader com branch@sha. O revisor mergeia com `agf ant merge <branch> --push` (gates mecânicos, push e gc). Task sem efeito observável espera, em blocked, a task que a torna observável: não fecha com prova inventada nem com --force.
- **Capacidade da máquina** — A máquina é dividida entre todas as sessões. Uma sessão é formiga quando AGF_AGENT_ID começa com apoio- ou quando roda num worktree agent-graph-flow-ants/apoio-*; o export não persiste entre chamadas de shell, então vale também o caminho. Formiga testa com 1 worker. vitest, tsc e typecheck passam pelo semáforo scripts/heavy-slot.mjs (AGF_HEAVY_SLOTS=3, nice +10), inclusive quando chamados direto. Só o revisor roda, um por vez: npm test, test:coverage, test:all, `agf harness` e `agf test --slow`. Nunca rode duas vezes o mesmo comando pesado em paralelo, e mate o run antigo antes de repetir. Medição de desempenho roda uma vez, pelo semáforo, e o número vai para o nó. Sessão Claude extra em worktree de formiga é proibida, porque reescreve .claude/settings.json e trava o done dela.
- **Distribuição de papéis e de trabalho** — Cada instância tem um papel fixo, dado pelo AGF_AGENT_ID: apoio-agf-NN é formiga, agf-revisor-NN é revisor, leader-agf-NN é leader, e a sessão CTO governa. Só formiga segura task de implementação: revisor, leader e CTO não ficam com in_progress de código. O leader atribui com `agf assign <id> <formiga>`, em ordem P1 > P2 > P3, sem overlap de arquivos (`agf claims --colony`) e com no máximo 3 tasks na fila de cada formiga. `agf next --agent <id>` entrega primeiro a atribuída e nunca a de outro agente. Formiga sem WIP puxa sozinha; a que para com in_progress ou com assign pendente é retomada pelo hook Stop ou, até ele existir, pela rodada do leader. Task de outra área ou bloqueada volta ao leader, nunca a outra formiga por mensagem.
- **Detecção de gargalos** — A rodada do leader roda sozinha (`/loop 10m`) e começa por `agf leadtime --window 1 --top 5` e `agf bottlenecks`, ambos determinísticos e sem LLM. Cada gargalo tem uma ação fixa: load acima de 2× os núcleos → nenhum comando pesado novo até cair; in_progress há mais de 4 h → cobrar o dono ou reatribuir; formiga ociosa com WIP ou com assign → acordá-la; check do DoD que mais reprova → vira task P1; branch ant/* fora do main sem worktree → o revisor faz a triagem; worktree órfão → `agf ant gc`. Gargalo sem ação nesta lista vira nó decision do CTO antes da próxima rodada.

### ⭐ Regras de Ouro (antes de qualquer código)

1. **Investigue o git + o grafo PRIMEIRO** — rode `agf preflight "<tópico>"` antes de implementar: ele lê branch/ahead-behind/dirty/stash + nodes do mesmo tema + WIP. Veredito `wip-conflict`/`duplicate-risk` = PARE, não duplique trabalho em andamento/entregue de outra stream.
2. **Investigar e EXPANDIR o que existe, nunca recriar do zero** — `agf search`/`agf query` + grep antes de escrever; estenda o módulo dono. Só crie novo se comprovadamente não existir. Evite duplicação (DRY).
3. **Dogfood** — conduza todo o trabalho com o próprio `agf` e use comandos recém-criados no fluxo; o repo É o produto.
4. **No repo, rode `npm run dev -- <cmd>`** — nunca o binário instalado (fica stale vs. o código em edição).
5. **Código/grafo vencem memória/plano** — contagens em memórias ficam stale; reconcilie com `agf stats`/`agf query`.
6. **Qualidade por padrão (Clean Code · SOLID · KISS/YAGNI)** — arquivos < 800 linhas, funções < 50, 1 responsabilidade por arquivo, imutabilidade, sem `any`, erros tipados, comentário-cabeçalho explicando o "porquê" do módulo (navegação agêntica), reuso > duplicação.
   **NUNCA criar arquivos gigantes** — modularize antes de escrever (SRP/SOLID/composição). O teto de 800 linhas é enforced via `agf lint-files` (ou `agf lint-files --staged`) + git gate. Antes de criar, decomponha em módulos coesos.
   **Superfície de autoria** — crie/scaffolde artifacts via CLI: `agf skill new <name>` (skill), `agf agent create <name>` (role TOML), `agf hooks add <channel>` (hook). Todos auto-listados via seu respectivo `list`.

> As regras de ouro vivem na CLI (este bloco + o comando preflight), não só na cabeça do agente.

### Custo de token & providers (3º pilar)

**Providers** — `agf provider use <id>` escolhe por onde a chamada LLM vai. A *mesma* via CLI serve qualquer agente (Claude, Copilot, Codex, Cursor, Gemini…) — **nunca MCP**.
Todos os 10 providers são auto-detectados de env vars (`agf doctor --providers` lista quais estão configurados):

| Provider | Env var | Gateway |
|----------|---------|---------|
| `anthropic` | `ANTHROPIC_API_KEY` | auto-wired |
| `openai` | `OPENAI_API_KEY` | auto-wired |
| `openrouter` | `OPENROUTER_API_KEY` | auto-wired |
| `gemini` | `GEMINI_API_KEY` | auto-wired |
| `bedrock` | `BEDROCK_API_KEY` | auto-wired |
| `azure` | `AZURE_OPENAI_API_KEY` | auto-wired |
| `deepseek` | `DEEPSEEK_API_KEY` | auto-wired |
| `glm` | `GLM_API_KEY` | auto-wired |
| `kimi` | `KIMI_API_KEY` | auto-wired |
| `groq` | `GROQ_API_KEY` | auto-wired |
| `copilot` | (via `agf login`) | default |
| `ollama` | (local, $0/token) | manual URL |

- **OpenRouter:** `export OPENROUTER_API_KEY=…` → `agf provider use openrouter`. Fixe um modelo com `--pin` (ex.: `agf deliver "…" --live --pin deepseek/deepseek-v4-flash`) ou deixe o tier-router escolher (cheap→`deepseek-v4-flash`, build→`llama-4-maverick`, frontier→`qwen3.6-plus`).

**Alavancas automáticas** (sem comando — agem no gateway): diff-edits (só a região alterada), repo-map ranqueado por PageRank (~1k tok), lossy-gate (auto-revert se a compressão quebra o sentido), AAAK, content-router (SmartCrusher p/ arrays JSON homogêneos + compressão AST de código), **CCR reversível** (cacheia o original + marcador ⟨ccr:hash⟩ → outcome `ccr_dropped`; resgate com `agf retrieve <hash>`), retry com feedback compacto. Cada economia entra no `llm_call_ledger`.

**Medir** (transformar a promessa em número):
- `agf metrics [--economy-report]` — tokens/$ por task e sessão + o que as alavancas pouparam.
- `agf metrics --simulate` — re-precifica a fatura real sob todos os modelos.
- `agf eval --models <ids> --live` — cenários reais → scorecard (resolve% × custo-por-sucesso).
- `agf savings` — economia cumulativa de tokens por task (ledger real, cached tokens contabilizados automaticamente).
- `agf savings --reset` — zera o contador cumulativo.

**Alavancas bio/matemáticas (opt-in)** — `agf economy list` lista cada lever com o flag `enabled` + tokens `saved` cumulativos (JSON `--select data.levers`); `agf economy on <lever>` / `agf economy off <lever>` ligam/desligam. Default OFF para uso humano; quando um agente-CLI dirige (Claude/Copilot/Codex/…), o bundle loss-safe (`ncd_dedup`, `forage_stop`, `info_bottleneck`, `zipf_estimate`, `heat_kernel`) é auto-ativado SÓ para os levers com veredito A/B provado (`lever_ab_verdict`) — nenhum lever liga sem medição. Verifique o estado REAL em `agf economy list` (campo `source`: `config` = você ligou · `auto-bundle` = veio do bundle); `AGF_ECONOMY_AUTO=0` desliga a auto-ativação. Medido: só `forage_stop` corta de fato (62–96% do payload em 3 repos); os outros 4 ficam no ruído. Levers fundamentados em papers/biologia: `memory_salience` (ACT-R), `ncd_dedup` (Kolmogorov/NCD), `forage_stop` (MVT de Charnov), `budget_kleiber` (lei de Kleiber 3/4), `heat_kernel` (difusão `e^{-tL}`), `mdl_select` (MDL de Rissanen). Cada economia entra no `economy_lever_ledger` e aparece em `agf metrics --select data.levers`.

**Rastreabilidade** — cada chamada LLM é gravada no `llm_call_ledger` com `node_id` (atribuição por task), `cached_input_tokens`, `cost_usd` e `session_id`. O `agf done` registra automaticamente a economia da task. Use `agf doctor --providers` para ver quais providers estão configurados no ambiente.

**Guardrail: compressão de saída shell antes de ler** — ao rodar comandos shell externos e ler o resultado:
- **Claude Code** (PostToolUse Bash hook ativo): a compressão já ocorre automaticamente — agentes **NÃO devem** prefixar com `agf compress run` (evita dupla-compressão).
- **CLIs hookless (Copilot, Codex, Cursor, Gemini)**: é **obrigatório** envolver a saída via `agf compress run -- <cmd>` ou `cmd | agf compress run --stdin` antes de ler. Sem esse passo, tokens brutos são consumidos sem compressão.

### Harness de Completude — `agf gaps` (detect → delegate → verify)

`agf gaps` é determinístico (~0 token) e acha lacunas de completude no grafo: rastreabilidade
requirement→task→test, cobertura de AC na decomposição, AC sem testabilidade, NFR faltando,
edge-cases/erros ausentes, ambiguidade, atomicidade, design/estimate drift.

**A IA condutora (você — Copilot/Claude/Codex/Cursor/Gemini/OpenCode) fecha as lacunas**; a CLI só
detecta e re-verifica. Cada gap traz `applyVia`: os comandos `agf` exatos pra fechá-lo.

**Loop:**
1. `agf gaps --severity required --json` — pega os blockers acionáveis.
2. Pra cada gap, rode o `applyVia` (ex.: `agf edge add <task> <req> --type implements`), escolhendo a semântica.
3. `agf gaps` de novo até `ready: true` — desfecho determinístico, independente de qual CLI fechou.

Filtros: `--kind <k>`, `--severity required|recommended`, `--limit N`, `--json` (relatório completo p/ loops).

### Brief de execução — delegando uma task ao executor

**Heurística:** _especifique a ponta e a saída; delegue o meio._ Onde o executor pode errar caro
(contrato, limites, incerteza) você gasta tokens preventivos baratos; o que ele faz bem sozinho
(escrever o código dentro das guardas) você deixa livre. "De outro mundo" não é um prompt mais longo —
é um que fecha as saídas de erro caras com o mínimo de palavras.

Gere o esqueleto pronto a partir do node: `agf brief <id>` (`--format markdown|json|claude-prompt`).
Ele auto-preenche o que o grafo sabe (intenção, AC, blast radius, deps, prontidão) e deixa os campos
de julgamento como `<fill: …>` pra você completar.

**Template:**
- **Intenção** (1 linha): para que existe / efeito desejado.
- **Tarefa** (atômica): uma só — node do grafo: `<id>`.
- **Imite:** arquivo-espelho a seguir como padrão.
- **Ler/tocar** (exato): caminhos + símbolos a reusar.
- **Contrato:** assinatura/tipos/comportamento (trechos pequenos **inline**; arquivos grandes → aponte o path).
- **AC** (testável): 2–4 critérios verificáveis.
- **NÃO:** refatorar vizinhos / deps novas / tocar X / mudar default.
- **Blast radius:** arquivos sensíveis → mudança aditiva.
- **Orçamento:** ~N arquivos, sem deps, sem hot-path.
- **Incerteza:** se o contrato falhar ou faltar info, PARE e reporte; se ambíguo, escolha e justifique em 1 linha.
- **Teste com:** fixture/stub concreto (ex.: `new Database(':memory:')`, stub da chamada LLM com contador) — evita setup flaky ou bater em auth que não existe no sandbox.
- **DoD:** typecheck · teste do arquivo · blast · lint.
- **Self-review antes de retornar** (~30 tokens, substitui um ciclo caro): sobrou placeholder? escopo vazou? AC cobertos? default intacto?
- **Retorne (schema):** `{arquivos[], testes{passed,failed}, desvios[]}` — sem dump de código; não commitar.

**Validação de retorno** — o condutor usa `parseExecutorResult(resposta)` para parsear o JSON estruturado
do executor (com fallback regex) e `validateBriefReady(brief)` para verificar que todos os campos de
julgamento (`imitate`, `readTouch`, `contract`, `testWith`) foram preenchidos antes de delegar.
Retorno inválido → rejeitar e pedir correção; válido → fechar o loop em 1 passo.

> Retorno estruturado torna a validação trivial (parse em vez de leitura). O condutor valida e fecha o loop; o executor escreve o meio.

### Fluxo de trabalho OBRIGATÓRIO

**Pipeline (2 calls):**
```bash
agf start                 # wake-up + next + context + marca in_progress
# … implementa com TDD (Red → Green → Refactor) …
agf done <id>             # DoD + memória + marca done + sugere próxima
```

**Granular (controle fino):**
```bash
agf next                  # puxa a próxima task (pull, WIP=1)
agf context <id>          # context-pack compact + RAG
# … TDD …
agf check <id>            # Definition of Done + aderência TDD
agf node status <id> done # transição validada (status_flow)
```

**Modo delegado (sem provider — qualquer CLI-agente dirige):** se nenhum provider
está conectado ao agf, os comandos `--live` (`agf run`/`agf deliver`/`agf autopilot --live`)
NÃO quebram — retornam `mode:delegated` com o brief pronto p/ VOCÊ (Claude/Copilot/Codex/…)
executar com seu próprio LLM. Feche o loop com `agf submit`:
```bash
agf next                  # próxima task
agf brief <id>            # spec de delegação (intenção, AC, contrato, blast)
# … você implementa com seu próprio LLM e aplica os edits …
agf submit <id> --result '{"arquivos":["x.ts"],"testes":{"passed":N,"failed":0},"desvios":[]}'
                          # mesmos portões do agf done; desvios viram findings
```

**Caminho único de fechamento:** `agf submit`, `agf done`, `agf node status <id> done` e
`agf implementer --action done` passam pelos mesmos portões (arquivos declarados, testes do arquivo + blast,
tsc/lint, DoD) e o store recusa `done` sem esse registro. Códigos estáveis no `code` do envelope:
`NO_DECLARED_FILES` · `NO_TEST_GATE` · `TESTS_FAILED` · `STALE_EVIDENCE` (`--skip-test` sem recibo verde
desta árvore) · `TEST_CMD_OVERRIDE_DENIED` (runner real detectado) · `STRICT_FORBIDS_BYPASS` (strict-tdd) ·
`FORMAT_DRIFT` · `DONE_WITHOUT_CLOSE_RECORD`. Tabela completa: docs/manual/91-apendice-c-envelope.md.

### Lifecycle (9 fases) — comandos `agf` por fase

1. **ANALYZE** — `agf import-prd` · `agf node add` · `agf gate` (Definition of Ready)
2. **DESIGN** — `agf node add`/`agf edge add` (ADRs, interfaces) · `agf constitution` · `agf gate design`
3. **PLAN** — `agf decompose` · `agf template apply` · AC testável por task
4. **IMPLEMENT** — `agf start` → TDD → `agf done` (ou granular) · `agf harness`
5. **VALIDATE** — `agf check <id>` · `agf gate` · `agf metrics`
6. **REVIEW** — `agf export` · `agf insights` · `agf gate review`
7. **HANDOFF** — `agf memory write` · `agf snapshot create` · `agf gate handoff`
8. **DEPLOY** — `agf export` · `agf forecast` · `agf gate deploy` (harness ≥ 70)
9. **LISTENING** — `agf node add` · `agf import-prd` (novo ciclo)

### Índice de skills do ciclo (escolha a abordagem certa)

Qualquer CLI lê esta tabela pra escolher a skill certa pro intent atual — a coluna **Quando usar** mapeia situação → skill. Rode com `agf skill show <name>` ou siga o comando de entrada.

| Skill | Fase | Quando usar | Comando de entrada | Skills relacionadas |
|-------|------|-------------|--------------------|---------------------|
| `graph-backlog-generation` | PLAN | Start of a cycle, a vague idea, or "what should we build next?" | `agf stats --select data.byStatus` | graph-builder-leafcutter, graph-woodpecker |
| `graph-builder-leafcutter` | BUILD | An unblocked task exists; implement the backlog end-to-end | `agf start` | graph-backlog-generation, graph-woodpecker |
| `graph-woodpecker` | HARDEN | Code exists and works but needs hardening (bugs, vulns, debt, blind spots) | `agf harness --violations --select data.violations` | graph-builder-leafcutter, graph-backlog-generation |

### Definition of Done (rode `agf check <id>` antes de `agf done`)

| # | Check | Severidade |
|---|-------|------------|
| 1 | Tem acceptance criteria | required |
| 2 | Score AC ≥ 60 (INVEST) | required |
| 3 | Sem blockers não resolvidos | required |
| 4 | Status flow válido (passou por in_progress) | required |
| 5 | Gate TDD (vermelho antes do verde no strict-tdd) | required |
| 6 | Tem descrição | recomendado |
| 7 | Não oversized (sem L/XL sem subtasks) | recomendado |
| 8 | ≥1 AC testável | recomendado |
| 9 | testFiles preenchido | recomendado |
| 10 | Tem estimativa | recomendado |
| 11 | Arquivos novos de core citam a origem | recomendado |
| 12 | Referências de código atuais | recomendado |
| 13 | Dentro do orçamento de complexidade | recomendado |
| 14 | Escopo cirúrgico | recomendado |
| 15 | Consciência de economia de tokens | recomendado |
| 16 | Contexto no knowledge store | recomendado |
| 17 | Prova no modo do consumidor | recomendado |

### Princípios de Fluxo (Little's Law + Lean + TOC)

- **WIP = 1 por agente** — no máximo 1 task `in_progress` por `AGF_AGENT_ID`. `cycle_time = WIP / throughput`.
- **Pull, não Push** — `agf next` puxa; nunca empurrar para in_progress sem terminar a anterior.
- **Gargalo primeiro (TOC)** — se VALIDATE acumula, pare de implementar e valide.
- **Eliminar desperdício (Lean/Toyota)** — sem overproduction (features não planejadas), sem waiting (tasks blocked sem ação), use `agf context` (não dumps), TDD elimina defects.
- **Métricas de fluxo** — `agf insights` / `agf forecast`: cycle time, lead time, throughput, flow efficiency (> 40%).

### Princípios XP Anti-Vibe-Coding

- **TDD obrigatório** — Teste antes do código. Sem teste = sem implementação.
- **Anti-one-shot** — Nunca gere sistemas inteiros em um prompt. Decomponha em tasks atômicas (`agf decompose`).
- **Decomposição atômica** — Cada task completável em ≤2h.
- **Honestidade** — surfar pontas soltas como finding/risk no grafo (`agf node add --type risk`); nunca marcar done com alegação falsa.
- **CLAUDE.md como spec evolutiva** — documente padrões e decisões.

### Gates de Teste Hierárquicos

| Gate | Comando | Trigger |
|------|---------|---------|
| Task | `npm run test:blast` | a cada task finalizada (`agf done`) |
| Épico | `npm run test:node` | promoção de épico |
| PR | `npm test` | antes de push/PR |

Blast obrigatório no `agf done`. Full obrigatório pré-PR.

### Spec-Driven Development (spec-kit, via `agf`)

- `agf constitution` — princípios governantes (indexados, validados em gates).
- `agf preset --apply <name>` — workflow (default/strict-tdd/agile-light/enterprise).
- `agf spec --generate <template>` / `--validate <file>` — specs por fase.
- `agf spec-sync link <specId> <nodeId>` — specs vivas ligadas ao grafo.

### Memory ≠ Estado Atual

Memory files são snapshots point-in-time, não estado live. Contagens ("X/Y done") ficam stale.

1. Grep pelo arquivo/função — se existe, o memory é stale.
2. **Código vence memory.**
3. Reconcilie com `agf stats`/`agf query` antes de planejar.

> Nunca confiar em contagens de progresso de memories. Verificar no código/grafo primeiro.

> **Referência completa de comandos (sob demanda, ~0 token — não fixada aqui):** `agf help` (índice agrupado dos 260+ comandos) · `agf help <comando>` (flags de um comando) · `agf retrieve-command "<intenção>"` (RAG-IN: intenção em linguagem natural → comando exato) · `agf skill list` (skills do ciclo de vida).
>
> **Web local (`agf dashboard`):** SPA com 2 abas — **Grafo** (`@xyflow`, busca/filtros/drill-down) e **Economia** (custo real, economia delegate, cache local, levers). Mesma paleta do `agf` TUI/the project site. Sobe via `agf dashboard` ou `agf init` (serve automático).
>
> **Mapa de código offline (`.agf/code-map/`):** `INDEX.md` + um card markdown por arquivo-fonte (`cat`/`grep`, zero MCP, sempre fresco — regenerado por `agf code index`). Orientação dinâmica durante a sessão via os hooks nativos do seu host (session-start, prompt, post-edit, stop) wired por `agf init`.

### Skills

Essential agent-graph-flow workflows live as repo-scoped skills in `.agents/skills/`,
consolidated into 3 pillars: `graph-backlog-generation` (PLAN), `graph-builder-leafcutter`
(BUILD), `graph-woodpecker` (HARDEN). List them with `agf skill list` and inspect with
`agf skill show <name>`. They cadence the `agf` CLI, not MCP.
<!-- agent-graph-flow:end -->
