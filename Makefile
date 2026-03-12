APP_NAME := dgraph-viewer
PORT     ?= 18080
PID_FILE := .pid.$(PORT)
LOG_FILE := /tmp/$(APP_NAME).$(PORT).log

.PHONY: start stop restart status

start:
	@go build -o $(APP_NAME) .
	@./$(APP_NAME) -port $(PORT) > $(LOG_FILE) 2>&1 & echo $$! > $(PID_FILE)
	@echo "Started $(APP_NAME) on port $(PORT) (pid $$(cat $(PID_FILE)))"
	@echo "Logging to $(LOG_FILE)"

stop:
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) 2>/dev/null && echo "Stopped $(APP_NAME) on port $(PORT)" || echo "Process not running"; \
		rm -f $(PID_FILE); \
	else \
		echo "No PID file for port $(PORT)"; \
	fi

restart: stop start

status:
	@found=0; for f in .pid.*; do \
		[ -f "$$f" ] || continue; \
		p=$$(echo "$$f" | sed 's/\.pid\.//'); \
		pid=$$(cat "$$f"); \
		if kill -0 $$pid 2>/dev/null; then \
			echo "port $$p  pid $$pid  running"; \
			found=1; \
		else \
			echo "port $$p  pid $$pid  dead (cleaning up)"; \
			rm -f "$$f"; \
		fi; \
	done; \
	[ $$found -eq 1 ] || echo "No instances running"
