import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

/**
 * Parse the response from the API and structure it for n8n workflows
 */
function parseResponseOutput(responseData: IDataObject): IDataObject {
	const output: IDataObject = {
		responseId: responseData.id,
		status: responseData.status,
		outputText: responseData.output_text || '',
		messages: [],
		toolCalls: [],
		imageResults: [],
		fullResponse: responseData,
		usage: responseData.usage || {},
	};

	// Parse output array
	if (Array.isArray(responseData.output)) {
		for (const item of responseData.output) {
			if (item.type === 'message') {
				(output.messages as IDataObject[]).push(item);
			} else if (item.type === 'function_call' || item.type === 'tool_call') {
				(output.toolCalls as IDataObject[]).push(item);
			} else if (item.type === 'image_generation_call') {
				(output.imageResults as IDataObject[]).push(item);
			}
		}
	}

	// Add reasoning if present
	if (responseData.reasoning) {
		output.reasoning = responseData.reasoning;
	}

	// Add metadata
	if (responseData.metadata) {
		output.metadata = responseData.metadata;
	}

	// Add error if present
	if (responseData.error) {
		output.error = responseData.error;
	}

	return output;
}

export class AzureOpenAIResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Azure OpenAI Response',
		name: 'azureOpenAIResponse',
		icon: 'file:azureopenai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["model"] + " @ " + $credentials.azureOpenAI.resourceName}}',
		description: 'Use Azure OpenAI Response API for stateful conversations',
		defaults: {
			name: 'Azure OpenAI Response',
		},
		inputs: ['main'],
		outputs: [
			{
				displayName: 'Message',
				type: 'main',
			},
			{
				displayName: 'Tool',
				type: 'main',
			},
			{
				displayName: 'Response',
				type: 'main',
			},
		],
		outputNames: ['Message', 'Tool', 'Response'],
		credentials: [
			{
				name: 'azureOpenAI',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				required: true,
				default: 'gpt-4.1-mini',
				description: 'The deployment name of the model to use (e.g., gpt-4.1-mini, gpt-4o, o3-mini)',
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				required: true,
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 4,
				},
				description: 'The input for the model. Can be a string, {{ $json.messages }}, or a message array',
				placeholder: 'Enter text or {{ $json.messages }}',
			},
			{
				displayName: 'Tools (Dynamic)',
				name: 'dynamicTools',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 4,
				},
				description: 'Optional tools/functions from external source (e.g., webhook). Can be JSON string or use expressions like {{ $json.tools }}',
				placeholder: '{{ $json.tools }} or paste JSON array',
			},

			// Conversation & State
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Instructions',
						name: 'instructions',
						type: 'string',
						default: '',
						typeOptions: {
							rows: 3,
						},
						description: 'System instructions for the assistant',
					},
					{
						displayName: 'Previous Response ID',
						name: 'previous_response_id',
						type: 'string',
						default: '',
						description: 'The ID of a previous response to continue the conversation',
					},
					{
						displayName: 'Store Conversation',
						name: 'store',
						type: 'boolean',
						default: true,
						description: 'Whether to store the conversation history for stateful interactions',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Custom metadata as JSON key-value pairs',
					},

					// Output Control
					{
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 1.0,
						typeOptions: {
							minValue: 0,
							maxValue: 2,
							numberPrecision: 1,
						},
						description: 'Controls randomness in the output (0-2)',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 1.0,
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						description: 'Nucleus sampling: limits token selection to top probability mass',
					},
					{
						displayName: 'Max Output Tokens',
						name: 'max_output_tokens',
						type: 'number',
						default: 0,
						description: 'Maximum tokens in the response (0 for model default)',
					},

					// Reasoning Models
					{
						displayName: 'Reasoning Effort',
						name: 'reasoning_effort',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
							},
							{
								name: 'Medium',
								value: 'medium',
							},
							{
								name: 'High',
								value: 'high',
							},
						],
						default: 'medium',
						description: 'The effort level for reasoning models (o1, o3, o4 series)',
					},

					// Advanced
					{
						displayName: 'Background Mode',
						name: 'background',
						type: 'boolean',
						default: false,
						description: 'Whether to run the request asynchronously (useful for long-running tasks)',
					},
					{
						displayName: 'Stream',
						name: 'stream',
						type: 'boolean',
						default: false,
						description: 'Whether to stream the response (requires streaming handling)',
					},
					{
						displayName: 'Include Fields',
						name: 'include',
						type: 'multiOptions',
						options: [
							{
								name: 'Reasoning Encrypted Content',
								value: 'reasoning.encrypted_content',
							},
						],
						default: [],
						description: 'Additional fields to include in the response',
					},
				],
			},

			// Tools Configuration
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'fixedCollection',
				placeholder: 'Add Tool',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Built-in Tools',
						name: 'builtInTools',
						values: [
							{
								displayName: 'Tool Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Code Interpreter',
										value: 'code_interpreter',
										description: 'Execute Python code in a sandboxed environment',
									},
									{
										name: 'File Search',
										value: 'file_search',
										description: 'Search through uploaded files',
									},
									{
										name: 'Image Generation',
										value: 'image_generation',
										description: 'Generate images using DALL-E',
									},
								],
								default: 'code_interpreter',
							},
						],
					},
					{
						displayName: 'Custom Functions',
						name: 'customFunctions',
						values: [
							{
								displayName: 'Function Definition (JSON)',
								name: 'function',
								type: 'json',
								default: '{\n  "name": "function_name",\n  "description": "Function description",\n  "parameters": {\n    "type": "object",\n    "properties": {},\n    "required": []\n  }\n}',
								description: 'Function definition in JSON format',
							},
						],
					},
				],
			},

			// Tool Choice
			{
				displayName: 'Tool Options',
				name: 'toolOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Tool Choice',
						name: 'tool_choice',
						type: 'options',
						options: [
							{
								name: 'Auto',
								value: 'auto',
								description: 'Let the model decide',
							},
							{
								name: 'Required',
								value: 'required',
								description: 'Force the model to use a tool',
							},
							{
								name: 'None',
								value: 'none',
								description: 'Do not use any tools',
							},
						],
						default: 'auto',
						description: 'How the model should use tools',
					},
					{
						displayName: 'Parallel Tool Calls',
						name: 'parallel_tool_calls',
						type: 'boolean',
						default: true,
						description: 'Whether to allow parallel tool calls',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const messageOutput: INodeExecutionData[] = [];
		const toolOutput: INodeExecutionData[] = [];
		const responseOutput: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('azureOpenAI');

		const resourceName = credentials.resourceName as string;
		const apiKey = credentials.apiKey as string;
		const apiVersion = (credentials.apiVersion as string) || '2025-04-01-preview';

		const baseUrl = `https://${resourceName}.openai.azure.com/openai/v1`;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				// Build the request body
				const model = this.getNodeParameter('model', itemIndex) as string;
				let input = this.getNodeParameter('input', itemIndex) as string | IDataObject | IDataObject[];
				const dynamicTools = this.getNodeParameter('dynamicTools', itemIndex, '') as string | IDataObject | IDataObject[];
				const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
				const tools = this.getNodeParameter('tools', itemIndex, {}) as IDataObject;
				const toolOptions = this.getNodeParameter('toolOptions', itemIndex, {}) as IDataObject;

				// Validate required fields
				if (!model || model.trim() === '') {
					throw new NodeOperationError(
						this.getNode(),
						'Model deployment name is required',
						{ itemIndex },
					);
				}

				// Parse and validate input
				if (!input) {
					throw new NodeOperationError(
						this.getNode(),
						'Input is required. Please provide text or a message array for the model to process.',
						{ itemIndex },
					);
				}

				// Handle string input that might be JSON
				if (typeof input === 'string') {
					const trimmedInput = input.trim();
					if (trimmedInput === '') {
						throw new NodeOperationError(
							this.getNode(),
							'Input cannot be empty. Please provide text or a message array for the model to process.',
							{ itemIndex },
						);
					}
					// Try to parse if it looks like JSON
					if (trimmedInput.startsWith('[') || trimmedInput.startsWith('{')) {
						try {
							input = JSON.parse(trimmedInput);
						} catch {
							// Not valid JSON, keep as string
							input = trimmedInput;
						}
					} else {
						input = trimmedInput;
					}
				}

				// Validate message array format if it's an array
				if (Array.isArray(input)) {
					for (const msg of input) {
						if (!msg.role || !msg.content) {
							throw new NodeOperationError(
								this.getNode(),
								'Invalid message format. Each message must have "role" and "content" fields.',
								{ itemIndex },
							);
						}
					}
				}

				const body: IDataObject = {
					model,
					input,
				};

				// Add additional fields
				if (additionalFields.instructions) {
					body.instructions = additionalFields.instructions;
				}
				if (additionalFields.previous_response_id) {
					body.previous_response_id = additionalFields.previous_response_id;
				}
				if (additionalFields.store !== undefined) {
					body.store = additionalFields.store;
				}
				if (additionalFields.metadata) {
					try {
						body.metadata = typeof additionalFields.metadata === 'string'
							? JSON.parse(additionalFields.metadata as string)
							: additionalFields.metadata;
					} catch (error) {
						throw new NodeOperationError(this.getNode(), 'Invalid JSON in metadata field', {
							itemIndex,
						});
					}
				}
				if (additionalFields.temperature !== undefined) {
					body.temperature = additionalFields.temperature;
				}
				if (additionalFields.top_p !== undefined) {
					body.top_p = additionalFields.top_p;
				}
				if (additionalFields.max_output_tokens && additionalFields.max_output_tokens !== 0) {
					body.max_output_tokens = additionalFields.max_output_tokens;
				}
				if (additionalFields.reasoning_effort) {
					body.reasoning = {
						effort: additionalFields.reasoning_effort,
					};
				}
				if (additionalFields.background) {
					body.background = additionalFields.background;
				}
				if (additionalFields.stream) {
					body.stream = additionalFields.stream;
				}
				if (additionalFields.include && Array.isArray(additionalFields.include) && additionalFields.include.length > 0) {
					body.include = additionalFields.include;
				}

				// Build tools array
				const toolsArray: IDataObject[] = [];
				
				// First, check for dynamic tools from webhook/external source
				if (dynamicTools) {
					let parsedDynamicTools: IDataObject[] | undefined;
					
					// Parse dynamic tools if it's a string
					if (typeof dynamicTools === 'string') {
						const trimmed = dynamicTools.trim();
						if (trimmed !== '') {
							try {
								parsedDynamicTools = JSON.parse(trimmed);
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									'Invalid JSON in dynamic tools field',
									{ itemIndex },
								);
							}
						}
					} else if (Array.isArray(dynamicTools)) {
						parsedDynamicTools = dynamicTools as IDataObject[];
					} else if (typeof dynamicTools === 'object') {
						// Single tool object, wrap in array
						parsedDynamicTools = [dynamicTools as IDataObject];
					}
					
					// Add dynamic tools to array
					if (parsedDynamicTools && Array.isArray(parsedDynamicTools)) {
						for (const tool of parsedDynamicTools) {
							// Handle different formats
							if (tool.type === 'function' && tool.function) {
								// Already in correct format: {type: "function", function: {...}}
								toolsArray.push(tool);
							} else if (tool.name && tool.parameters) {
								// Just the function definition: {name: "...", parameters: {...}}
								toolsArray.push({
									type: 'function',
									function: tool,
								});
							} else {
								toolsArray.push(tool);
							}
						}
					}
				}
				
				// Then add UI-configured tools
				if (tools.builtInTools && Array.isArray(tools.builtInTools)) {
					for (const builtInTool of tools.builtInTools as IDataObject[]) {
						toolsArray.push({ type: builtInTool.type });
					}
				}
				if (tools.customFunctions && Array.isArray(tools.customFunctions)) {
					for (const customFunction of tools.customFunctions as IDataObject[]) {
						try {
							const functionDef = typeof customFunction.function === 'string'
								? JSON.parse(customFunction.function as string)
								: customFunction.function;
							toolsArray.push({
								type: 'function',
								function: functionDef,
							});
						} catch (error) {
							throw new NodeOperationError(this.getNode(), 'Invalid JSON in function definition', {
								itemIndex,
							});
						}
					}
				}
				
				if (toolsArray.length > 0) {
					body.tools = toolsArray;
				}

				// Add tool options
				if (toolOptions.tool_choice) {
					body.tool_choice = toolOptions.tool_choice;
				}
				if (toolOptions.parallel_tool_calls !== undefined) {
					body.parallel_tool_calls = toolOptions.parallel_tool_calls;
				}

				// Make the API request
				const options: IHttpRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${baseUrl}/responses`,
					headers: {
						'api-key': apiKey,
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				};

				const responseData = await this.helpers.httpRequest(options);

				// Parse and structure the output
				const output = parseResponseOutput(responseData);
				
				// Always send to Response output (output 2) - full response
				responseOutput.push({
					json: output,
					pairedItem: { item: itemIndex },
				});
				
				// Route to appropriate output based on content
				const hasToolCalls = Array.isArray(output.toolCalls) && output.toolCalls.length > 0;
				const hasMessages = Array.isArray(output.messages) && output.messages.length > 0;
				
				if (hasToolCalls) {
					// Send to Tool output (output 1)
					toolOutput.push({
						json: output,
						pairedItem: { item: itemIndex },
					});
				}
				
				if (hasMessages || !hasToolCalls) {
					// Send to Message output (output 0) - also send here if no tool calls
					messageOutput.push({
						json: output,
						pairedItem: { item: itemIndex },
					});
				}

			} catch (error) {
				// Handle errors with better messaging
				let errorMessage = 'An error occurred';
				let errorDetails: IDataObject = {};

				if (error instanceof NodeOperationError) {
					// Already a well-formatted node error, just throw it
					if (this.continueOnFail()) {
						messageOutput.push({
							json: {
								error: error.message,
								errorDetails: error.description || {},
							},
							pairedItem: { item: itemIndex },
						});
						continue;
					}
					throw error;
				}

				// Handle API errors
				if (typeof error === 'object' && error !== null && 'response' in error) {
					const apiError = error as { response?: { status?: number; data?: any } };
					const statusCode = apiError.response?.status;
					const errorBody = apiError.response?.data;

					// Extract Azure OpenAI error details
					if (errorBody?.error) {
						errorMessage = errorBody.error.message || errorMessage;
						errorDetails = {
							code: errorBody.error.code,
							type: errorBody.error.type,
							statusCode,
						};
					} else if (statusCode) {
						errorMessage = `Azure OpenAI API error (${statusCode})`;
						errorDetails = { statusCode };
					}

					// Provide helpful hints for common errors
					if (statusCode === 400) {
						errorMessage = `Bad Request: ${errorMessage}. Please check your input parameters.`;
					} else if (statusCode === 401) {
						errorMessage = 'Authentication failed. Please check your API key in credentials.';
					} else if (statusCode === 404) {
						errorMessage = `Model deployment '${this.getNodeParameter('model', itemIndex)}' not found. Please check the deployment name.`;
					} else if (statusCode === 429) {
						errorMessage = 'Rate limit exceeded. Please wait and try again.';
					} else if (statusCode && statusCode >= 500) {
						errorMessage = 'Azure OpenAI service error. Please try again later.';
					}
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}

				if (this.continueOnFail()) {
					const errorOutput = {
						json: {
							error: errorMessage,
							errorDetails,
						},
						pairedItem: { item: itemIndex },
					};
					// Send errors to all outputs
					messageOutput.push(errorOutput);
					responseOutput.push(errorOutput);
					continue;
				}

				// Throw a user-friendly error
				throw new NodeOperationError(
					this.getNode(),
					errorMessage,
					{
						itemIndex,
						description: JSON.stringify(errorDetails),
					},
				);
			}
		}

		// Return all three outputs: [Message, Tool, Response]
		return [messageOutput, toolOutput, responseOutput];
	}
}

