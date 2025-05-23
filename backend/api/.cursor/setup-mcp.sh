#!/bin/bash

# Setup script for Cursor MCP configuration
# This script helps set up the MCP configuration with API keys

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_FILE="$SCRIPT_DIR/mcp.json"
TEMPLATE_FILE="$SCRIPT_DIR/mcp.json.template"

echo "🔧 Setting up Cursor MCP Configuration..."

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Error: mcp.json.template not found in $SCRIPT_DIR"
    exit 1
fi

# Check if mcp.json already exists
if [ -f "$MCP_FILE" ]; then
    echo "⚠️  mcp.json already exists. Do you want to overwrite it? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "ℹ️  Setup cancelled."
        exit 0
    fi
fi

# Copy template
cp "$TEMPLATE_FILE" "$MCP_FILE"
echo "✅ Created mcp.json from template"

echo ""
echo "📝 Next steps:"
echo "1. Edit $MCP_FILE"
echo "2. Replace placeholder values with your actual API keys:"
echo "   - ANTHROPIC_API_KEY: Required for Claude models"
echo "   - OPENAI_API_KEY: Required for OpenAI models"
echo "   - Other keys: Optional, based on your needs"
echo ""
echo "⚠️  SECURITY NOTE: mcp.json is ignored by git to protect your API keys"
echo ""
echo "🎉 Setup complete! The Task Master AI should now work in Cursor." 