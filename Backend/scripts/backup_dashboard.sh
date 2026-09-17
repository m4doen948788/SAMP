#!/bin/bash
# ============================================================
#  SAMP DASHBOARD - GFS Backup Rotation Script
#  Backs up: MySQL Database & Uploaded Document Files
#  Rotation: 7 Days Daily, 4 Weeks Weekly, 12 Months Monthly
# ============================================================

set -e

# Configuration Paths
BACKUP_DIR="/home/ppm/backups"
UPLOADS_DIR="/home/ppm/uploads-ppm"
ENV_FILE="/var/www/dashboard-ppm/Backend/.env"

# Create backup directories if they don't exist
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

# Load database credentials from .env file
if [ -f "$ENV_FILE" ]; then
    # Export variables from .env, ignoring comments and empty lines
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
else
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Define database backup params (fallback to env defaults)
DB_HOST=${DB_HOST:-"localhost"}
DB_USER=${DB_USER:-"root"}
DB_PASS=${DB_PASSWORD:-""}
DB_NAME=${DB_NAME:-"dashboard_ppm"}

# Timestamp format
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")
TEMP_SQL="/tmp/db_backup_${TIMESTAMP}.sql"
BACKUP_FILENAME="dashboard_backup_${TIMESTAMP}.tar.gz"
TEMP_BACKUP_PATH="/tmp/$BACKUP_FILENAME"

echo "⏳ Starting database backup for '$DB_NAME'..."
if [ -z "$DB_PASS" ]; then
    mysqldump --no-tablespaces -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" > "$TEMP_SQL"
else
    mysqldump --no-tablespaces -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$TEMP_SQL"
fi
echo "✅ Database backup created at $TEMP_SQL"

echo "⏳ Packaging files and database dump into compressed archive..."
# Create archive containing the sql dump and the uploads directory
tar -czf "$TEMP_BACKUP_PATH" -C "$UPLOADS_DIR" . -C /tmp "db_backup_${TIMESTAMP}.sql"
echo "✅ Compressed archive created at $TEMP_BACKUP_PATH"

# Clean up temp SQL file
rm -f "$TEMP_SQL"

# --- GFS ROTATION COPYING ---

# 1. Save to Daily folder (Always)
echo "💾 Saving to Daily backup folder..."
cp "$TEMP_BACKUP_PATH" "$BACKUP_DIR/daily/$BACKUP_FILENAME"

# 2. Save to Weekly folder if today is Sunday (day 7 of the week)
DAY_OF_WEEK=$(date "+%u")
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    echo "💾 Today is Sunday. Saving to Weekly backup folder..."
    cp "$TEMP_BACKUP_PATH" "$BACKUP_DIR/weekly/$BACKUP_FILENAME"
fi

# 3. Save to Monthly folder if today is the 1st of the month
DAY_OF_MONTH=$(date "+%d")
if [ "$DAY_OF_MONTH" -eq "01" ]; then
    echo "💾 Today is the 1st of the month. Saving to Monthly backup folder..."
    cp "$TEMP_BACKUP_PATH" "$BACKUP_DIR/monthly/$BACKUP_FILENAME"
fi

# Clean up temporary archive
rm -f "$TEMP_BACKUP_PATH"

# --- ROTATION PRUNING (CLEAN UP OLD FILES) ---

echo "🧹 Cleaning up expired backups..."

# Keep daily backups for 7 days
find "$BACKUP_DIR/daily" -type f -name "*.tar.gz" -mtime +7 -delete

# Keep weekly backups for 28 days (4 weeks)
find "$BACKUP_DIR/weekly" -type f -name "*.tar.gz" -mtime +28 -delete

# Keep monthly backups for 365 days (12 months)
find "$BACKUP_DIR/monthly" -type f -name "*.tar.gz" -mtime +365 -delete

echo "🎉 Backup rotation completed successfully at $(date '+%Y-%m-%d %H:%M:%S')!"
