#!/bin/bash

set -e

if [ "$1" == "backup" ]; then
  pg_dump -U postgres -h localhost -p 5432 -Fc aetherlux -f aetherlux_backup.dump
  echo "Backup completed: aetherlux_backup.dump"
elif [ "$1" == "restore" ]; then
  if [ -z "$2" ]; then
    echo "Usage: $0 restore <backup-file>"
    exit 1
  fi
  pg_restore -U postgres -h localhost -p 5432 -d aetherlux --clean --if-exists "$2"
  echo "Restore completed from: $2"
else
  echo "Usage: $0 <backup|restore> [file]"
  exit 1
fi
