import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const urlField = (operation: string, description: string) => ({
	displayName: 'URL',
	name: 'url',
	type: 'string' as const,
	required: true,
	default: '',
	placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	description,
	displayOptions: { show: { resource: ['video'], operation: [operation] } },
	routing: { send: { type: 'query' as const, property: 'url' } },
});

export class Transkrio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Transkrio',
		name: 'transkrio',
		icon: { light: 'file:transkrio.svg', dark: 'file:transkrio.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description:
			'Get YouTube transcripts, metadata, and playlist or channel videos. Failed requests are free.',
		defaults: { name: 'Transkrio' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'transkrioApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.transkrio.com',
			headers: { Accept: 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Video', value: 'video' },
					{ name: 'Account', value: 'account' },
				],
				default: 'video',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['video'] } },
				options: [
					{
						name: 'Get Transcript',
						value: 'getTranscript',
						action: 'Get the transcript of a video',
						description: 'Full transcript as text plus timestamped segments. 1 credit on success.',
						routing: { request: { method: 'GET', url: '/v1/transcript', qs: { format: 'json' } } },
					},
					{
						name: 'Get Many Transcripts',
						value: 'batch',
						action: 'Get the transcripts of many videos',
						description: 'Up to 50 videos in one call. 1 credit per successful transcript.',
						routing: {
							request: { method: 'POST', url: '/v1/batch' },
							output: {
								postReceive: [{ type: 'rootProperty', properties: { property: 'results' } }],
							},
						},
					},
					{
						name: 'Get Metadata',
						value: 'getMetadata',
						action: 'Get the metadata of a video',
						description:
							'Title, channel, duration, views, upload date and caption languages. 1 credit.',
						routing: { request: { method: 'GET', url: '/v1/metadata' } },
					},
					{
						name: 'List Videos',
						value: 'listVideos',
						action: 'List the videos of a playlist or channel',
						description: 'Videos of a playlist or a channel, newest first for channels. 1 credit.',
						routing: {
							request: { method: 'GET', url: '/v1/videos' },
							output: {
								postReceive: [{ type: 'rootProperty', properties: { property: 'videos' } }],
							},
						},
					},
				],
				default: 'getTranscript',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Usage',
						value: 'getUsage',
						action: 'Get credits left and usage',
						description: 'Plan, credits remaining and usage in the last 30 days. Free.',
						routing: { request: { method: 'GET', url: '/v1/usage' } },
					},
				],
				default: 'getUsage',
			},

			urlField(
				'getTranscript',
				'YouTube video URL (watch, youtu.be, Shorts, live, embed) or 11-character video ID',
			),
			urlField('getMetadata', 'YouTube video URL or 11-character video ID'),
			urlField(
				'listVideos',
				'Playlist URL or ID, channel URL (/@handle, /channel/UC...) or @handle',
			),
			{
				displayName: 'Language',
				name: 'lang',
				type: 'string',
				default: '',
				placeholder: 'en',
				description:
					'ISO language code such as en or es. Leave empty for the language the video is spoken in.',
				displayOptions: { show: { resource: ['video'], operation: ['getTranscript'] } },
				routing: { send: { type: 'query', property: 'lang', value: '={{ $value || undefined }}' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['video'], operation: ['listVideos'] } },
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'Video URLs',
				name: 'urls',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'dQw4w9WgXcQ, https://youtu.be/jNQXAC9IVRw',
				description:
					'Up to 50 video URLs or IDs, separated by commas or new lines. An array from an expression also works.',
				displayOptions: { show: { resource: ['video'], operation: ['batch'] } },
				routing: {
					send: {
						type: 'body',
						property: 'urls',
						value:
							'={{ Array.isArray($value) ? $value : String($value).split(/[\\s,]+/).filter(Boolean) }}',
					},
				},
			},
			{
				displayName: 'Language',
				name: 'batchLang',
				type: 'string',
				default: '',
				placeholder: 'en',
				description:
					"ISO language code such as en or es. Leave empty for each video's spoken language.",
				displayOptions: { show: { resource: ['video'], operation: ['batch'] } },
				routing: { send: { type: 'body', property: 'lang', value: '={{ $value || null }}' } },
			},
			{
				displayName: 'Include Segments',
				name: 'includeSegments',
				type: 'boolean',
				default: false,
				description:
					'Whether to include timestamped segments for each video, or only the full text',
				displayOptions: { show: { resource: ['video'], operation: ['batch'] } },
				routing: {
					send: { type: 'body', property: 'format', value: '={{ $value ? "json" : "text" }}' },
				},
			},
		],
	};
}
