# 今日运气 NapCat 插件

基于 [NapCat](https://github.com/NapNeko/NapCatFramework) 的今日运气插件，发送 `#今日运气` 获取每日随机运气值。

## ⚠️ 声明

**本项目完全由 [Xiaomi MiMo](https://aistudio.xiaomimimo.com/) 生成**，功能代码参考自 [hs-qiqi-cv-plugin](https://gitee.com/kesally/hs-qiqi-cv-plugin)。

## 功能

- 🎲 **今日运气** — 每日随机运气值 (0-100)，四档文案 + 随机图片
- 🔄 **重新运气** — 不满意可以耍赖重来
- 🔓 **开后门** — 主人可指定用户必定 100 运气
- ⚙️ **可配置** — 命令前缀、图片API、主人QQ号均可在 WebUI 中修改

## 使用方法

| 命令 | 说明 |
|------|------|
| `#今日运气` | 获取今日运气值 |
| `#重新运气` | 重置今日运气（耍赖重来） |
| `#开后门 <QQ号>` | （主人）指定用户必定 100 运气 |
| `#关后门 <QQ号>` | （主人）取消后门 |
| `#help` | 查看帮助 |

## 安装

1. 下载 [Release](https://github.com/XGH2333/napcat-plugin-for_igo/releases) 中的构建产物
2. 解压到 NapCat 插件目录
3. 在 NapCat WebUI 中配置主人QQ号（可选）

## 开发

```bash
pnpm install
pnpm run build     # 构建
pnpm run dev       # 开发模式（watch + 自动部署）
```

## License

MIT
