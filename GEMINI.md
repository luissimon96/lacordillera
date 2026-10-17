<!-- agent-graph-flow:start -->
<!-- agent-graph-flow:sha256 c170e52456e8591e48c6d6beacfa955e547ecf01d7b781f12653b516851168d8 -->
## agent-graph-flow (`agf`) — lacordillera

@AGENTS.md

Fluxo: `agf next` → `agf context <id>` → TDD → `agf check <id>` → `agf done <id>`. Sem hook de compressão: prefixe saídas longas com `agf compress run -- <cmd>`.
Mapa de código offline: `.agf/code-map/` (`INDEX.md` + card por arquivo, zero MCP). Orientação dinâmica via hooks (session-start/prompt/post-edit/stop) wired por `agf init`.
<!-- agent-graph-flow:end -->
