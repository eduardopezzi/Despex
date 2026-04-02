#!/bin/bash

SESSION="ocr_project"

# 1. Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null

# 2. Get the directory where THIS script is stored, then go up one level to the repo root
# This makes it portable: it works from /home/rui/... or any other path
BASE_DIR=$(cd -- "$(dirname -- "$0")/.." && pwd)

# 3. Create the session and capture the first Pane ID (Top-Left)
PANE_SERVER=$(tmux new-session -d -s $SESSION -n "Dev" -P -F "#{pane_id}")

# 4. Create the Layout Structure (3 Top, 2 Bottom)
# Split vertically to create the bottom row area
PANE_SEED=$(tmux split-window -v -t $PANE_SERVER -P -F "#{pane_id}")

# Split the top row into 3 columns
PANE_WORKER=$(tmux split-window -h -t $PANE_SERVER -P -F "#{pane_id}")
PANE_CLIENT=$(tmux split-window -h -t $PANE_WORKER -P -F "#{pane_id}")

# Split the bottom row into 2 columns
PANE_UNSEED=$(tmux split-window -h -t $PANE_SEED -P -F "#{pane_id}")

# 5. Send Commands using the dynamic BASE_DIR
# Server, Worker, and Client execute immediately
tmux send-keys -t $PANE_SERVER "cd $BASE_DIR/server && npm run start:dev" C-m
tmux send-keys -t $PANE_WORKER "cd $BASE_DIR/server && npm run start:dev:worker" C-m
tmux send-keys -t $PANE_CLIENT "cd $BASE_DIR/client && npm run start" C-m

# Seed/Unseed - Prepared in the prompt but NOT executed
tmux send-keys -t $PANE_SEED "cd $BASE_DIR/server && npm run seed"
tmux send-keys -t $PANE_UNSEED "cd $BASE_DIR/server && npm run unseed"

# 6. Formatting and Titles
# Use even-vertical to make the top/bottom rows equal height
tmux select-layout -t $SESSION even-vertical

tmux select-pane -t $PANE_SERVER -T "Server"
tmux select-pane -t $PANE_WORKER -T "Worker"
tmux select-pane -t $PANE_CLIENT -T "Client"
tmux select-pane -t $PANE_SEED   -T "Seed"
tmux select-pane -t $PANE_UNSEED -T "Unseed"

# 7. Attach to the session
tmux attach-session -t $SESSION
