name: Pi - basic deploy

 ## TURNED OFF - THIS WAS AN INTIAL TEST

# on:
#   push:
#     branches: [ main ]    # run whenever you push to main

jobs:
  deploy:
    # Use the labels your runner shows in Settings → Actions → Runners.
    # At minimum keep "self-hosted". Add others if you set them.
    runs-on: [ self-hosted ]  # e.g., [self-hosted, Linux, ARM64, pi]

    steps:
      - name: Check out code
        uses: actions/checkout@v4

      - name: Show where we are (debug)
        run: |
          hostname
          uname -a
          echo "Workspace: $GITHUB_WORKSPACE"
          ls -la

      # Simple: sync repo into your app dir (make sure it exists & is owned by the runner user)
      - name: Sync to /opt/myapp
        run: |
          mkdir -p /opt/myapp
          rsync -az --delete --exclude '.git' "$GITHUB_WORKSPACE/" /opt/myapp/