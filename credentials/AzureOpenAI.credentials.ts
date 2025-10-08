import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AzureOpenAI implements ICredentialType {
	name = 'azureOpenAI';
	displayName = 'Azure OpenAI';
	documentationUrl = 'https://learn.microsoft.com/en-us/azure/ai-services/openai/';
	properties: INodeProperties[] = [
		{
			displayName: 'Resource Name',
			name: 'resourceName',
			type: 'string',
			default: '',
			placeholder: 'my-resource-name',
			description: 'The name of your Azure OpenAI resource',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'API key for your Azure OpenAI resource',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			default: '2025-04-01-preview',
			description: 'The API version to use (e.g., 2025-04-01-preview)',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'api-key': '={{$credentials.apiKey}}',
				'Content-Type': 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.resourceName}}.openai.azure.com/openai/v1',
			url: '/models',
			method: 'GET',
		},
	};
}

