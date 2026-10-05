#!/usr/bin/env bash
# Copies the active endpoint specifications from the developer portal's
# content folder into specs/. Retired endpoints are left out.
#
#   tools/update-specs.sh /path/to/portal/content/apis
set -euo pipefail
cd "$(dirname "$0")/.."

source_dir="${1:?Usage: tools/update-specs.sh /path/to/portal/content/apis}"

rm -rf specs
mkdir specs
for file in "$source_dir"/*.json; do
  if ! grep -q '"status": *"retired"' "$file"; then
    cp "$file" specs/
  fi
done
echo "$(ls specs | wc -l | tr -d ' ') specifications in specs/"
