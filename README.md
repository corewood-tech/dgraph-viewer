# Dgraph Viewer

A lightweight, browser-based graph explorer for [Dgraph](https://dgraph.io) databases. Inspired by the Neo4j browser, built as a single Go binary with zero dependencies.

<p align="center">
  <img src="media/dgraph_viewer.png" alt="Dgraph Viewer" width="60%">
</p>

## Features

- **Interactive force-directed graph** — D3.js-powered visualization with physics-based layout
- **DQL query editor** — write and run arbitrary DQL queries with Cmd/Ctrl+Enter
- **Expand on double-click** — fetch and render a node's edges incrementally
- **Radial glow highlighting** — hover a node to see its connections fade over configurable depth (1-20 ranks)
- **Color by type** — nodes colored by `dgraph.type`, with auto-generated legend
- **Size by degree** — more connections = bigger node
- **Source-colored edges** — lines inherit the color of their origin node
- **Click-and-drag** — reposition nodes freely; zoom and pan the canvas
- **Cluster by density** — force simulation naturally groups densely-connected subgraphs
- **Node inspector** — sidebar shows all properties and clickable edge links
- **Live target switching** — change the Dgraph address in the UI without restarting
- **Read-only** — all mutations are blocked at the proxy layer
- **Schema viewer** — inspect predicates, types, indexes, and tokenizers

## Requirements

- Go 1.22+
- A running Dgraph instance with the HTTP API exposed (default: `localhost:28080`)

## Quick Start

```bash
# Clone and run
go run .

# Open in browser
open http://localhost:18080
```

The viewer starts on port `18080` and connects to Dgraph at `http://localhost:28080` by default.

## Configuration

### Dgraph Address

Set the target Dgraph instance using any of these methods (in order of precedence):

```bash
# Flag
go run . -dgraph http://dgraph-host:8080

# Environment variable
DGRAPH_HTTP=http://dgraph-host:8080 go run .

# In the UI
# Edit the "Dgraph" field at the top of the sidebar — connection switches live
```

### Build a Binary

```bash
go build -o dgraph-viewer .
./dgraph-viewer -dgraph http://localhost:28080
```

## Usage

### Running Queries

Write DQL in the query editor and press **Cmd+Enter** (or click **Run Query**). Results are parsed and rendered as an interactive graph.

Example — load all typed nodes:

```dql
{
  all(func: has(dgraph.type)) {
    uid
    dgraph.type
    expand(_all_) {
      uid
      dgraph.type
      expand(_all_)
    }
  }
}
```

Or just click the **All** button.

### Exploring the Graph

| Action | Effect |
|---|---|
| **Hover** a node | Highlights connected nodes with radial glow; shows labels along the chain |
| **Click** a node | Inspects it in the sidebar (properties, edges) |
| **Double-click** a node | Expands its edges by fetching from Dgraph |
| **Drag** a node | Repositions it; other nodes adjust via force simulation |
| **Scroll** | Zoom in/out |
| **Drag background** | Pan the canvas |

### Controls

| Control | Description |
|---|---|
| **Dgraph** | Target Dgraph HTTP address — edits switch the connection live |
| **Run Query** | Execute the DQL query (also Cmd/Ctrl+Enter) |
| **All** | Load all nodes with `dgraph.type` |
| **Clear** | Remove all nodes and edges from the canvas |
| **Schema** | Display the database schema in the sidebar |
| **Depth** | Number of ranks for the highlight chain (default: 5) |

## Architecture

```
dgraph_viewer/
├── main.go    # HTTP server, Dgraph proxy, mutation blocking
├── ui.go      # Embedded HTML/CSS/JS frontend (no build step)
└── go.mod     # Go module (zero external dependencies)
```

The server is a thin HTTP proxy:
- `GET /` — serves the embedded single-page UI
- `POST /api/query` — forwards DQL queries to Dgraph (blocks mutations)
- `GET /api/schema` — fetches the Dgraph schema
- `GET/PUT /api/config` — read/update the target Dgraph address at runtime
- `POST /api/disconnect` — tears down the current Dgraph connection

All communication with Dgraph uses the HTTP `/query` endpoint. No gRPC dependency.

## Safety

- **No mutations** — the proxy rejects any query containing `mutation`, `delete`, or `set {`
- **Read-only by design** — there is no write path in the API
- **Local only** — the server binds to `localhost` by default

## License

MIT
