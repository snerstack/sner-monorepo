#!/bin/sh
# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
#
# test the stability of the selenium tests
export PYTEST_FRONTEND=build

for iter in $(seq 1 11); do
	timeout 900 make test-selenium
	RET=$?
	echo "INFO: round ${iter}"
	if [ $RET -ne 0 ]; then
		echo "ERROR: error"
		exit
	fi
done
