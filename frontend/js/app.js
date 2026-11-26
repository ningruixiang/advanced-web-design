(function () {
    'use strict';

    var yl_cfg = window.yl_supabaseConfig || {};
    var yl_themeClass = {
        cyan: 'yl_theme--cyan',
        blue: 'yl_theme--blue',
        violet: 'yl_theme--violet',
        emerald: 'yl_theme--emerald',
        amber: 'yl_theme--amber',
        rose: 'yl_theme--rose'
    };

    var yl_el = {
        dot: document.getElementById('yl_dot'),
        status: document.getElementById('yl_statusText'),
        filters: document.getElementById('yl_filters'),
        search: document.getElementById('yl_search'),
        sort: document.getElementById('yl_sort'),
        featured: document.getElementById('yl_featured'),
        list: document.getElementById('yl_list'),
        streamTitle: document.getElementById('yl_streamTitle'),
        count: document.getElementById('yl_count'),
        more: document.getElementById('yl_more'),
        modal: document.getElementById('yl_modal'),
        mClose: document.getElementById('yl_mClose'),
        mMeta: document.getElementById('yl_mMeta'),
        mTitle: document.getElementById('yl_mTitle'),
        mTags: document.getElementById('yl_mTags'),
        mBody: document.getElementById('yl_mBody'),
        mFoot: document.getElementById('yl_mFoot')
    };

    var yl_state = {
        rows: [],
        category: '全部',
        keyword: '',
        sort: 'latest',
        shown: yl_cfg.pageSize || 6,
        categoryList: ['全部'],
        featuredIds: []
    };

    /* ===== 工具函数 ===== */
    function yl_esc(yl_str) {
        return String(yl_str === null || yl_str === undefined ? '' : yl_str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function yl_num(yl_v) {
        var yl_n = Number(yl_v) || 0;
        return yl_n >= 10000 ? (yl_n / 10000).toFixed(1) + ' 万' : yl_n.toLocaleString('zh-CN');
    }

    function yl_timeText(yl_iso) {
        var yl_d = new Date(yl_iso);
        if (isNaN(yl_d.getTime())) { return ''; }
        var yl_diff = Date.now() - yl_d.getTime();
        var yl_min = Math.floor(yl_diff / 60000);
        if (yl_min < 1) { return '刚刚'; }
        if (yl_min < 60) { return yl_min + ' 分钟前'; }
        var yl_hour = Math.floor(yl_min / 60);
        if (yl_hour < 24) { return yl_hour + ' 小时前'; }
        var yl_day = Math.floor(yl_hour / 24);
        if (yl_day < 7) { return yl_day + ' 天前'; }
        return (yl_d.getMonth() + 1) + ' 月 ' + yl_d.getDate() + ' 日';
    }

    function yl_dateText(yl_iso) {
        var yl_d = new Date(yl_iso);
        if (isNaN(yl_d.getTime())) { return ''; }
        var yl_pad = function (yl_n) { return (yl_n < 10 ? '0' : '') + yl_n; };
        return yl_d.getFullYear() + '-' + yl_pad(yl_d.getMonth() + 1) + '-' + yl_pad(yl_d.getDate()) +
            ' ' + yl_pad(yl_d.getHours()) + ':' + yl_pad(yl_d.getMinutes());
    }

    function yl_theme(yl_key) {
        return yl_themeClass[yl_key] || yl_themeClass.cyan;
    }

    /* ===== 过滤与排序 ===== */
    function yl_filtered() {
        var yl_kw = yl_state.keyword.trim().toLowerCase();
        var yl_rows = yl_state.rows.filter(function (yl_row) {
            if (yl_state.category !== '全部' && yl_row.category !== yl_state.category) { return false; }
            if (!yl_kw) { return true; }
            var yl_hay = [yl_row.title, yl_row.summary, yl_row.author, (yl_row.tags || []).join(' ')]
                .join(' ').toLowerCase();
            return yl_hay.indexOf(yl_kw) > -1;
        });

        yl_rows.sort(function (yl_a, yl_b) {
            if (yl_state.sort === 'views') { return (yl_b.views || 0) - (yl_a.views || 0); }
            if (yl_state.sort === 'likes') { return (yl_b.likes || 0) - (yl_a.likes || 0); }
            return new Date(yl_b.published_at) - new Date(yl_a.published_at);
        });
        return yl_rows;
    }

    function yl_isDefaultView() {
        return yl_state.category === '全部' && !yl_state.keyword.trim() && yl_state.sort === 'latest';
    }

    /* ===== 渲染：筛选条 ===== */
    function yl_renderFilters() {
        yl_el.filters.innerHTML = yl_state.categoryList.map(function (yl_cat) {
            var yl_on = yl_cat === yl_state.category ? ' yl_chip--on' : '';
            return '<button type="button" class="yl_chip' + yl_on + '" data-yl-cat="' + yl_esc(yl_cat) + '">' +
                yl_esc(yl_cat) + '</button>';
        }).join('');
    }

    /* ===== 渲染：置顶区 ===== */
    function yl_renderFeatured() {
        var yl_rows = yl_state.rows.filter(function (yl_row) { return yl_row.is_top; }).slice(0, 3);
        if (!yl_isDefaultView() || !yl_rows.length) {
            yl_el.featured.innerHTML = '';
            yl_el.featured.hidden = true;
            yl_state.featuredIds = [];
            return;
        }
        yl_el.featured.hidden = false;
        yl_state.featuredIds = yl_rows.map(function (yl_row) { return String(yl_row.id); });
        yl_el.featured.innerHTML = yl_rows.map(function (yl_row) {
            return '<article class="yl_fCard" data-yl-id="' + yl_row.id + '" tabindex="0" role="button">' +
                '<div class="yl_fTop">' +
                    '<span class="yl_pin">置顶</span>' +
                    '<span class="yl_time">' + yl_esc(yl_timeText(yl_row.published_at)) + '</span>' +
                '</div>' +
                '<h3 class="yl_fTitle">' + yl_esc(yl_row.title) + '</h3>' +
                '<p class="yl_fSummary">' + yl_esc(yl_row.summary) + '</p>' +
                '<div class="yl_fMeta">' +
                    '<span class="yl_catTag">' + yl_esc(yl_row.category) + '</span>' +
                    '<span>' + yl_esc(yl_row.author) + '</span>' +
                    '<span class="yl_dotSep">·</span>' +
                    '<span>' + yl_num(yl_row.views) + ' 浏览</span>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    /* ===== 渲染：列表 ===== */
    function yl_renderList() {
        var yl_rows = yl_filtered();
        var yl_featuredIds = yl_state.featuredIds;
        if (yl_featuredIds.length) {
            yl_rows = yl_rows.filter(function (yl_row) {
                return yl_featuredIds.indexOf(String(yl_row.id)) === -1;
            });
        }
        var yl_show = yl_rows.slice(0, yl_state.shown);

        yl_el.streamTitle.textContent = yl_state.category === '全部'
            ? (yl_state.keyword ? '搜索结果' : '最新报道')
            : yl_state.category + ' · 报道';
        yl_el.count.textContent = '共 ' + yl_rows.length + ' 条' +
            (yl_rows.length > yl_show.length ? ' · 已显示 ' + yl_show.length : '');

        if (!yl_rows.length) {
            yl_el.list.innerHTML = '<div class="yl_empty">没有找到匹配的新闻，试试其他分类或关键词。</div>';
            yl_el.more.hidden = true;
            return;
        }

        yl_el.list.innerHTML = yl_show.map(function (yl_row) {
            return '<article class="yl_item" data-yl-id="' + yl_row.id + '" tabindex="0" role="button">' +
                '<div class="yl_thumb ' + yl_theme(yl_row.cover_theme) + '">' +
                    '<span class="yl_thumbCat">' + yl_esc(yl_row.category) + '</span>' +
                    '<span class="yl_thumbGlyph">' + yl_esc(yl_row.title.slice(0, 1)) + '</span>' +
                '</div>' +
                '<div class="yl_itemMain">' +
                    '<div class="yl_itemTop">' +
                        '<span class="yl_catTag">' + yl_esc(yl_row.category) + '</span>' +
                        '<span class="yl_time">' + yl_esc(yl_timeText(yl_row.published_at)) + '</span>' +
                    '</div>' +
                    '<h3 class="yl_itemTitle">' + yl_esc(yl_row.title) + '</h3>' +
                    '<p class="yl_itemSummary">' + yl_esc(yl_row.summary) + '</p>' +
                    '<div class="yl_itemMeta">' +
                        '<span>' + yl_esc(yl_row.author) + '</span>' +
                        '<span class="yl_dotSep">·</span>' +
                        '<span>' + yl_num(yl_row.views) + ' 浏览</span>' +
                        '<span class="yl_dotSep">·</span>' +
                        '<span>' + yl_num(yl_row.likes) + ' 点赞</span>' +
                    '</div>' +
                '</div>' +
                '<span class="yl_itemArrow">→</span>' +
            '</article>';
        }).join('');

        yl_el.more.hidden = yl_rows.length <= yl_show.length;
    }

    function yl_render() {
        yl_renderFilters();
        yl_renderFeatured();
        yl_renderList();
    }

    /* ===== 详情弹窗 ===== */
    function yl_openDetail(yl_id) {
        var yl_row = yl_state.rows.filter(function (yl_r) { return String(yl_r.id) === String(yl_id); })[0];
        if (!yl_row) { return; }

        yl_el.mMeta.innerHTML = '<span class="yl_catTag">' + yl_esc(yl_row.category) + '</span>' +
            '<span>' + yl_esc(yl_dateText(yl_row.published_at)) + '</span>' +
            '<span class="yl_dotSep">·</span>' +
            '<span>' + yl_esc(yl_row.author) + '</span>' +
            (yl_row.source ? '<span class="yl_dotSep">·</span><span>' + yl_esc(yl_row.source) + '</span>' : '');

        yl_el.mTitle.textContent = yl_row.title;

        yl_el.mTags.innerHTML = (yl_row.tags || []).map(function (yl_tag) {
            return '<span class="yl_tag">#' + yl_esc(yl_tag) + '</span>';
        }).join('');

        var yl_paras = String(yl_row.content || yl_row.summary || '').split('\n').filter(function (yl_p) {
            return yl_p.trim() !== '';
        });
        yl_el.mBody.innerHTML = yl_paras.map(function (yl_p) {
            return '<p>' + yl_esc(yl_p.trim()) + '</p>';
        }).join('');

        yl_el.mFoot.innerHTML = '<span>' + yl_num(yl_row.views) + ' 次浏览</span>' +
            '<span>' + yl_num(yl_row.likes) + ' 人点赞</span>';

        yl_el.modal.hidden = false;
        document.body.classList.add('yl_lock');
    }

    function yl_closeDetail() {
        yl_el.modal.hidden = true;
        document.body.classList.remove('yl_lock');
    }

    /* ===== 数据拉取 ===== */
    function yl_setStatus(yl_ok, yl_text) {
        if (yl_el.dot) {
            yl_el.dot.classList.toggle('yl_dot--err', !yl_ok);
        }
        yl_el.status.textContent = yl_text;
    }

    function yl_skeleton() {
        var yl_one = '<div class="yl_skItem"><div class="yl_skThumb"></div><div class="yl_skLines">' +
            '<span class="yl_skLine yl_skLine--sm"></span><span class="yl_skLine"></span>' +
            '<span class="yl_skLine yl_skLine--md"></span></div></div>';
        yl_el.list.innerHTML = yl_one + yl_one + yl_one + yl_one;
        yl_el.more.hidden = true;
        yl_el.count.textContent = '';
    }

    function yl_errorBox(yl_msg) {
        yl_el.featured.hidden = true;
        yl_el.featured.innerHTML = '';
        yl_el.list.innerHTML = '<div class="yl_empty yl_empty--err">' +
            '<strong>数据加载失败</strong>' +
            '<span>' + yl_esc(yl_msg) + '</span>' +
            '<span class="yl_emptyHint">请检查网络连接，或确认 cdn/supabase.js 与 js/config.js 是否随页面一起拷贝。</span>' +
            '</div>';
        yl_el.count.textContent = '';
        yl_el.more.hidden = true;
    }

    function yl_boot() {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            yl_setStatus(false, '未找到 cdn/supabase.js');
            yl_errorBox('缺少 supabase-js 依赖文件');
            return;
        }

        var yl_client = window.supabase.createClient(yl_cfg.url, yl_cfg.key);
        yl_skeleton();

        var yl_query = yl_client
            .from(yl_cfg.table)
            .select('id,title,summary,content,category,author,source,tags,cover_theme,is_top,views,likes,published_at')
            .eq('is_published', true)
            .order('published_at', { ascending: false });

        yl_query.then(function (yl_res) {
            if (yl_res.error) {
                yl_setStatus(false, '连接失败：' + yl_res.error.message);
                yl_errorBox(yl_res.error.message);
                return;
            }

            yl_state.rows = yl_res.data || [];
            yl_state.categoryList = ['全部'].concat(
                yl_state.rows.map(function (yl_r) { return yl_r.category; })
                    .filter(function (yl_c, yl_i, yl_arr) { return yl_arr.indexOf(yl_c) === yl_i; })
            );

            var yl_totalViews = yl_state.rows.reduce(function (yl_sum, yl_r) { return yl_sum + (yl_r.views || 0); }, 0);
            yl_setStatus(true, '已连接 · ' + yl_state.rows.length + ' 条新闻 · 累计 ' + yl_num(yl_totalViews) + ' 浏览');
            yl_render();
        }).catch(function (yl_err) {
            yl_setStatus(false, '请求异常');
            yl_errorBox((yl_err && yl_err.message) || String(yl_err));
        });
    }

    /* ===== 交互绑定 ===== */
    yl_el.filters.addEventListener('click', function (yl_ev) {
        var yl_btn = yl_ev.target.closest('[data-yl-cat]');
        if (!yl_btn) { return; }
        yl_state.category = yl_btn.getAttribute('data-yl-cat');
        yl_state.shown = yl_cfg.pageSize || 6;
        yl_render();
    });

    var yl_searchTimer = null;
    yl_el.search.addEventListener('input', function () {
        clearTimeout(yl_searchTimer);
        yl_searchTimer = setTimeout(function () {
            yl_state.keyword = yl_el.search.value;
            yl_state.shown = yl_cfg.pageSize || 6;
            yl_render();
        }, 160);
    });

    yl_el.sort.addEventListener('change', function () {
        yl_state.sort = yl_el.sort.value;
        yl_state.shown = yl_cfg.pageSize || 6;
        yl_render();
    });

    yl_el.more.addEventListener('click', function () {
        yl_state.shown += yl_cfg.pageSize || 6;
        yl_renderList();
    });

    function yl_bindCardClick(yl_box) {
        yl_box.addEventListener('click', function (yl_ev) {
            var yl_card = yl_ev.target.closest('[data-yl-id]');
            if (yl_card) { yl_openDetail(yl_card.getAttribute('data-yl-id')); }
        });
        yl_box.addEventListener('keydown', function (yl_ev) {
            if (yl_ev.key !== 'Enter' && yl_ev.key !== ' ') { return; }
            var yl_card = yl_ev.target.closest('[data-yl-id]');
            if (yl_card) {
                yl_ev.preventDefault();
                yl_openDetail(yl_card.getAttribute('data-yl-id'));
            }
        });
    }

    yl_bindCardClick(yl_el.list);
    yl_bindCardClick(yl_el.featured);

    yl_el.modal.addEventListener('click', function (yl_ev) {
        if (yl_ev.target.getAttribute('data-yl-close') || yl_ev.target === yl_el.mClose) {
            yl_closeDetail();
        }
    });

    document.addEventListener('keydown', function (yl_ev) {
        if (yl_ev.key === 'Escape' && !yl_el.modal.hidden) { yl_closeDetail(); }
    });

    yl_boot();
})();
