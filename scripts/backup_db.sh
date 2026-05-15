#!/bin/bash
# ============================================================================
# Transporti V1 — PostgreSQL Automated Backup Script
# ============================================================================
# Usage: ./scripts/backup_db.sh
# Cron:  0 3 * * * /path/to/scripts/backup_db.sh >> /var/log/transporti_backup.log 2>&1
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/transporti}"
DB_CONTAINER="${DB_CONTAINER:-transporti_db}"
DB_USER="${POSTGRES_USER:-transporti}"
DB_NAME="${POSTGRES_DB:-transporti_v1}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/transporti_${TIMESTAMP}.sql.gz"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup: ${DB_NAME} → ${BACKUP_FILE}"

# Dump database (compressed)
docker exec "${DB_CONTAINER}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-privileges \
    --format=custom \
    | gzip > "${BACKUP_FILE}"

# Verify backup size
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
if [ "${BACKUP_SIZE}" -lt 1024 ]; then
    echo "[$(date)] ERROR: Backup file is suspiciously small (${BACKUP_SIZE} bytes). Aborting."
    rm -f "${BACKUP_FILE}"
    exit 1
fi

echo "[$(date)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE} bytes)"

# Cleanup old backups
DELETED=$(find "${BACKUP_DIR}" -name "transporti_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date)] Cleaned up ${DELETED} backups older than ${RETENTION_DAYS} days."

echo "[$(date)] Backup OK ✅"
