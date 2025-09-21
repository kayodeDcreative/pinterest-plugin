# Pinterest OAuth Worker Deployment Instructions

Follow these steps to deploy the Cloudflare worker that handles the Pinterest OAuth flow for the Framer plugin.

## Prerequisites

1.  A [Cloudflare account](https://dash.cloudflare.com/sign-up).
2.  [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your machine.
3.  A Pinterest developer app with a Client ID and Client Secret. You can create one on the [Pinterest Developer site](https://developers.pinterest.com/apps/).

## Step 1: Install Dependencies

Navigate to the `worker` directory in your terminal and install the necessary dependencies:

```bash
cd worker
npm install
```

## Step 2: Configure `wrangler.toml`

The `wrangler.toml` file is the configuration file for your worker. You'll need to make a few changes to it.

### 2.1. Create a KV Namespace

The worker uses a Cloudflare KV namespace to temporarily store authentication data.

1.  In your terminal, run the following command to create a new KV namespace called `PINTEREST_OAUTH_KV`:

    ```bash
    npx wrangler kv:namespace create "PINTEREST_OAUTH_KV"
    ```

2.  This command will output something like this:

    ```
    ✅ Successfully created KV namespace `PINTEREST_OAUTH_KV` with ID `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
    ```

3.  Copy the `id` value.

4.  Open `worker/wrangler.toml` and uncomment the `[[kv_namespaces]]` section. Replace `<your_kv_namespace_id>` with the ID you just copied. It should look like this:

    ```toml
    [[kv_namespaces]]
    binding = "PINTEREST_OAUTH_KV"
    id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    ```

## Step 3: Set Environment Variables

The worker needs your Pinterest app's Client ID and Client Secret, as well as the URL of the plugin. You should never store these directly in your code. Instead, you'll set them as secrets for your worker.

Run the following commands in your terminal, replacing the placeholder values with your actual credentials:

```bash
npx wrangler secret put PINTEREST_CLIENT_ID
# You will be prompted to enter your Pinterest Client ID

npx wrangler secret put PINTEREST_CLIENT_SECRET
# You will be prompted to enter your Pinterest Client Secret

npx wrangler secret put PLUGIN_URI
# You will be prompted to enter the URI of your plugin.
# For production, this will be the custom domain you set up, e.g., https://pin.pilabase.com
```

## Step 4: Deploy the Worker

Now you're ready to deploy the worker to your Cloudflare account.

1.  Run the deploy command:

    ```bash
    npm run deploy
    ```

2.  After a successful deployment, Wrangler will output the URL of your deployed worker (e.g., `https://pinterest-oauth-worker.<your-subdomain>.workers.dev`).

## Step 5: Configure Custom Domain (Optional, but Recommended)

You mentioned you want to use `pin.pilabase.com`. To do this, you'll need to:

1.  Add a route for your custom domain in the Cloudflare dashboard to point to your worker.
2.  Make sure the `PLUGIN_URI` secret is set to your custom domain.

Please refer to the [Cloudflare documentation on custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) for detailed instructions.

## Step 6: Update Pinterest App Redirect URI

In your Pinterest developer app settings, make sure to add the callback URL of your worker to the "Redirect URIs". The callback URL will be `https://<your-worker-url>/callback`. If you're using a custom domain, it will be `https://pin.pilabase.com/callback`.

---

That's it! Your worker should now be ready to handle the Pinterest OAuth flow for your Framer plugin.
