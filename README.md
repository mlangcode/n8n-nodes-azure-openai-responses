# n8n-nodes-azure-openai-responses

This is an n8n community node that integrates the **Azure OpenAI Response API** into your n8n workflows.

The Response API is a new stateful API from Azure OpenAI that combines the best capabilities from chat completions and assistants APIs in one unified experience. It supports advanced features like stateful conversations, tool calling, reasoning models (o1, o3, o4 series), background processing, and more.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Disclaimer

This is an unofficial community node and is not affiliated with, endorsed by, or supported by Microsoft Corporation or n8n GmbH.

Azure, Azure OpenAI, and related trademarks are property of Microsoft Corporation. Users must comply with Microsoft's Azure OpenAI Service terms and conditions.

This package is provided "as is" under the MIT License without warranty of any kind.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Credentials](#credentials)
- [Usage](#usage)
- [Parameters](#parameters)
- [Multiple Outputs](#multiple-outputs)
- [Examples](#examples)
- [Resources](#resources)
- [Version History](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### npm

```bash
npm install n8n-nodes-azure-openai-responses
```

### Manual Installation (Development)

```bash
# Clone this repository
git clone https://github.com/mlangcode/n8n-nodes-azure-openai-responses.git
cd n8n-nodes-azure-openai-responses

# Install dependencies and build
npm install
npm run build

# Link to your local n8n
npm link
cd ~/.n8n
npm link n8n-nodes-azure-openai-responses

# Restart n8n
```

## Features

✅ **Simple & Focused**: Single operation (Create Response) - no unnecessary complexity  
✅ **Multiple Outputs**: Separate outputs for messages, tool calls, and full responses  
✅ **Agent-Ready**: Route tool calls to functions and return results seamlessly  
✅ **Flexible Input**: Accept strings, message arrays, or webhook data  
✅ **Dynamic Tools**: Pass tool definitions from webhooks or external sources  
✅ **Stateful Conversations**: Multi-turn conversations with automatic context  
✅ **Built-in Tools**: Code interpreter, file search, image generation  
✅ **Reasoning Models**: Support for o1, o3, o4 series with configurable effort  
✅ **Error Handling**: Comprehensive error messages and validation  
✅ **Long-Running Requests**: Handles reasoning models (n8n supports up to 1 hour timeout)  

## Credentials

This node uses Azure OpenAI credentials with the following fields:

- **Resource Name**: Your Azure OpenAI resource name (e.g., `my-resource-name`)
- **API Key**: Your Azure OpenAI API key
- **API Version**: The API version to use (default: `2025-04-01-preview`)

The base URL is automatically constructed as: `https://{resourceName}.openai.azure.com/openai/v1`

### Setting Up Credentials

1. In n8n, go to **Credentials** → **New**
2. Search for "Azure OpenAI API"
3. Fill in your resource name and API key
4. Click **Save**

## Usage

### Basic Usage

1. Add the "Azure OpenAI Response" node to your workflow
2. Configure your Azure OpenAI credentials
3. Set the model deployment name (e.g., `gpt-4.1-mini`)
4. Enter your input/prompt
5. Configure additional parameters as needed

The node subtitle will display: **`Model (Model Name) on Resource (Resource Name)`** for easy identification.

### Stateful Conversations

To continue a multi-turn conversation:

1. Store the `responseId` from the previous response
2. In the next request, set `Previous Response ID` in Additional Fields
3. The API will maintain conversation context automatically

## Parameters

### Required Parameters

- **Model**: The deployment name of your model (e.g., `gpt-4.1-mini`, `gpt-4o`, `o3-mini`)
- **Input**: The input for the model
  - String: `"Tell me a joke"`
  - Expression: `{{ $json.messages }}`
  - Message array: `[{"role": "user", "content": "Hello"}]`

### Tools (Dynamic)

Pass tool definitions from webhooks or external sources!

**Format Options:**

1. **Full OpenAI format:**
```json
[
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get current weather",
      "parameters": {
        "type": "object",
        "properties": {
          "city": {"type": "string"}
        },
        "required": ["city"]
      }
    }
  }
]
```

2. **Just function definitions** (auto-wrapped):
```json
[
  {
    "name": "get_weather",
    "description": "Get current weather",
    "parameters": {...}
  }
]
```

3. **Using expressions:**
```
{{ $json.tools }}
```

**Use Case**: When building conversational AI agents that receive tool definitions dynamically from webhooks or API calls.

### Additional Fields

#### Conversation & State

- **Instructions**: System instructions for the assistant (similar to system messages)
- **Previous Response ID**: Continue from a previous response for stateful conversations
- **Store Conversation**: Whether to store conversation history (default: true)
- **Metadata**: Custom JSON metadata for tracking

#### Output Control

- **Temperature** (0-2): Controls randomness in outputs (default: 1.0)
- **Top P** (0-1): Nucleus sampling parameter (default: 1.0)
- **Max Output Tokens**: Maximum tokens in response (0 for model default)

#### Reasoning Models (o1, o3, o4 series)

- **Reasoning Effort**: Choose between `low`, `medium`, or `high` (default: medium)
  - Higher effort provides more thorough reasoning but takes longer
  - Reasoning models may take several minutes to respond

#### Advanced Options

- **Background Mode**: Run the request asynchronously (requires polling - advanced use)
- **Stream**: Enable streaming responses (not recommended for standard workflows)
- **Include Fields**: Additional fields to include (e.g., `reasoning.encrypted_content`)

### Tools Configuration

#### Built-in Tools

Select from the dropdown:
- **Code Interpreter**: Execute Python code in a sandboxed environment
- **File Search**: Search through uploaded files
- **Image Generation**: Generate images using DALL-E

#### Custom Functions

Define custom functions using JSON format:

```json
{
  "name": "get_weather",
  "description": "Get the current weather for a location",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name"
      }
    },
    "required": ["location"]
  }
}
```

### Tool Options

- **Tool Choice**: Control how tools are used
  - `auto`: Let the model decide (default)
  - `required`: Force the model to use a tool
  - `none`: Don't use any tools
- **Parallel Tool Calls**: Allow multiple tools to be called simultaneously (default: true)

## Multiple Outputs

The node has **three outputs** for flexible workflow routing:

### Output 0: Messages 💬
**When:** Model returns a text/message response  
**Contains:** Formatted message data

```json
{
  "responseId": "resp_123",
  "outputText": "The answer is 42",
  "messages": [
    {
      "id": "msg_123",
      "role": "assistant",
      "content": [{"type": "output_text", "text": "The answer is 42"}]
    }
  ],
  "usage": {...}
}
```

### Output 1: Tools 🔧
**When:** Model requests tool/function calls  
**Contains:** Tool call definitions

```json
{
  "responseId": "resp_123",
  "toolCalls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\":\"London\"}"
      }
    }
  ]
}
```

**Use this to:**
- Route to function execution nodes
- Execute the requested tools
- Return results back to the AI

### Output 2: Full Response 📄
**Always active** - Contains the complete API response

```json
{
  "responseId": "resp_123",
  "status": "completed",
  "outputText": "...",
  "messages": [...],
  "toolCalls": [...],
  "fullResponse": {
    "id": "resp_123",
    "model": "gpt-4.1-mini",
    "output": [...],
    "usage": {...},
    // ... complete API response
  },
  "usage": {...}
}
```

**Use this when:**
- You need to pass the entire response to another application
- Debugging/logging full API responses
- Accessing raw response fields not exposed in other outputs

### Error Handling

When errors occur (and "Continue on Fail" is enabled):
- Error details are sent to **Output 2** (Full Response)
- Includes HTTP status codes and error messages
- Workflow continues instead of stopping

## Examples

### Example 1: Simple Text Generation

```
Model: gpt-4.1-mini
Input: "Explain quantum computing in simple terms"
```

**Output:** Goes to Output 0 (Messages)

---

### Example 2: Stateful Conversation

**First Request:**
```
Model: gpt-4.1-mini
Input: "What is the capital of France?"
```

**Second Request (using responseId from first):**
```
Model: gpt-4.1-mini
Input: "What is its population?"
Additional Fields > Previous Response ID: {{ $json.responseId }}
```

---

### Example 3: Agent with Tool Calling

**Workflow:**

```
[Webhook Trigger]
  Receives: {
    "messages": [{"role": "user", "content": "What's the weather in Paris?"}],
    "tools": [{"name": "get_weather", "parameters": {...}}]
  }
    ↓
[Azure OpenAI Response Node]
  Input: {{ $json.messages }}
  Tools (Dynamic): {{ $json.tools }}
    ↓
  Output 1 (Tools) ──→ [HTTP Request: Call Weather API]
    ↓
  Return result to AI with responseId
```

---

### Example 4: Reasoning Model

```
Model: o3-mini
Input: "Solve this logic puzzle: If all A are B, and some B are C, what can we conclude about A and C?"
Additional Fields > Reasoning Effort: high
```

**Note:** May take 1-3 minutes for complex reasoning.

---

### Example 5: Dynamic Tools from Webhook

**Webhook Body:**
```json
{
  "user_message": "Book a flight to Tokyo",
  "available_functions": [
    {
      "type": "function",
      "function": {
        "name": "search_flights",
        "description": "Search for flights",
        "parameters": {
          "type": "object",
          "properties": {
            "destination": {"type": "string"},
            "date": {"type": "string"}
          }
        }
      }
    }
  ]
}
```

**Node Configuration:**
```
Input: {{ $json.user_message }}
Tools (Dynamic): {{ $json.available_functions }}
```

---

### Example 6: Code Interpreter

```
Model: gpt-4o
Input: "Create a bar chart showing sales data: Jan 100, Feb 150, Mar 200"
Tools > Built-in Tools > Tool Type: Code Interpreter
```

**Output:** Code execution results in Output 1 (Tools)

---

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Azure OpenAI Response API documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/responses)
- [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

## Compatibility

- Requires n8n version 1.60.0 or later
- Compatible with all Azure OpenAI Response API supported models
- Supported regions: australiaeast, eastus, eastus2, francecentral, japaneast, norwayeast, polandcentral, southindia, swedencentral, switzerlandnorth, uaenorth, uksouth, westus, westus3

## Supported Models

The Response API supports the following model families:

- **GPT-4.1 Series**: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`
- **GPT-4o Series**: `gpt-4o`, `gpt-4o-mini`
- **GPT-5 Series**: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-chat`, `gpt-5-codex`
- **o-Series (Reasoning)**: `o1`, `o3`, `o3-mini`, `o4-mini`
- **Image Generation**: `gpt-image-1`
- **Computer Use**: `computer-use-preview`

Note: Not all models are available in all regions. Check the [Azure OpenAI models page](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models) for regional availability.

## Limitations

- Web search tool is not currently supported by Azure OpenAI Response API
- Image generation with multi-turn editing and streaming is coming soon
- Images cannot be uploaded as files and referenced as input (coming soon)
- PDF input is supported, but setting file upload purpose to `user_data` is not yet supported
- Background mode may have higher latency initially

## Troubleshooting

### "Model not found" error
- Verify your deployment name matches exactly
- Ensure the model is deployed in your Azure OpenAI resource

### "Invalid API key" error
- Check that your API key is correct
- Verify the resource name is correct

### "Input is required" error
- Ensure the Input field is not empty
- If using expressions, verify they resolve to a value

### "Unexpected end of JSON input"
- Use `string` type fields (Input, Tools Dynamic) with expressions like `{{ $json.messages }}`
- Don't leave JSON type fields with invalid JSON

### Reasoning models taking too long
- Reasoning models (o1, o3, o4) can take 1-5 minutes
- n8n workflow timeout default is 1 hour (sufficient for most cases)
- Consider setting reasoning effort to "low" or "medium" for faster responses

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE.md)

## Version History

### 1.0.0
- Initial release with streamlined single operation (Create Response)
- Three outputs: Messages, Tool Calls, and Full Response
- Support for dynamic tool definitions from webhooks
- Flexible input handling (strings, message arrays, expressions)
- Comprehensive error handling with detailed messages
- Full parameter support including tools, reasoning, and background processing
- Support for stateful conversations
- Built-in tools: code interpreter, file search, image generation
- Subtitle display showing model and resource name

## Author

mlangcode

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/mlangcode/n8n-nodes-azure-openai-responses).
