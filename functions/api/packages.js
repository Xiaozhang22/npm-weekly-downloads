import {
  jsonResponse,
  getPackageList,
  fetchNpmDownloads,
  groupByWeek,
  refreshAllPackages,
  isStale,
  isVeryStale,
} from '../_lib.js';

// GET /api/packages — 返回包列表 + 下载数据（自动刷新过期数据）
export async function onRequestGet(context) {
  const { env } = context;

  if (!env["npm-week"]) {
    return jsonResponse({ error: 'KV not bound. Please bindNPM_DATA in Pages Settings.' }, 500);
  }

  const packages = await getPackageList(env);
  let lastUpdated = await env["npm-week"].get('meta:last_updated');

  const data = {};
  let hasAnyData = false;
  await Promise.all(
    packages.map(async (pkg) => {
      const raw = await env["npm-week"].get(`data:${pkg}`);
      if (raw) {
        data[pkg] = JSON.parse(raw);
        hasAnyData = true;
      } else {
        data[pkg] = null;
      }
    }),
  );

  // 自动刷新逻辑
  if (!hasAnyData || isVeryStale(lastUpdated)) {
    // 无数据或超过 24 小时：同步刷新（首次访问会稍慢几秒）
    await refreshAllPackages(env);
    lastUpdated = await env["npm-week"].get('meta:last_updated');
    await Promise.all(
      packages.map(async (pkg) => {
        const raw = await env["npm-week"].get(`data:${pkg}`);
        data[pkg] = raw ? JSON.parse(raw) : null;
      }),
    );
  } else if (isStale(lastUpdated)) {
    // 12~24 小时：后台刷新，立即返回缓存数据
    context.waitUntil(refreshAllPackages(env));
  }

  return jsonResponse({ packages, data, lastUpdated });
}

// POST /api/packages — 添加新包 { name: "@scope/pkg" }
export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env["npm-week"]) {
    return jsonResponse({ error: 'KV not bound' }, 500);
  }

  const body = await request.json();
  const name = (body.name || '').trim();

  if (!name) return jsonResponse({ error: 'Package name is required' }, 400);

  const packages = await getPackageList(env);
  if (packages.includes(name)) return jsonResponse({ error: 'Package already exists' }, 409);

  let downloads;
  try {
    downloads = await fetchNpmDownloads(name);
  } catch (e) {
    return jsonResponse({ error: `Cannot fetch "${name}". Check the package name.` }, 400);
  }

  const weeks = groupByWeek(downloads);
  packages.push(name);

  await Promise.all([
    env["npm-week"].put('config:packages', JSON.stringify(packages)),
    env["npm-week"].put(`data:${name}`, JSON.stringify({ weeks })),
  ]);

  return jsonResponse({ ok: true });
}

// DELETE /api/packages?name=@scope/pkg — 删除包
export async function onRequestDelete(context) {
  const { env, request } = context;

  if (!env["npm-week"]) {
    return jsonResponse({ error: 'KV not bound' }, 500);
  }

  const url = new URL(request.url);
  const name = url.searchParams.get('name');

  if (!name) return jsonResponse({ error: 'Missing name parameter' }, 400);

  const packages = await getPackageList(env);
  const index = packages.indexOf(name);

  if (index === -1) return jsonResponse({ error: 'Package not found' }, 404);

  packages.splice(index, 1);

  await Promise.all([
    env["npm-week"].put('config:packages', JSON.stringify(packages)),
    env["npm-week"].delete(`data:${name}`),
  ]);

  return jsonResponse({ ok: true });
}
