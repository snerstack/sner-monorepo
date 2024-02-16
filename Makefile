.PHONY: dev prod semgrep

dev:
	@if [ ! -d "frontend/node_modules" ]; then \
		cd frontend && npm install; \
	fi

	docker compose -f docker-compose-dev.yml up --build

prod:
	docker compose -f docker-compose-prod.yml up --build

test-semgrep:
	@if ! command -v semgrep > /dev/null; then \
		python3 -m pip install semgrep; \
	fi

	@if ! echo "$$(semgrep login 2>&1)" | grep -q "token already exists" ; then \
		semgrep login; \
	fi

	semgrep ci
