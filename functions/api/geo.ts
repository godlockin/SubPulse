// Cloudflare Pages Function API for IP Geolocation Lookup
export const onRequestGet: PagesFunction = async (context) => {
  const urlObj = new URL(context.request.url);
  const ipParam = urlObj.searchParams.get('ip') || urlObj.searchParams.get('host');

  if (!ipParam) {
    return new Response(JSON.stringify({ error: 'Missing ip parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cleanIp = ipParam.trim();

  // Primary Provider: ip-api.com (Chinese output)
  try {
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?lang=zh-CN`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) sub-pulse/1.0'
      }
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.status === 'success') {
        const countryCode = (data.countryCode || '').toUpperCase();
        return new Response(
          JSON.stringify({
            ip: data.query || cleanIp,
            country: data.country || countryCode,
            countryCode,
            city: data.city || '',
            isp: data.isp || data.org || '',
            flag: getCountryFlagEmoji(countryCode)
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            }
          }
        );
      }
    }
  } catch {
    // Fallback provider below
  }

  // Secondary Fallback Provider: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${cleanIp}/json/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 sub-pulse/1.0'
      }
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.country_code) {
        const countryCode = (data.country_code || '').toUpperCase();
        return new Response(
          JSON.stringify({
            ip: data.ip || cleanIp,
            country: data.country_name || countryCode,
            countryCode,
            city: data.city || '',
            isp: data.org || '',
            flag: getCountryFlagEmoji(countryCode)
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=86400'
            }
          }
        );
      }
    }
  } catch {
    // Fallback provider below
  }

  return new Response(JSON.stringify({ error: 'Failed to lookup IP geolocation' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
};

function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
