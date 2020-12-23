#!/bin/bash
echo Make sure you "source ./run_tdd.sh"
cd use_cases/MarzV3
nvm use v11.6.0
npm test
