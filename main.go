package main

import (
	"crypto/rand"
	"encoding/hex"
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

// connPool holds a shared *http.Client per unique dgraph address.
// Multiple sessions pointing at the same address reuse one client.
type connPool struct {
	mu      sync.Mutex
	clients map[string]*poolEntry
}

type poolEntry struct {
	client  *http.Client
	refs    int
	lastUse time.Time
}

func newConnPool() *connPool {
	p := &connPool{clients: make(map[string]*poolEntry)}
	go p.reapLoop()
	return p
}

func (p *connPool) acquire(addr string) *http.Client {
	p.mu.Lock()
	defer p.mu.Unlock()

	e, ok := p.clients[addr]
	if !ok {
		e = &poolEntry{client: newHTTPClient()}
		p.clients[addr] = e
	}
	e.refs++
	e.lastUse = time.Now()
	return e.client
}

func (p *connPool) release(addr string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	e, ok := p.clients[addr]
	if !ok {
		return
	}
	e.refs--
	if e.refs <= 0 {
		e.refs = 0
		e.lastUse = time.Now()
	}
}

// reapLoop closes idle clients with zero refs after 5 minutes.
func (p *connPool) reapLoop() {
	for {
		time.Sleep(60 * time.Second)
		p.mu.Lock()
		for addr, e := range p.clients {
			if e.refs <= 0 && time.Since(e.lastUse) > 5*time.Minute {
				e.client.CloseIdleConnections()
				delete(p.clients, addr)
				log.Printf("Reaped idle connection pool for %s", addr)
			}
		}
		p.mu.Unlock()
	}
}

// session tracks a single browser session's dgraph target.
type session struct {
	addr    string
	lastUse time.Time
}

type sessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*session
}

func newSessionStore() *sessionStore {
	s := &sessionStore{sessions: make(map[string]*session)}
	go s.reapLoop()
	return s
}

func (s *sessionStore) get(id string) (*session, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sess, ok := s.sessions[id]
	if ok {
		sess.lastUse = time.Now()
	}
	return sess, ok
}

func (s *sessionStore) set(id, addr string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[id] = &session{addr: addr, lastUse: time.Now()}
}

func (s *sessionStore) delete(id string) string {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	if !ok {
		return ""
	}
	addr := sess.addr
	delete(s.sessions, id)
	return addr
}

// reapLoop removes sessions idle for over 1 hour.
func (s *sessionStore) reapLoop() {
	for {
		time.Sleep(5 * time.Minute)
		s.mu.Lock()
		for id, sess := range s.sessions {
			if time.Since(sess.lastUse) > 1*time.Hour {
				delete(s.sessions, id)
				log.Printf("Reaped idle session %s", id[:8])
			}
		}
		s.mu.Unlock()
	}
}

var (
	defaultDgraphAddr string
	pool              *connPool
	sessions          *sessionStore
)

func newHTTPClient() *http.Client {
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

func generateSessionID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// getOrCreateSession returns (sessionID, dgraphAddr) for the request,
// setting a cookie if needed.
func getOrCreateSession(w http.ResponseWriter, r *http.Request) (string, string) {
	cookie, err := r.Cookie("dgv_session")
	if err == nil {
		if sess, ok := sessions.get(cookie.Value); ok {
			return cookie.Value, sess.addr
		}
	}

	// New session
	id := generateSessionID()
	sessions.set(id, defaultDgraphAddr)
	http.SetCookie(w, &http.Cookie{
		Name:     "dgv_session",
		Value:    id,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	return id, defaultDgraphAddr
}

func main() {
	defaultDgraphAddr = "http://localhost:28080"
	if env := os.Getenv("DGRAPH_HTTP"); env != "" {
		defaultDgraphAddr = env
	}
	var port int
	flag.StringVar(&defaultDgraphAddr, "dgraph", defaultDgraphAddr, "Default Dgraph HTTP endpoint")
	flag.IntVar(&port, "port", 18080, "HTTP listen port")
	flag.Parse()
	defaultDgraphAddr = strings.TrimRight(defaultDgraphAddr, "/")

	pool = newConnPool()
	sessions = newSessionStore()

	mux := http.NewServeMux()

	mux.Handle("/", staticHandler())
	mux.HandleFunc("/api/query", handleQuery)
	mux.HandleFunc("/api/schema", handleSchema)
	mux.HandleFunc("/api/config", handleConfig)
	mux.HandleFunc("/api/disconnect", handleDisconnect)

	addr := fmt.Sprintf(":%d", port)
	log.Printf("Dgraph Viewer running at http://localhost%s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func handleQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	_, dgAddr := getOrCreateSession(w, r)

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

	resp, err := dgraphQuery(dgAddr, query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(resp)
}

func handleSchema(w http.ResponseWriter, r *http.Request) {
	_, dgAddr := getOrCreateSession(w, r)

	resp, err := dgraphQuery(dgAddr, `schema {}`)
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

	sessID, _ := getOrCreateSession(w, r)
	oldAddr := sessions.delete(sessID)
	if oldAddr != "" {
		pool.release(oldAddr)
		log.Printf("Session %s disconnected from %s", sessID[:8], oldAddr)
	}
	w.WriteHeader(http.StatusOK)
}

func handleConfig(w http.ResponseWriter, r *http.Request) {
	sessID, dgAddr := getOrCreateSession(w, r)

	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"dgraph": dgAddr})
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
		newAddr := strings.TrimSpace(req.Dgraph)
		if newAddr == "" {
			http.Error(w, "empty address", http.StatusBadRequest)
			return
		}
		newAddr = strings.TrimRight(newAddr, "/")

		// Release old, acquire new
		if dgAddr != "" {
			pool.release(dgAddr)
		}
		pool.acquire(newAddr)
		sessions.set(sessID, newAddr)

		log.Printf("Session %s target changed to %s", sessID[:8], newAddr)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"dgraph": newAddr})
	default:
		http.Error(w, "GET or PUT only", http.StatusMethodNotAllowed)
	}
}

func dgraphQuery(addr, query string) ([]byte, error) {
	payload := fmt.Sprintf(`{"query": %s}`, jsonString(query))
	client := pool.acquire(addr)
	defer pool.release(addr)

	resp, err := client.Post(addr+"/query", "application/json", strings.NewReader(payload))
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
