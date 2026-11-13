#!/usr/bin/env bash
# Exit on error
set -o errexit

# Upgrade pip and install production dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static assets into staticfiles/
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate

# Seed verified demo data if database is fresh/empty
python manage.py seed_data --if-empty
