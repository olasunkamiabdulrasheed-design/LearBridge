#!/usr/bin/env bash
# Render build script for the LearnBridge API.
# Runs on every deploy: install deps, collect static, apply migrations.
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Optional: load demo data on a fresh database. Uncomment to auto-seed.
# python manage.py seed_demo
