#!/usr/bin/env sh

npm run build

cd docs/.vuepress/dist

git init
git add -A
git commit -m "deploy"
git add  