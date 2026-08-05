// Cloudflare Pages Function API Proxy for Subscription Links
export const onRequestGet: PagesFunction = async (context) => {
  const urlParam = new URL(context.request.url).searchParams.get('url');
  if (!urlParam) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), { status: 400 });
  }

  try {
    const targetUrl = decodeURIComponent(urlParam);

    // 1. Try manual redirect first to inspect 301/302 Location header for embedded raw node URLs
    try {
      const redirectRes = await fetch(targetUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
        }
      });

      const location = redirectRes.headers.get('location');
      if (location) {
        const fullLocation = new URL(location, targetUrl).toString();
        const locObj = new URL(fullLocation);
        const embeddedUrl = locObj.searchParams.get('url');
        if (embeddedUrl) {
          const decodedNodeUrl = decodeURIComponent(embeddedUrl);
          // If embedded target is a secondary HTTP subscription link, fetch it
          if (decodedNodeUrl.startsWith('http://') || decodedNodeUrl.startsWith('https://')) {
            const subRes = await fetch(decodedNodeUrl, {
              headers: { 'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse' }
            });
            if (subRes.ok) {
              const text = await subRes.text();
              return new Response(text, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
              });
            }
          } else {
            // Embedded raw protocol string (vless://, vmess://, trojan://, ss://, etc.)
            return new Response(decodedNodeUrl, {
              headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
            });
          }
        }
      }
    } catch {
      // Fallthrough to standard follow fetch
    }

    // 2. Standard follow fetch
    const fetchRes = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
      }
    });

    const text = await fetchRes.text();
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
