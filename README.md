# ImgPrompt 官网

## 文件结构

```
website/
├── index.html          英文主站（en，根路径 /）
├── zh/index.html       中文站（zh-CN，路径 /zh/）
├── ja/index.html       日文站（ja，路径 /ja/）
├── es/index.html       西班牙语站（es，路径 /es/）
├── assets/
│   ├── site.css        全部样式（四页共用）
│   ├── hero-demo.mp4   首屏演示录像（1920×1108，32.4 秒，H.264，2.3 MB，无音轨）
│   ├── hero-poster.jpg 录像封面帧（1280×740，109 KB）
│   ├── og-cover.jpg    社交分享图（1200×630，104 KB，取自视频面板帧）
│   ├── icon48.png      导航 / 页脚 logo
│   └── icon128.png     favicon
├── robots.txt
├── sitemap.xml
└── README.md
```

纯静态，无构建步骤。字体从 Google Fonts 取 Inter / Instrument Serif / JetBrains Mono，其余无外部依赖。


## 设计规范

版式参考 woblo.in（浅色产品站），关键值取自实测：

| 项 | 值 | 来源 |
|---|---|---|
| 页面底色 | `#fbfbfb` | woblo 实测 |
| 卡片 | 纯白 + 1px `#e9e8ea` 描边 + 圆角 16px | woblo 实测 |
| 大标题 | 56px / line-height 1.1 / 字距 -0.03em / 字重 500 | woblo 实测 |
| 小节标题 | 40px / 同上 | woblo 实测 |
| 区块上下留白 | 112px（窄屏 88 / 64） | woblo 实测 |
| 导航条 | 高 53px，吸顶，底部 1px 分隔线 | woblo 实测 |
| 强调色 | 主渐变 `#8bd3ff → #ffc85f → #f09cc0` | 插件本体 |

关键取舍：全站浅色，深色只留在首屏里的插件面板本身，让产品界面成为唯一的重色块。品牌渐变只出现在面板的按钮上，页面里只做浅蓝马克笔底纹。

## 页面结构（4 段 + CTA）

1. **英雄区** — 等宽小字眉标 + 大标题（强调词带马克笔底纹）+ 两个按钮 + 真实操作录像 `.hero-demo`
2. **能力**（`#capabilities`）— `.feat-grid` 三列卡片：上 6 张各带一个灰色演示区（`.shot`），下 2 张 `.feat-wide` 横跨整行，左演示右文案
3. **价格**（`#pricing`）— 上方一条 `.price-free` 免费额度横条，下面 `.price-grid` 三列积分包，底部一行 `.price-fine` 说明
4. **问答**（`#faq`）— 5 条 `<details>`，右侧圆形 +/− 按钮
5. **CTA + 页脚** — 带柔光的大圆角卡片

导航留 `#capabilities`、`#pricing`、`#faq` 三个锚点。

`.feat-grid` 在 ≤1000px 折成两列、`.feat-wide` 跨两列；≤760px 折成单列。`.price-grid` 在 ≤760px 折成单列。

## 价格区块

数值全部来自 `config.js` 的 `DODO_PRODUCTS` 与数据库迁移，不写死猜测值：

| 卡片 | 积分 | 中文价 | 英文价 | 来源 |
|---|---|---|---|---|
| `.price` 1 | 80 | ¥7 | $1 | `DODO_PRODUCTS.credits_80` |
| `.price[data-featured]` 2 | 250 | ¥21 | $3 | `DODO_PRODUCTS.credits_250` |
| `.price` 3 | 600 | ¥50 | $7 | `DODO_PRODUCTS.credits_600` |

- 免费额度：注册 10 次（`config.js` `loginSub`），每日签到 3 次（`supabase/migrations/20260422_daily_checkin.sql`）
- 计费：1 积分 = 1 次分析（`decrement_credits` 每次扣 1）
- 签到额度每天重置，购买额度单独记账（`daily_credits` 与 `credits` 两列分开扣）
- 付款由 Dodo Payments 处理（`dodo-create-checkout` + `dodo-webhook`），文案不提微信支付

卡片按钮全部指向 Chrome 商店页，不直连支付接口——真实购买路径是「装插件 → 登录 → 插件内购买」。按钮文案按此写：`Install to buy` / `安装后购买`。

JSON-LD 的 `offers` 已改为 `AggregateOffer`（lowPrice 0，highPrice 为最高档价，offerCount 4）。

## 首屏视频

首屏演示不是手写的界面模型，而是真实操作录像 `.hero-demo > video.hero-media`。

原片 `/Users/songda/Desktop/imgprompt.mp4`：3840×2214、HEVC、60fps、41.35 秒、78.8 MB，四周有青色边框。

处理步骤（`ffmpeg`，需重做时照抄）：

```bash
# 1. 青色边框实测边界：左 252、上 148、宽 3330、高 1920
# 2. 裁边框 + 删掉原片 4s–13s 段 + 降到 1920 宽 + 30fps + H.264
ffmpeg -i imgprompt.mp4 -filter_complex "
[0:v]crop=3330:1920:252:148,trim=0:4,setpts=PTS-STARTPTS[a];
[0:v]crop=3330:1920:252:148,trim=13,setpts=PTS-STARTPTS[b];
[a][b]concat=n=2:v=1:a=0,scale=1920:-2,fps=30[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 25 -profile:v high \
  -pix_fmt yuv420p -movflags +faststart -an assets/hero-demo.mp4
# 3. 封面帧（取剪辑后第一帧）
ffmpeg -i assets/hero-demo.mp4 -frames:v 1 -vf "scale=1280:-2" -q:v 4 assets/hero-poster.jpg
```

结果：2.3 MB、32.37 秒、1920×1108。删掉 9 秒，接缝处两帧的像素差 0.31（正常相邻帧约 0.2），肉眼看不到跳帧。视频元素属性：

```html
<video class="hero-media" src="assets/hero-demo.mp4" poster="assets/hero-poster.jpg"
       width="1920" height="1108" autoplay muted loop playsinline
       preload="metadata" aria-label="..."></video>
```

- `muted` 必须有，否则 Chrome 拒绝自动播放；原片本来也无音轨（`-an`）。
- `preload="metadata"`：只取头部，不抢首屏带宽；`poster` 先出图。
- `loop` 循环。首帧是 Pinterest 页面，末帧是插件面板打开状态，循环时有一次性跳变。
- 容器 `.hero-demo` 负责圆角、描边、投影，`aspect-ratio: 1920 / 1108` 防止加载前跳版。
- 容器宽度沿用 `.stage` 的 `max-width: 1180px`，视频本身 `width: 100%`。
- 页面底部脚本让视频滚出视口时暂停，`prefers-reduced-motion` 时只留封面帧。

**本地预览注意**：Python `SimpleHTTP` 不支持 `Range` 请求，浏览器会退化成整段下载，改视频后可能仍播旧缓存。用 `?v=2` 或强刷即可；正式托管（Cloudflare Pages / Vercel）都支持 Range。


### 可替代的文件规格

要换新录像，提供下面任一规格即可，我按同样流程转码：

| 项 | 推荐 |
|---|---|
| 分辨率 | 1920 宽或更高（3840 也行，我会缩到 1920） |
| 帧率 | 30 或 60 fps（超过 30 我会降到 30，体积减半，观感无差） |
| 时长 | 15–45 秒，首尾构图接近便于循环 |
| 编码 | 任意（HEVC / ProRes / H.264 都行） |
| 音频 | 不需要 |
| 边框 | 不要画边框，我会按容器自己加圆角 |

目标文件控制在 3 MB 以内。超过这个量，4G 首屏会明显等待。

## 首屏背景

`.hero::before` 是三层径向柔光：青 `rgba(139,211,255,.28)` 为主，粉与琥珀为辅，`filter: blur(30px)`，只铺在首屏上部。`.stage-glow` 在视频框后面再补一层青光，让产品界面浮起来。


旧的 ASCII 点阵湖景与运行时已删除，首屏只用径向柔光。

## 多语言

四个语言版本内容一一对应。导航右侧是一个收起的 `.lang` 按钮，只显示当前语言（`EN` / `中` / `日` / `ES`），点开才列出四项。

| 语言 | 路径 | `html lang` | `og:locale` | 按钮文字 |
|---|---|---|---|---|
| 英文 | `/` | `en` | `en_US` | `EN` |
| 中文 | `/zh/` | `zh-CN` | `zh_CN` | `中` |
| 日文 | `/ja/` | `ja` | `ja_JP` | `日` |
| 西班牙语 | `/es/` | `es` | `es_ES` | `ES` |

### 按浏览器语言自动选站

每页 `<head>` 里第一个 `<script>` 做跳转，规则是：

| 浏览器语言前缀 | 跳到 |
|---|---|
| `zh` | `/zh/` |
| `ja` | `/ja/` |
| `es` | `/es/` |
| 其余（含 en、de、fr、ko、pt、ru、th…） | `/` |

- 只看 `navigator.languages` 的**第一项**，取最匹配的一个，不做多语言回退猜测。
- 保留原 URL 的 hash，例如 `/?a#pricing` 会跳到 `/zh/#pricing`。
- 用 `location.replace` 跳转，不污染浏览器历史。
- 三种情况不跳：`localStorage` 里 `imgprompt-lang = manual`（用户点过语言菜单）、`document.referrer` 是本站（说明是站内导航，比如点页脚的语言链接）、当前已在目标语言页。
- 关掉 JS 时脚本不运行，页面停在用户直接打开的那一版。

脚本里的 `PATHS` 是相对路径表，**四页各不相同**（根目录页 `./` `zh/` `ja/` `es/`，子目录页用 `../`），改目录结构时要一起改。

### 改语言时要同步的 7 处

1. 该页 `.lang` 菜单四项的相对路径
2. 该页 `<head>` 自动跳转脚本里的 `PATHS` 和 `CURRENT`
3. 四页 `<head>` 的 hreflang 块（`en` / `zh-CN` / `ja` / `es` / `x-default`）
4. 四页的 `og:locale` + 三条 `og:locale:alternate`
5. 四页页脚 `.foot-links` 里的三个语言链接（当前语言不列）
6. `sitemap.xml` 四条 `<url>`，每条都带五个 `xhtml:link`
7. `assets/site.css` 里按 `html[lang=...]` 分叉的排版规则

CSS 里已有的语言分叉：

- `.hl`（标题强调词）：`en` / `es` 用衬线斜体；`zh-CN` / `ja` 用下半截马克笔底纹
- `.hero h1` 宽度：`en` 24ch、`es` 26ch、`ja` 20em、其余 20ch
- `.price-fine`：`zh-CN` / `ja` 改用正文字体（等宽字体里中文和日文字距散）

`.lang` 按钮是浅灰药丸（`rgba(16,16,19,.05)` 底、无边框、26–30px 高），里面套一个白色小块显示当前语言，外观与最初那版选中的语言一致。菜单绝对定位在按钮下方 8px、右对齐，`<ul>` 默认带 `hidden`，点按钮展开，点外部或按 `Esc` 收起（`Esc` 后焦点回到按钮）。菜单项用 `hreflang` + `lang` 标注，当前项带 `aria-current="page"` 并显示对勾。窄屏（≤760px）按钮降到 12px，菜单 124px 宽，仍在视口内。

**注意**：`.lang-btn` 必须显式写 `border: 0` 和 `appearance: none`。漏了这两条，Chrome 会给 `<button>` 套上默认的 `2px outset #000` 黑框。

价格区块四页统一用美元（`$1 / $3 / $7`），只有中文站写人民币（`¥7 / ¥21 / ¥50`），数值取自 `config.js` 的 `priceLabels`。

## 上线前必须改的 2 处

```bash
cd website
# 1. 替换占位域名
grep -rl "your-domain.com" . | xargs sed -i '' 's#https://your-domain.com#https://真实域名#g'
# 2. 取消 canonical 注释（手动改，四个文件各一处）
grep -n "canonical" index.html zh/index.html ja/index.html es/index.html
```

hreflang、og、结构化数据里的域名会随第 1 步一起替换。

## 部署

任意静态托管，无需构建：

- **Cloudflare Pages**：上传 `website/`，根路径 `/`
- **Vercel**：`vercel --prod`，Framework 选 Other，输出目录 `website`
- **GitHub Pages**：推到 `gh-pages` 分支

## 收录提交

1. Google Search Console → 验证站点 → 提交 `sitemap.xml`
2. Bing Webmaster Tools → 同样提交
3. 百度搜索资源平台 → 中文用户为主，值得单独提交
4. 上线后到 Chrome 商店开发者后台，把官网地址填进扩展详情的「Website」字段

## 已内置的 SEO 项

- `<title>` / `<meta description>` / `<meta keywords>` / `<meta robots>`
- canonical + hreflang（en / zh-CN / ja / es / x-default，英文在根路径，每页都自引用）
- Open Graph + Twitter Card，含 `og:locale`、三条 `og:locale:alternate`、`og:image:width/height/alt`
- JSON-LD 两块：`SoftwareApplication`（含 featureList、screenshot、offers）和 `FAQPage`（五问五答，按语言生成）
- `offers` 用 `AggregateOffer`：英文/日文/西语 `USD 0–7`，中文 `CNY 0–50`
- 每页一个 h1，标题层级连续（h1 → h2 → h3，无跳级）
- 图片 `alt`、`width` / `height`
- FAQ 用 `<details>`，内容在 HTML 里，爬虫可读
- `sitemap.xml` 四条 URL，每条带五个 `xhtml:link`；`robots.txt` 指向 sitemap
- 分享图 `assets/og-cover.jpg`（1200×630，104 KB），取自视频面板帧

## SEO 的一条硬约束：子页不能自动跳转

`/zh/` `/ja/` `/es/` 三页的 `<head>` 脚本里有 `if (CURRENT !== "en") return;`，**不要删**。

原因：Googlebot 的语言是 `en-US`。如果子页也按浏览器语言跳转，它抓 `/zh/` 时会立刻被弹回 `/`，那三页永远收录不了。只有英文根页 `/` 负责把中文、日文、西语用户送到对应站点；子页被直接访问时一律返回自己的内容。

验证方法（改完跳转逻辑后跑一遍）：

```bash
# 模拟 Googlebot（en-US）抓四页，四页都应返回 null（不跳）
node -e '...'   # 见 git 历史或直接对照上面的规则
```

## 待补

以下三项必须在部署时处理，代码里改不了：

1. **替换占位域名** `your-domain.com`（四页 + `sitemap.xml` + `robots.txt` + 两处 JSON-LD）
2. **取消 canonical 注释**（四页各一处，`grep -n canonical index.html zh/index.html ja/index.html es/index.html`）
3. **提交收录**：Google Search Console / Bing Webmaster / 百度搜索资源平台，各提交一次 `sitemap.xml`

可选优化（不影响收录，只影响点击率）：

- `twitter:site` / `twitter:creator` 留空，没有 X 账号时不必填
- 首屏视频未加 `<link rel="preload">`，2.3 MB 在 4G 上首帧约 2–3 秒。加了会挤占首屏带宽，当前用 `poster` 先出图，权衡后没加
- `sitemap.xml` 的 `lastmod` 是手写日期，改内容时记得同步
