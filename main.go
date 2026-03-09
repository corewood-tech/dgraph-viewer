package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	dgraphAddr   string
	dgraphClient *http.Client
	dgraphMu     sync.RWMutex
)

func newDgraphClient() *http.Client {
	return &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			DialContext:         (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
			MaxIdleConns:        10,
			IdleConnTimeout:     30 * time.Second,
			DisableKeepAlives:   false,
			MaxIdleConnsPerHost: 10,
		},
	}
}

func getDgraphAddr() string {
	dgraphMu.RLock()
	defer dgraphMu.RUnlock()
	return dgraphAddr
}

func getDgraphClient() *http.Client {
	dgraphMu.RLock()
	defer dgraphMu.RUnlock()
	return dgraphClient
}

func setDgraphAddr(addr string) {
	dgraphMu.Lock()
	defer dgraphMu.Unlock()

	addr = strings.TrimRight(addr, "/")

	// Close old client regardless
	if dgraphClient != nil {
		dgraphClient.CloseIdleConnections()
	}

	dgraphAddr = addr
	dgraphClient = newDgraphClient()
}

func main() {
	defaultAddr := "http://localhost:28080"
	if env := os.Getenv("DGRAPH_HTTP"); env != "" {
		defaultAddr = env
	}
	flag.StringVar(&dgraphAddr, "dgraph", defaultAddr, "Dgraph HTTP endpoint")
	flag.Parse()
	dgraphAddr = strings.TrimRight(dgraphAddr, "/")
	dgraphClient = newDgraphClient()

	mux := http.NewServeMux()

	mux.HandleFunc("/", serveUI)
	mux.HandleFunc("/api/query", handleQuery)
	mux.HandleFunc("/api/schema", handleSchema)
	mux.HandleFunc("/api/config", handleConfig)
	mux.HandleFunc("/api/disconnect", handleDisconnect)

	addr := ":18080"
	log.Printf("Dgraph Viewer running at http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func serveUI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(indexHTML))
}

func handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	var req struct {
		Query string `json:"query"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	query := strings.TrimSpace(req.Query)
	if query == "" {
		http.Error(w, "empty query", http.StatusBadRequest)
		return
	}

	// Block mutations
	lower := strings.ToLower(query)
	if strings.Contains(lower, "mutation") || strings.Contains(lower, "delete") || strings.Contains(lower, "set {") {
		http.Error(w, "mutations are not allowed", http.StatusForbidden)
		return
	}

	resp, err := dgraphQuery(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

func handleSchema(w http.ResponseWriter, r *http.Request) {
	schemaQuery := `schema {}`
	resp, err := dgraphQuery(schemaQuery)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	dgraphMu.Lock()
	if dgraphClient != nil {
		dgraphClient.CloseIdleConnections()
		dgraphClient = nil
	}
	dgraphMu.Unlock()
	log.Println("Dgraph disconnected")
	w.WriteHeader(http.StatusOK)
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"dgraph": getDgraphAddr()})
	case http.MethodPut:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer r.Body.Close()
		var req struct {
			Dgraph string `json:"dgraph"`
		}
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		addr := strings.TrimSpace(req.Dgraph)
		if addr == "" {
			http.Error(w, "empty address", http.StatusBadRequest)
			return
		}
		setDgraphAddr(addr)
		log.Printf("Dgraph target changed to %s", addr)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"dgraph": getDgraphAddr()})
	default:
		http.Error(w, "GET or PUT only", http.StatusMethodNotAllowed)
	}
}

func dgraphQuery(query string) ([]byte, error) {
	payload := fmt.Sprintf(`{"query": %s}`, jsonString(query))
	client := getDgraphClient()
	if client == nil {
		return nil, fmt.Errorf("not connected to any dgraph instance")
	}
	resp, err := client.Post(getDgraphAddr()+"/query", "application/json", strings.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("dgraph request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading dgraph response: %w", err)
	}
	return data, nil
}

func jsonString(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
