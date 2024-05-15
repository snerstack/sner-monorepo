.PHONY: all freeze install install-dev install-db db lint test test-selenium coverage coverage-server coverage-server coverage-server-storage

all: coverage lint

freeze:
	@pip freeze | grep -v '^pkg[-_]resources='

install:
	sh bin/install.sh
	sh bin/install_nmap.sh
	sh bin/install_ipv6toolkit.sh
	sh bin/install_jarm.sh
	sh bin/install_firefox.sh
	sh bin/install_testssl.sh
	sh bin/install_nuclei.sh
	sh bin/install_quicmap.sh

install-dev:
	sh bin/install_selenium.sh

install-db:
	sh bin/install_db.sh

db:
	bin/server dbx remove
	bin/server dbx init
	bin/server dbx init-data

lint:
	flake8 bin/agent bin/server sner tests
	pylint bin/agent bin/server sner tests

test:
	pytest -v tests/agent tests/plugin tests/server

test-selenium:
	pytest -x -vv tests/selenium

coverage:
	coverage run --source sner -m pytest tests/agent tests/plugin tests/server -x -vv
	coverage report --show-missing --fail-under 100

coverage-server:
	coverage run --source sner/server -m pytest tests/server -x -vv
	coverage report --show-missing --fail-under 100

coverage-server-storage:
	coverage run --source sner/server/storage -m pytest tests/server/storage -x -vv
	coverage report --show-missing --fail-under 100

coverage-plugin:
	coverage run --source sner/plugin -m pytest tests/plugin -x -vv
	coverage report --show-missing --fail-under 100
