import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

const BASE_URL = 'https://api.transkrio.com';
// Long audio (podcasts) is transcribed in the background: the API answers 202 "processing"
// and the same request returns the transcript once it is ready. Wait for it up to this long.
const MAX_WAIT_MS = 15 * 60 * 1000;

async function waitWhileProcessing(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode !== 202) return items;
	const url = this.getNodeParameter('url') as string;
	const lang = (this.getNodeParameter('lang', '') as string) || undefined;
	const deadline = Date.now() + MAX_WAIT_MS;
	let body = response.body as IDataObject;
	while (Date.now() < deadline) {
		await sleep(Math.max(5, Number(body.retry_after) || 15) * 1000);
		const res = (await this.helpers.httpRequestWithAuthentication.call(this, 'transkrioApi', {
			method: 'GET',
			url: `${BASE_URL}/v1/transcript`,
			qs: { url, lang, format: 'json' },
			json: true,
			returnFullResponse: true,
		})) as IN8nHttpFullResponse;
		body = res.body as IDataObject;
		if (res.statusCode !== 202) return [{ json: body }];
	}
	throw new NodeOperationError(
		this.getNode(),
		'The transcription is still running after 15 minutes. Run the node again later to get it.',
	);
}

const MEDIA_URL =
	'YouTube, TikTok or Instagram Reel URL, YouTube video ID, podcast RSS feed (latest episode, or an episode URL from List Videos), Apple Podcasts link or audio file URL';

const urlField = (operation: string, description: string) => ({
	displayName: 'URL',
	name: 'url',
	type: 'string' as const,
	required: true,
	default: '',
	placeholder: 'https://www.tiktok.com/@user/video/7234567890123456789',
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
			'Transcripts of YouTube and TikTok videos, Instagram Reels and podcasts. Failed requests are free.',
		defaults: { name: 'Transkrio' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'transkrioApi', required: true }],
		requestDefaults: {
			baseURL: BASE_URL,
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
						action: 'Get the transcript of a video or episode',
						description:
							'Full transcript as text plus timestamped segments. 1 credit with captions, or 1 per minute of transcribed audio.',
						routing: {
							request: { method: 'GET', url: '/v1/transcript', qs: { format: 'json' } },
							output: { postReceive: [waitWhileProcessing] },
						},
					},
					{
						name: 'Get Many Transcripts',
						value: 'batch',
						action: 'Get the transcripts of many videos',
						description:
							'Up to 50 videos or episodes in one call. Same credits as separate calls; failures are free.',
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
						action: 'Get the metadata of a video or episode',
						description:
							'Title, channel or show, duration, views, upload date and caption languages. 1 credit.',
						routing: { request: { method: 'GET', url: '/v1/metadata' } },
					},
					{
						name: 'List Videos',
						value: 'listVideos',
						action: 'List videos or podcast episodes',
						description:
							'Videos of a YouTube playlist or channel, or episodes of a podcast, newest first. 1 credit.',
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

			urlField('getTranscript', MEDIA_URL),
			urlField('getMetadata', MEDIA_URL),
			urlField(
				'listVideos',
				'YouTube playlist URL or ID, channel URL (/@handle, /channel/UC...) or @handle, podcast RSS feed or Apple Podcasts show link',
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
					'Up to 50 URLs (any supported platform) or YouTube IDs, separated by commas or new lines. An array from an expression also works. Items still being transcribed come back with error code "processing": send them again later.',
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
