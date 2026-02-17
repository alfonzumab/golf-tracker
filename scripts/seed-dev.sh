#!/bin/bash
# seed-dev.sh - Script to set up and seed a Supabase instance with test data for SettleUp Golf app
# Usage: ./seed-dev.sh <SUPABASE_URL> <SUPABASE_SERVICE_KEY>

# Exit on any error
set -e

# Check if required arguments are provided
if [ $# -ne 2 ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required"
  echo "Usage: $0 <SUPABASE_URL> <SUPABASE_SERVICE_KEY>"
  exit 1
fi

SUPABASE_URL="$1"
SUPABASE_SERVICE_KEY="$2"

# Function to run SQL via Supabase REST API
echo "Function to execute SQL on Supabase..."
run_sql() {
  local sql_file=$1
  echo "Running $sql_file..."
  # Read SQL content from file
  sql_content=$(cat "$sql_file")
  # Execute SQL using curl with Supabase REST API
  curl -X POST "$SUPABASE_URL/rest/v1/rpc/run_sql" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": \"$sql_content\"}" \
    -s -f > /dev/null || { echo "Error running $sql_file"; exit 1; }
  echo "Completed $sql_file"
}

# Step 1: Run migration scripts in order
# Note: Due to complexity with running multiple SQL files and potential issues with API limitations,
#       these steps are documented as manual for now. Replace with `run_sql` calls if API supports it.
echo "Step 1: Run migration scripts (manual steps documented below)"
# run_sql "../migration-global-db.sql"
# run_sql "../tournament-schema.sql"
# run_sql "../history-migration.sql"
# run_sql "../player-links-migration.sql"

echo "MANUAL STEP: Please run the following migration scripts in Supabase SQL Editor in order:"
echo "  1. migration-global-db.sql"
echo "  2. tournament-schema.sql"
echo "  3. history-migration.sql"
echo "  4. player-links-migration.sql"
echo "After migrations are complete, press Enter to continue with seeding test data."
read -p "Press Enter to continue..."

# Step 2: Run the seed script to populate test data
echo "Step 2: Seeding test data..."
run_sql "seed-dev.sql"

echo "Setup complete! Supabase instance is now populated with test data for SettleUp Golf app."
echo "Note: The host-user-uuid in seed-dev.sql should be replaced with an actual user UUID for real usage."
