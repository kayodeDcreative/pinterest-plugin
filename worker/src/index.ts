import { IttyRouter, json, status } from 'itty-router'

// Define the environment variables that the worker will need.
// The user will need to set these in their Cloudflare dashboard.
export interface Env {
	PINTEREST_CLIENT_ID: string
	PINTEREST_CLIENT_SECRET: string
	PLUGIN_URI: string // The URI of the Framer plugin
	PINTEREST_OAUTH_KV: KVNamespace
}

const router = IttyRouter()

// Helper function to handle CORS preflight requests.
const handleCors = (request: Request) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }
    // This is not a preflight request, so we let the router handle it.
    // This function is only for the OPTIONS method.
    return;
}

// Helper to add CORS headers to a response
const withCors = (response: Response) => {
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
}

// Handle CORS preflight requests
router.options('/authorize', handleCors)
router.options('/poll', handleCors)


// The /authorize endpoint is called by the Framer plugin to start the OAuth flow.
router.post('/authorize', async (request, env: Env) => {
	const readKey = crypto.randomUUID()
	const writeKey = crypto.randomUUID()

	// Store the writeKey in the KV store, associated with the readKey.
	// The token will be stored against the writeKey later.
	await env.PINTEREST_OAUTH_KV.put(readKey, writeKey, { expirationTtl: 300 }) // 5 minute expiry

	const params = new URLSearchParams({
		client_id: env.PINTEREST_CLIENT_ID,
		redirect_uri: `${env.PLUGIN_URI}/callback`,
		response_type: 'code',
		scope: 'boards:read,pins:read',
		state: writeKey, // Use the writeKey as the state to prevent CSRF
	})

	const authorizationUrl = `https://www.pinterest.com/oauth/?${params.toString()}`

	const response = json({
		url: authorizationUrl,
		readKey,
	})
    return withCors(response);
})

// The /callback endpoint is where Pinterest redirects the user after they authorize the app.
router.get('/callback', async (request, env: Env) => {
	const { searchParams } = new URL(request.url)
	const code = searchParams.get('code')
	const state = searchParams.get('state') // This is our writeKey

	if (!code || !state) {
		return withCors(new Response('Missing authorization code or state.', { status: 400 }))
	}

	// Exchange the authorization code for an access token
	const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${env.PINTEREST_CLIENT_ID}:${env.PINTEREST_CLIENT_SECRET}`)}`,
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: `${env.PLUGIN_URI}/callback`,
		}),
	})

	if (!tokenResponse.ok) {
		const errorText = await tokenResponse.text()
		console.error('Failed to get access token:', errorText)
		return withCors(new Response('Failed to get access token.', { status: 500 }))
	}

	const { access_token } = await tokenResponse.json()

	// Store the access token in the KV store, against the writeKey (state).
	await env.PINTEREST_OAUTH_KV.put(state, JSON.stringify({ access_token }), { expirationTtl: 300 })

	const response = new Response('Authentication successful! You can now close this window.', {
		headers: { 'Content-Type': 'text/html' },
	})
    return withCors(response);
})

// The /poll endpoint is called by the Framer plugin to get the access token.
router.post('/poll', async (request, env: Env) => {
	const { readKey } = await request.json()
	if (!readKey) {
		return withCors(new Response('Missing readKey', { status: 400 }))
	}

	// Get the writeKey associated with the readKey
	const writeKey = await env.PINTEREST_OAUTH_KV.get(readKey)
	if (!writeKey) {
		return withCors(new Response('Invalid or expired readKey', { status: 404 }))
	}

	// Get the token data associated with the writeKey
	const tokenData = await env.PINTEREST_OAUTH_KV.get(writeKey)
	if (!tokenData) {
		// The user has not authenticated yet.
		return withCors(status(204)) // No Content
	}

	// Token found, return it and delete the keys from KV
	await env.PINTEREST_OAUTH_KV.delete(readKey)
	await env.PINTEREST_OAUTH_KV.delete(writeKey)

	return withCors(json(JSON.parse(tokenData)))
})

// Standard Cloudflare Worker entry point
export default {
	fetch: (request: Request, env: Env, ctx: ExecutionContext) =>
		router
            .handle(request, env, ctx)
            .catch(error => {
                console.error(error)
                return withCors(new Response('Internal Server Error', { status: 500 }))
            }),
}
