#!/bin/sh
ruff check --select I --fix "$@"
ruff format "$@"
