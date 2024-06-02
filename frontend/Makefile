.PHONY: lint test coverage

all: coverage lint

install:
	npm run install

lint:
	npm run lint

test:
	npx vitest --run

coverage:
	DEBUG_PRINT_LIMIT=0 npx vitest --coverage --reporter=basic --reporter=hanging-process --run
