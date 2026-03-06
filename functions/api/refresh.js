import { jsonResponse, refreshAllPackages } from '../_lib.js';

// POST /api/refresh — 手动强制刷新所有包数据
export async function onRequestPost(context) {
  const { env } = context;

  if (!env.NPM_DATA) {
    return jsonResponse({ error: 'KV not bound' }, 500);
  }

  await refreshAllPackages(env);
  return jsonResponse({ ok: true, message: 'Data refreshed' });
}
