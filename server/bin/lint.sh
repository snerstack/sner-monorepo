#!/bin/sh
# development helper

ruff check $@
pylint $@
