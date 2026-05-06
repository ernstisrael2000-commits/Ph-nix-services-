import { createSign } from 'crypto';

const PROJECT = 'gen-lang-client-0739219145';
const DB_ID = 'ai-studio-283d6370-7e1a-484a-aed2-4d5b3071d1e2';

function parseValue(val: any): any {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) {
    const ms = new Date(val.timestampValue).getTime();
    return { _seconds: Math.floor(ms / 1000), _nanoseconds: (ms % 1000) * 1e6 };
  }
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseValue);
  }
  if ('mapValue' in val) {
    return parseFields(val.mapValue.fields || {});
  }
  return null;
}

function parseFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseValue(v);
  }
  return out;
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${claim}`);
  const jwt = `${header}.${claim}.${sign.sign(sa.private_key, 'base64url')}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const { access_token, error } = await r.json() as any;
  if (error) throw new Error(`OAuth: ${error}`);
  return access_token;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawSa) {
      return res.status(503).json({ error: 'FIREBASE_SERVICE_ACCOUNT non configuré' });
    }
    let raw = rawSa.trim();
    if (!raw.startsWith('{')) raw = '{' + raw;
    const sa = JSON.parse(raw);

    const token = await getAccessToken(sa);

    const qRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${DB_ID}/documents:runQuery`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'formations' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'published' },
                op: 'EQUAL',
                value: { booleanValue: true },
              },
            },
            orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
          },
        }),
      }
    );

    if (!qRes.ok) {
      const err = await qRes.json();
      return res.status(500).json({ error: 'Firestore error', details: err });
    }

    const rows: any[] = await qRes.json();
    const formations = rows
      .filter((row) => row.document)
      .map((row) => {
        const id = (row.document.name as string).split('/').pop();
        return { id, ...parseFields(row.document.fields || {}) };
      });

    return res.status(200).json({ formations });
  } catch (e: any) {
    console.error('[formations standalone]', e);
    return res.status(500).json({ error: e.message || 'Erreur serveur.' });
  }
}
