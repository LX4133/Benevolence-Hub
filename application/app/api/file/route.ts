import { downloadMedia, fetchDonorData } from "../../lib/feishu";
import { getDonorId } from "../../lib/session";

// 按模拟身份校验文件归属后再代理下载，浏览器不会拿到飞书应用令牌或任意文件 token。
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const donor = searchParams.get("donor")?.trim();
  const kind = searchParams.get("kind");
  const id = searchParams.get("id")?.trim();

  if (!donor || !id || (kind !== "record" && kind !== "material")) {
    return new Response("请求参数不完整", { status: 400 });
  }

  const sessionDonor = await getDonorId();
  if (!sessionDonor) return new Response("请先选择演示身份", { status: 401 });
  if (sessionDonor !== donor) return new Response("无权访问该文件", { status: 403 });

  let file;
  try {
    const data = await fetchDonorData(donor);
    file =
      kind === "record"
        ? data.records.find((record) => record.id === id && record.fileToken)
        : data.materials.find((material) => material.id === id && material.fileToken);
  } catch {
    return new Response("暂时无法读取文件，请稍后刷新重试", { status: 502 });
  }

  if (!file) return new Response("未找到可获取的文件", { status: 404 });

  const upstream = await downloadMedia(file.fileToken);
  if (!upstream.ok) return new Response("文件暂时无法打开，请稍后重试", { status: 502 });

  const fileName = file.fileName || "file.pdf";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
