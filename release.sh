#!/bin/bash

webpack

cp -rvf src/index.html dist/
cp -rvf src/syncid.js dist/
cp -rvf src/jquery.js dist/
cp -rvf src/materialize.js dist/
cp -rvf src/remark-latest.min.js dist/

cp -rvf src/slides.json dist/
mkdir dist/slides
cp -rvf src/slides/* dist/slides
