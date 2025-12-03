#!/bin/bash

echo "💾 Creating database backup..."

# Create backup directory if it doesn't exist
mkdir -p backups

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/brand_orders_backup_$TIMESTAMP.sql"

# Create database backup
pg_dump $DATABASE_URL > $BACKUP_FILE

echo "✅ Database backup created: $BACKUP_FILE"