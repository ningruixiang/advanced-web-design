# 数据库说明 · 校园新闻中心（Supabase）

本项目新闻列表的后台与数据库均使用 **Supabase**，前端通过 `supabase-js`（已离线下载至 `frontend/cdn/supabase.js`）以 REST 方式读取数据，不涉及任何自建后端服务。

## 1. 连接信息

| 项 | 值 |
| --- | --- |
| 项目 URL（API） | `https://elprlpwpogqnqmkyepwr.supabase.co` |
| 数据库引擎 | PostgreSQL 17 |
| 暴露 Schema | `public` |
| 数据表 | `public.yl_news` |
| 前端密钥 | `sb_publishable_s65J3L3XiG2IueACL8w8qQ_q_RD07J7`（publishable 公钥，可公开） |
| 密钥落地位置 | `frontend/js/config.js` |
| 访问方式 | Supabase REST（PostgREST）+ supabase-js v2.119.2 |

> publishable 公钥只用于标识项目，具体能读到哪些行由**行级安全策略（RLS）**决定；`service_role` 密钥不落地到前端。

## 2. 表结构 `public.yl_news`

```sql
create table public.yl_news (
  id            bigint generated always as identity primary key,
  title         text        not null,          -- 新闻标题
  summary       text        not null,          -- 摘要（列表页展示）
  content       text        not null default '', -- 正文（详情弹窗，\n 分段）
  category      text        not null,          -- 分类：校园/科技/学术/活动/就业/生活
  author        text        not null,          -- 作者
  source        text,                          -- 来源渠道
  tags          text[]      not null default '{}', -- 标签数组
  cover_theme   text        not null default 'cyan', -- 封面配色主题（前端渐变缩略图）
  is_top        boolean     not null default false,  -- 是否置顶
  is_published  boolean     not null default true,   -- 是否已发布（仅 true 对外可见）
  views         integer     not null default 0,      -- 浏览量
  likes         integer     not null default 0,      -- 点赞数
  published_at  timestamptz not null default now(),  -- 发布时间
  created_at    timestamptz not null default now(),  -- 入库时间
  constraint yl_news_category_check
    check (category in ('校园', '科技', '学术', '活动', '就业', '生活'))
);
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint | 自增主键（identity） |
| `title` | text | 标题，必填 |
| `summary` | text | 列表摘要，必填 |
| `content` | text | 正文，段落之间用换行分隔 |
| `category` | text | 六个受约束的分类之一 |
| `author` | text | 作者/部门 + 姓名 |
| `source` | text | 来源（学校官网、新闻网、就业网等） |
| `tags` | text[] | 标签数组，前端渲染为 `#标签` |
| `cover_theme` | text | 缩略图配色：cyan/blue/violet/emerald/amber/rose |
| `is_top` | boolean | 置顶，前端取前 3 条做特稿卡片 |
| `is_published` | boolean | 未发布的记录对匿名用户不可见 |
| `views` / `likes` | integer | 浏览量与点赞数 |
| `published_at` | timestamptz | 发布时间，列表默认按此倒序 |
| `created_at` | timestamptz | 数据入库时间 |

## 3. 索引

```sql
create index yl_news_published_at_idx on public.yl_news (published_at desc);
create index yl_news_category_idx     on public.yl_news (category);
```

## 4. 行级安全（RLS）

表已开启 RLS，匿名端只读已发布数据，无任何写权限：

```sql
alter table public.yl_news enable row level security;

create policy "yl_news_read_published" on public.yl_news
  for select to anon, authenticated
  using (is_published = true);

grant select on public.yl_news to anon, authenticated;
```

要点：

- 匿名（`anon`）只有 `select` 策略，`insert / update / delete` 全部被拒绝。
- 未发布（`is_published = false`）的记录，匿名用户即使直接查询也返回 0 行。
- 新增表若未自动暴露给 Data API，需显式 `grant select`（已包含在上面的 SQL 中）。

### 4.1 管理端写权限与管理员账号

后台管理依赖 **Supabase Auth**：管理员用邮箱 + 密码登录，JWT 的 `app_metadata.role = admin` 才被授权写入。授权数据放在 `app_metadata`（不可被用户自行修改），不使用 `user_metadata`。

```sql
create policy "yl_news_admin_write" on public.yl_news
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

这条 `for all` 策略的 `using` 同时让管理员能看到未发布草稿；`with check` 保证写入后的行仍满足管理员条件。

演示管理员账号（课程用，生产环境应改密码或删除）：

| 项 | 值 |
| --- | --- |
| 邮箱 | `admin@ylnews.cn` |
| 密码 | `YlNews@2026` |
| app_metadata | `{"provider":"email","providers":["email"],"role":"admin"}` |
| user_metadata | `{"display_name":"宁瑞祥"}` |

权限验证结果（已实测）：

| 操作 | 匿名 | 管理员 |
| --- | --- | --- |
| 读取已发布新闻 | ✅ | ✅ |
| 读取草稿 | ❌ 0 行 | ✅ |
| 新增 / 修改 / 删除 | ❌ 被 RLS 拒绝 | ✅ |

## 5. 模拟数据

共 **20 条**已发布新闻，覆盖 6 个分类，其中置顶 3 条，发布时间分布在 2026-10-29 ～ 2026-11-26：

| 分类 | 条数 | 示例标题 |
| --- | --- | --- |
| 校园 | 5 | 学校召开 2026 年秋季学期教学工作会议 |
| 科技 | 4 | 学校团队在全国大学生人工智能应用创新大赛中获一等奖 |
| 学术 | 3 | 计算机学院举办“大模型与教育”前沿学术论坛 |
| 活动 | 3 | 第十九届校园文化艺术节开幕，30 余场演出持续两周 |
| 就业 | 3 | 2026 届毕业生秋季双选会举行，320 家企业提供 8000 余个岗位 |
| 生活 | 3 | 第三食堂完成改造，新增 12 个地方风味档口 |

置顶的 3 条：教学工作会议、AI 大赛一等奖、学生团队开源校园二手交易平台。

校验查询：

```sql
select count(*) as total,
       count(*) filter (where is_top) as top_count,
       count(distinct category)      as categories
from public.yl_news;
-- total = 20, top_count = 3, categories = 6
```

## 6. 前端读取方式

`frontend/js/app.js` 中的实际查询：

```js
const yl_client = supabase.createClient(yl_cfg.url, yl_cfg.key);

yl_client
  .from('yl_news')
  .select('id,title,summary,content,category,author,source,tags,cover_theme,is_top,views,likes,published_at')
  .eq('is_published', true)
  .order('published_at', { ascending: false });
```

分类筛选、关键词搜索与排序（最新 / 最多浏览 / 最多点赞）在前端对拉取到的 20 条数据完成；数据量增大后可改为服务端 `eq` / `ilike` / `order` 查询并配合 `range()` 分页。

等价的 REST 调用（可直接用浏览器或 curl 验证）：

```bash
curl "https://elprlpwpogqnqmkyepwr.supabase.co/rest/v1/yl_news?select=id,title,category&is_published=eq.true&order=published_at.desc&limit=3" \
  -H "apikey: sb_publishable_s65J3L3XiG2IueACL8w8qQ_q_RD07J7"
```

## 7. 后台管理端

页面：`frontend/admin.html`（样式 `frontend/css/admin.css`，逻辑 `frontend/js/admin.js`），入口在新闻列表页右上角「后台管理 →」。

功能清单：

| 模块 | 说明 |
| --- | --- |
| 登录 / 登出 | `supabase.auth.signInWithPassword()`，非 admin 账号自动登出并提示；会话由 supabase-js 持久化，刷新页面免重复登录 |
| 数据总览 | 全部 / 已发布 / 草稿 / 置顶 四个统计卡 |
| 列表检索 | 关键词（标题、摘要、作者）+ 状态筛选（全部 / 已发布 / 草稿） |
| 新建 / 编辑 | 右侧抽屉表单：标题、摘要、正文、分类、封面配色、作者、来源、标签、发布时间、浏览量、点赞数、置顶、发布 |
| 快捷操作 | 一键发布 / 转草稿、置顶 / 取消置顶、删除（带二次确认） |
| 反馈 | Toast 提示与表单内联错误，保存失败会展示 PostgREST 错误信息 |

管理端写入示例：

```js
// 登录
await supabase.auth.signInWithPassword({ email, password });

// 新增
await supabase.from('yl_news').insert({ title, summary, content, category, author, is_published: true });

// 改状态
await supabase.from('yl_news').update({ is_published: false }).eq('id', 12);

// 删除
await supabase.from('yl_news').delete().eq('id', 12);
```

## 8. 变更记录

| 时间 | 变更 | 方式 |
| --- | --- | --- |
| 2026-11-26 | 创建 `public.yl_news` 表、2 个索引、RLS 只读策略 | Supabase MCP `apply_migration`（migration：`create_yl_news_table`） |
| 2026-11-26 | 写入 20 条模拟新闻 | Supabase MCP `execute_sql` |
| 2026-11-26 | 新增管理员账号（`app_metadata.role = admin`）与 `yl_news_admin_write` 写策略 | Supabase MCP `apply_migration`（migration：`add_admin_role_and_write_policies`） |
