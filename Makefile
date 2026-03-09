APP_NAME := dgraph-viewer
PID_FILE := .pid

.PHONY: start stop

start:
	@go build -o $(APP_NAME) .
	@./$(APP_NAME) & echo $$! > $(PID_FILE)
	@echo "Started $(APP_NAME) (pid $$(cat $(PID_FILE)))"

stop:
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) 2>/dev/null && echo "Stopped $(APP_NAME)" || echo "Process not running"; \
		rm -f $(PID_FILE); \
	else \
		echo "No PID file found"; \
	fi
