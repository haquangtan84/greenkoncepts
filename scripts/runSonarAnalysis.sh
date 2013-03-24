#!/bin/sh


# Server
if [ 0 == 1 ];
then
sonar-runner \
  -Dsonar.projectKey=fbm:fbm-server \
  -Dsonar.projectName="Farbetter.me Server" \
  -Dsonar.projectVersion=0.01 \
  -Dsonar.sources=app \
  -Dsonar.language=js \
  -Dsonar.sourceEncoding=UTF-8
fi

sonar-runner \
  -Dsonar.projectKey=fbm:fbm-webapp \
  -Dsonar.projectName="Farbetter.me WebApp" \
  -Dsonar.projectVersion=0.01 \
  -Dsonar.sources=public \
  -Dsonar.language=js \
  -Dsonar.sourceEncoding=UTF-8 \
  -Dsonar.exclusions=js/lib/**/*.js,test/lib/**/*.js

