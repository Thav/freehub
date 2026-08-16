#!/usr/bin/env sh
set -eu

attempt=0
until bundle _1.13.1_ exec ruby -e 'require "rake"; Rake.application.init; Rake.application.load_rakefile; Rake.application["db:migrate"].invoke'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo 'legacy database did not become available' >&2
    exit 1
  fi
  sleep 2
done

exec "$@"
