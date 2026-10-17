<!-- agent-graph-flow:start -->
<!-- agent-graph-flow:sha256 bfe8e27457bec4af09c10feb5c1d45b38dfab55d12cade6b93dd0c0247309c8d -->
## agent-graph-flow (`agf`) — lacordillera

As instruções completas do `agf` estão em `AGENTS.md` (o Copilot já o carrega) — não repetidas aqui.

Fluxo: `agf next` → `agf context <id>` → TDD → `agf check <id>` → `agf done <id>`. Sem hook de compressão: prefixe saídas longas com `agf compress run -- <cmd>`.
Mapa de código offline: `.agf/code-map/` (`INDEX.md` + card por arquivo, zero MCP). Orientação dinâmica via hooks (session-start/prompt/post-edit/stop) wired por `agf init`.
<!-- agent-graph-flow:end -->
