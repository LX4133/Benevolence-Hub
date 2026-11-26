# Demo 技术方案

本地 Demo 使用 Next.js App Router、TypeScript、Tailwind CSS、React 和 lucide-react，由 pnpm 管理依赖。组件库、动画和表单库按实际功能需要再引入。

运行方式

```sh
cd application
pnpm install
pnpm dev
```

开发服务器启动后打开 http://localhost:3000。构建用 `pnpm build`，类型检查用 `pnpm typecheck`。当前 Codex 环境使用独立 Node 运行时运行 `pnpm exec next build --webpack`，构建通过后使用 `pnpm start` 预览。

目标载体为飞书工作台网页应用。当前页面使用虚构记录及示例文件。飞书工作台入口、测试成员身份关联、测试多维表格读取和文件访问需在获授权的飞书环境验证。

投后管理表在 PRD 中列为背景参考。当前未能核实表头或授权范围。后续优先在空白测试表使用虚构记录，评估记录与附件权限。
