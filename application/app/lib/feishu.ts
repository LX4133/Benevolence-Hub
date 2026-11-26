import type { DonationRecord, DonorData, DonorMaterial } from "./types";

// 服务端只读访问测试多维表格。凭据只从服务端环境变量读取，不下发浏览器。
// 每次请求实时读取（no-store），工作人员在飞书改动后刷新页面即可看到最新数据。

const BASE = "https://open.feishu.cn/open-apis";
const DONOR_FIELD = "演示捐赠人编号";

// 登录页快捷入口。001～003 同时也是账号登录可用的演示账号。
export const DEMO_DONOR_IDS = ["001", "002", "003"] as const;

// 演示用账号校验：账号与密码均存放在「用户信息」表，正式方案待确认。
export async function verifyAccount(account: string, password: string) {
  if (!/^\d{3}$/.test(account) || !password) return null;
  const { users } = await getTableIds();
  if (!users) return null;
  const rows = await searchRecords(users, {});
  const user = rows.find((row) => toText(row.fields["账号"]) === account);
  return user && toText(user.fields["密码"]) === password ? account : null;
}

// 会话里的编号可能因数据调整失效（例如早期 DEMO-* 身份已并入 001～003）。
export async function donorExists(donorId: string) {
  if (!/^\d{3}$/.test(donorId)) return false;
  const { users } = await getTableIds();
  if (!users) return true;
  const rows = await searchRecords(users, {});
  return rows.some((row) => toText(row.fields["账号"]) === donorId);
}

let tokenCache: { value: string; expiresAt: number } | null = null;
let tableCache: Promise<{ records: string; materials: string; users: string | null }> | null = null;

function config() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN || process.env.FEISHU_WIKI_TOKEN;
  if (!appId || !appSecret || !appToken) {
    throw new Error("服务端未配置飞书测试应用凭据");
  }
  return { appId, appSecret, appToken };
}

async function getToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.value;
  const { appId, appSecret } = config();
  const res = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`获取应用身份令牌失败（code=${json.code}）`);
  }
  tokenCache = {
    value: json.tenant_access_token,
    expiresAt: Date.now() + Math.max((json.expire ?? 7200) - 60, 60) * 1000,
  };
  return tokenCache.value;
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await getToken();
  const { appToken } = config();
  const res = await fetch(`${BASE}${path.replace("{app}", appToken)}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (json.code !== 0) {
    const error = new Error(`飞书接口返回 code=${json.code}：${json.msg}`) as Error & { feishuCode?: number };
    error.feishuCode = json.code;
    throw error;
  }
  return json.data as T;
}

async function getTableIds() {
  if (!tableCache) {
    tableCache = (async () => {
      const data = await api<{ items?: { name: string; table_id: string }[] }>(
        "/bitable/v1/apps/{app}/tables?page_size=100",
      );
      const tables = data.items ?? [];
      const records = tables.find((t) => t.name.includes("捐赠记录"));
      const materials = tables.find((t) => t.name.includes("证书"));
      const users = tables.find((t) => t.name.includes("用户"));
      if (!records || !materials) throw new Error("未找到捐赠记录或证书与材料子表");
      return { records: records.table_id, materials: materials.table_id, users: users?.table_id ?? null };
    })().catch((error) => {
      tableCache = null;
      throw error;
    });
  }
  return tableCache;
}

type RawRecord = { fields: Record<string, unknown> };

// 服务端按捐赠人编号筛选，不把整表数据交给前端。
async function searchRecords(tableId: string, body: unknown): Promise<RawRecord[]> {
  const items: RawRecord[] = [];
  let pageToken = "";
  do {
    const data = await api<{ items?: RawRecord[]; page_token?: string; has_more?: boolean }>(
      `/bitable/v1/apps/{app}/tables/${tableId}/records/search?page_size=500${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ""}`,
      { method: "POST", body },
    );
    items.push(...(data.items ?? []));
    pageToken = data.has_more ? data.page_token ?? "" : "";
  } while (pageToken);
  return items;
}

async function searchByDonor(tableId: string, donorId: string): Promise<RawRecord[]> {
  try {
    return await searchRecords(tableId, {
      filter: {
        conjunction: "and",
        conditions: [{ field_name: DONOR_FIELD, operator: "is", value: [donorId] }],
      },
    });
  } catch (error) {
    // 飞书对筛选结果为空的情况会返回 1254018，改读全表后服务端精确匹配。
    if ((error as { feishuCode?: number }).feishuCode === 1254018) {
      const rows = await searchRecords(tableId, {});
      return rows.filter((row) => toText(row.fields[DONOR_FIELD]) === donorId);
    }
    throw error;
  }
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(toText).join("").trim();
  if (typeof value === "object") {
    const item = value as { text?: string; name?: string };
    return (item.text ?? item.name ?? "").trim();
  }
  return "";
}

type Attachment = { name: string; token: string };

function attachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((file) => {
      if (!file || typeof file !== "object") return null;
      const item = file as { name?: string; file_token?: string };
      const name = String(item.name ?? "");
      const token = String(item.file_token ?? "");
      return name && token ? { name, token } : null;
    })
    .filter((item): item is Attachment => item !== null);
}

const dateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDate(value: unknown): string {
  if (typeof value === "number") return dateFormat.format(new Date(value));
  const raw = toText(value);
  const matched = raw.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  return matched ? matched[0].replaceAll("/", "-") : raw;
}

export async function fetchDonorData(donorId: string): Promise<DonorData> {
  const tables = await getTableIds();
  const [recordRows, materialRows, userRows] = await Promise.all([
    searchByDonor(tables.records, donorId),
    searchByDonor(tables.materials, donorId),
    tables.users ? searchRecords(tables.users, {}) : Promise.resolve([] as RawRecord[]),
  ]);

  const donorName = toText(userRows.find((row) => toText(row.fields["账号"]) === donorId)?.fields["姓名"]);

  const records: DonationRecord[] = recordRows
    .map((row) => {
      const files = attachments(row.fields["附件"]);
      return {
        id: toText(row.fields["记录编号"]),
        project: toText(row.fields["项目名称"]),
        date: toDate(row.fields["捐赠日期"]),
        amount: Number(toText(row.fields["演示金额"])),
        invoiceStatus: toText(row.fields["开票状态"]),
        certificateStatus: toText(row.fields["证书发放状态"]),
        fileName: toText(row.fields["票据文件名"]) || files[0]?.name || "",
        fileAvailable: files.length > 0,
        fileToken: files[0]?.token ?? "",
      };
    })
    .filter((record) => record.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const materials: DonorMaterial[] = materialRows
    .map((row) => {
      const files = attachments(row.fields["附件"]);
      return {
        id: toText(row.fields["材料编号"]),
        type: toText(row.fields["材料类型"]),
        name: toText(row.fields["材料名称"]),
        relatedRecordId: toText(row.fields["关联记录编号"]),
        status: toText(row.fields["材料状态"]),
        fileName: toText(row.fields["材料文件名"]) || files[0]?.name || "",
        fileAvailable: files.length > 0,
        fileToken: files[0]?.token ?? "",
      };
    })
    .filter((material) => material.id);

  return { donorId, donorName, records, materials };
}

// 登录页用：只校验演示表可读并返回快捷入口账号，不读取统计或明细。
export async function fetchDemoDonors(): Promise<string[]> {
  await getTableIds();
  return [...DEMO_DONOR_IDS];
}

// 服务端用应用身份下载附件，令牌不下发浏览器。调用方须先校验文件归属。
export async function downloadMedia(fileToken: string) {
  const token = await getToken();
  return fetch(`${BASE}/drive/v1/medias/${encodeURIComponent(fileToken)}/download`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}
