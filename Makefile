.PHONY: dev install

dev:
	@if [ ! -d "frontend/node_modules" ]; then \
		cd frontend && npm install; \
	fi

	docker-compose -f docker-compose-dev.yml up --build

prod:
	docker-compose -f docker-compose-prod.yml up --build

semgrep:
	docker run --rm -v "$(shell pwd):/src" semgrep/semgrep semgrep -- scan --config auto --error --exclude=venv/ /src
