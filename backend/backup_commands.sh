#!/bin/bash
# Butlr Backup Script - Created $(date)
# NICHT AUTOMATISCH AUSFÜHREN - Manuell prüfen!

echo "🔍 Butlr Backup Script"
echo "====================="
echo "Dieser Script erstellt Backups von DB und Code"
echo ""

# Variablen
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/butlr-backups/${BACKUP_DATE}"

# Backup-Verzeichnis erstellen
echo "1. Erstelle Backup-Verzeichnis: ${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}"

# Database Backup
echo "2. Database Backup..."
PGPASSWORD=butlr_secret_2026 pg_dump -h 127.0.0.1 -U butlr butlr > "${BACKUP_DIR}/butlr_db_${BACKUP_DATE}.sql"

# Code Backup
echo "3. Code Backup..."
tar -czf "${BACKUP_DIR}/butlr-backend_${BACKUP_DATE}.tar.gz" -C /root butlr-backend/
tar -czf "${BACKUP_DIR}/butlr-dashboard_${BACKUP_DATE}.tar.gz" -C /root butlr-dashboard/
tar -czf "${BACKUP_DIR}/butlr-portal_${BACKUP_DATE}.tar.gz" -C /root butlr-portal/

# PM2 Config Backup
echo "4. PM2 Config Backup..."
pm2 save
cp ~/.pm2/dump.pm2 "${BACKUP_DIR}/pm2_dump_${BACKUP_DATE}.pm2"

echo ""
echo "✅ Backup komplett in: ${BACKUP_DIR}"
echo ""
echo "Restore-Befehle:"
echo "================="
echo "# Database restore:"
echo "PGPASSWORD=butlr_secret_2026 psql -h 127.0.0.1 -U butlr butlr < ${BACKUP_DIR}/butlr_db_${BACKUP_DATE}.sql"
echo ""
echo "# Code restore:"
echo "tar -xzf ${BACKUP_DIR}/butlr-backend_${BACKUP_DATE}.tar.gz -C /root"