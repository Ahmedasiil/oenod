#!/bin/sh
# Vercel build: bring the database up to date, optionally load starter data, then build.
set -e
prisma migrate deploy
# Plans, platform switches and Academy courses are safe to re-run. Set SEED_ON_BUILD=true
# for a demo site; leave it unset in production once real customers are on the platform.
if [ "$SEED_ON_BUILD" = "true" ]; then tsx prisma/seed.ts; fi
next build
