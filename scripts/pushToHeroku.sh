#!/bin/sh

deploy() {
  echo "Putting application '$TARGET_APP' in maintenance mode"
  heroku maintenance:on --app $TARGET_APP

  echo "Pushing from $SOURCE_BRANCH to 'git@heroku.com:${TARGET_APP}.git' repo"
  git push -u git@heroku.com:${TARGET_APP}.git ${SOURCE_BRANCH}:master --force

  echo "And... pushing it back on"
  heroku maintenance:off --app $TARGET_APP
}

case "$1" in
  prod)
    echo "!!!!! DEPLOYING IN PROD !!!!" # TODO : put more protection
    TARGET_APP=far-better-me
    SOURCE_BRANCH=master
    ;;
  pre)
    TARGET_APP=far-better-me-pre
    SOURCE_BRANCH=master
    ;;
  ci)
    TARGET_APP=far-better-me-ci
    SOURCE_BRANCH=develop
    ;;
  *)
    echo "Invalid environment found : '$1'"
    exit 1
esac

deploy
