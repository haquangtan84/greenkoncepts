#!/bin/sh

BASE_DIR=`dirname $0`

echo ""
echo "Starting Testacular Server (http://vojtajina.github.com/testacular)"
echo "-------------------------------------------------------------------"

echo "Base directory = $BASE_DIR"

testacular start $BASE_DIR/../config/testacular.conf.js $*