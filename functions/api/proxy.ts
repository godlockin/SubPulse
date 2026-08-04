// Cloudflare Pages Function API Proxy for Subscription Links
export const onRequestGet: PagesFunction = async (context) => {
  const urlParam = new URL(context.request.url).searchParams.get('url');
  if (!urlParam) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(urlParam);

    const fetchRes = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
      }
    });

    const text = await fetchRes.text();
    const finalUrl = fetchRes.url || targetUrl;

    // Check if the subconverter returned 502 or 4xx/5xx error, but embedded the raw node url in redirect query parameter!
    if (!fetchRes.ok || text.includes('error code: 502') || text.includes('502 Bad Gateway')) {
      try {
        const urlObj = new URL(finalUrl);
        const embeddedUrl = urlObj.searchParams.get('url');
        if (embeddedUrl) {
          const decodedNodeUrl = decodeURIComponent(embeddedUrl);
          return new Response(decodedNodeUrl, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch {
        // Fallback
      }
    }

    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
