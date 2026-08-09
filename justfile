# TunaOS local task surface for Mariner.
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

install:
    corepack pnpm install --frozen-lockfile

check: typecheck

typecheck:
    corepack pnpm run typecheck

run:
    corepack pnpm start
