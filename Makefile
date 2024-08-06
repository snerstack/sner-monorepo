.PHONY: dev prod semgrep githook devservers

semgrep:
	docker run --rm -v "$(shell pwd):/src" semgrep/semgrep semgrep -- scan --config auto --error --exclude=venv/ /src

githook:
	ln -sf ../../server/extra/git_hookprecommit.sh .git/hooks/pre-commit

devservers:
	screen -S server -X quit || true
	cd server && screen -S server -dm /opt/sner/server/venv/bin/python3 /opt/sner/server/bin/server run --debug
	screen -S frontend -X quit || true
	cd frontend && screen -S frontend -dm npm run dev
