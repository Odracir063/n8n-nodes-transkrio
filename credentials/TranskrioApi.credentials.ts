import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TranskrioApi implements ICredentialType {
	name = 'transkrioApi';

	displayName = 'Transkrio API';

	documentationUrl = 'https://transkrio.com/docs';

	icon = { light: 'file:transkrio.svg', dark: 'file:transkrio.dark.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Your Transkrio API key. Get a free one with 100 credits at https://transkrio.com.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.transkrio.com',
			url: '/v1/usage',
		},
	};
}
