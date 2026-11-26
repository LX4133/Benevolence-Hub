// 只读联调检查：验证测试多维表格及「01.捐赠记录」「02.证书与材料」两张子表可读。
// 用法：在本目录执行 node scripts/verify-feishu.mjs
// 凭据从 .env.local 或进程环境变量读取，脚本不输出 App Secret 和 access token。

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const BASE = "https://open.feishu.cn/open-apis";
const appId = process.env.FEISHU_APP_ID?.trim();
const appSecret = process.env.FEISHU_APP_SECRET?.trim();
const wikiToken = process.env.FEISHU_WIKI_TOKEN?.trim();
const appTokenOverride = process.env.FEISHU_BITABLE_APP_TOKEN?.trim();

const EXPECTED = [
  {
    label: "01.捐赠记录",
    match: (name) => name.includes("捐赠记录"),
    fields: ["记录编号", "演示捐赠人编号", "项目名称", "捐赠日期", "演示金额", "票据状态", "票据文件名"],
    attachmentFields: ["票据附件", "附件"],
  },
  {
    label: "02.证书与材料",
    match: (name) => name.includes("证书"),
    fields: ["材料编号", "演示捐赠人编号", "材料类型", "材料名称", "关联记录编号", "材料状态", "材料文件名"],
    attachmentFields: ["材料附件", "附件"],
  },
];

function stop(message, hint) {
  console.error(`\n未通过：${message}`);
  if (hint) console.error(hint);
  process.exit(1);
}

function mask(value) {
  if (!value) return "(空)";
  return value.length <= 8 ? "****" : `${value.slice(0, 4)}…${value.slice(-2)}`;
}

async function api(pathname, { token, method = "GET", body } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!json) throw new Error(`${pathname} 返回 HTTP ${res.status}，响应不是 JSON`);
  if (json.code !== 0) throw new Error(`${pathname} 返回 code=${json.code} msg=${json.msg}`);
  return json.data ?? json;
}

if (!appId || !appSecret) {
  console.error("未配置飞书测试应用凭据，已跳过网络检查。");
  console.error(`\n请在 ${envFile} 中填写（可先复制 .env.example）：`);
  console.error("  FEISHU_APP_ID=cli_xxx");
  console.error("  FEISHU_APP_SECRET=xxx");
  console.error("  FEISHU_WIKI_TOKEN=知识库链接中的 wiki 节点 token（.env.example 已含测试值）");
  console.error("\n填写后在本目录执行：node scripts/verify-feishu.mjs");
  process.exit(2);
}

let appToken = appTokenOverride;

try {
  const auth = await api("/auth/v3/tenant_access_token/internal", {
    method: "POST",
    body: { app_id: appId, app_secret: appSecret },
  });
  const token = auth.tenant_access_token;
  if (!token) stop("未获取到 tenant_access_token");
  console.log(`✓ 已获取应用身份令牌（App ID ${mask(appId)}）`);

  if (!appToken) {
    if (!wikiToken) stop("缺少 FEISHU_WIKI_TOKEN 或 FEISHU_BITABLE_APP_TOKEN");
    const node = await api(`/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}&obj_type=wiki`, { token });
    if (!node.node) stop("知识库节点返回为空，请确认链接与访问权限");
    if (node.node.obj_type !== "bitable") stop(`节点类型为 ${node.node.obj_type}，不是多维表格`);
    appToken = node.node.obj_token;
    console.log(`✓ 知识库节点可读，已解析到多维表格（app_token ${mask(appToken)}）`);
  } else {
    console.log(`✓ 使用环境变量指定的多维表格（app_token ${mask(appToken)}）`);
  }

  const tables = await api(`/bitable/v1/apps/${appToken}/tables?page_size=100`, { token });
  const tableList = tables.items ?? [];
  console.log(`✓ 多维表格可读，共 ${tableList.length} 张子表：${tableList.map((t) => t.name).join("、")}`);

  let failed = 0;
  for (const expected of EXPECTED) {
    const table = tableList.find((t) => expected.match(t.name));
    if (!table) {
      failed += 1;
      console.error(`✗ 未找到子表「${expected.label}」`);
      continue;
    }

    const fieldData = await api(`/bitable/v1/apps/${appToken}/tables/${table.table_id}/fields?page_size=100`, { token });
    const fieldNames = (fieldData.items ?? []).map((f) => f.field_name);
    const recordData = await api(`/bitable/v1/apps/${appToken}/tables/${table.table_id}/records?page_size=1`, { token });
    const total = typeof recordData.total === "number" ? recordData.total : (recordData.items ?? []).length;

    const missing = expected.fields.filter((name) => !fieldNames.includes(name));
    const attachmentField = expected.attachmentFields.find((name) => fieldNames.includes(name));
    console.log(`\n子表「${table.name}」`);
    console.log(`  记录数：${total}`);
    console.log(`  字段：${fieldNames.join("、") || "(无)"}`);
    console.log(`  ${missing.length ? `✗ 缺少预期字段：${missing.join("、")}` : "✓ 预期字段齐全"}`);
    console.log(`  ${attachmentField ? `✓ 附件字段「${attachmentField}」存在` : `⚠ 未找到附件字段（预期 ${expected.attachmentFields.join(" 或 ")}）`}`);
    if (missing.length) failed += 1;
  }

  if (failed) stop("有子表或字段不符合预期，见上方明细");
  console.log("\n通过：知识库链接、多维表格及两张子表均可只读访问。");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const hint = /99991672|permission|scope|forbidden|Forbidden/i.test(message)
    ? "\n提示：应用可能缺少 wiki:wiki:readonly 或 bitable:app:readonly 权限，或该表未把测试应用加为协作者（需「可编辑」或「可阅读」）。"
    : "\n提示：检查凭据、网络和测试表链接是否正确。";
  stop(message, hint);
}
