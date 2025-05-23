# Cursor MCP Configuration

This directory contains configuration for Cursor's Model Context Protocol (MCP) servers.

## Setup Instructions

1. **Copy the template file:**
   ```bash
   cp mcp.json.template mcp.json
   ```

2. **Add your API keys:**
   Edit `.cursor/mcp.json` and replace the placeholder values with your actual API keys:
   
   - `ANTHROPIC_API_KEY`: Your Anthropic Claude API key
   - `OPENAI_API_KEY`: Your OpenAI API key  
   - `PERPLEXITY_API_KEY`: Your Perplexity API key (optional)
   - `GOOGLE_API_KEY`: Your Google API key (optional)
   - `XAI_API_KEY`: Your xAI API key (optional)
   - `OPENROUTER_API_KEY`: Your OpenRouter API key (optional)
   - `MISTRAL_API_KEY`: Your Mistral API key (optional)
   - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key (optional)
   - `OLLAMA_API_KEY`: Your Ollama API key (optional)

3. **Required Keys:**
   At minimum, you need either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for the Task Master AI to function.

## Security Note

⚠️ **IMPORTANT**: The `mcp.json` file contains API keys and is ignored by git. Never commit API keys to version control!

## Task Master AI

This configuration enables the Task Master AI MCP server which provides project management capabilities through natural language commands. 