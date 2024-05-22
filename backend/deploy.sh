#!/usr/bin/env bash

cd ./cdk
cdk deploy -c env=dev --require-approval never

