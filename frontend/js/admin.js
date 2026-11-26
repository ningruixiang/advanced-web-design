(function () {
    'use strict';

    var yl_cfg = window.yl_supabaseConfig || {};
    var yl_el = {
        loginView: document.getElementById('yl_loginView'),
        consoleView: document.getElementById('yl_consoleView'),
        loginForm: document.getElementById('yl_loginForm'),
        loginBtn: document.getElementById('yl_loginBtn'),
        loginErr: document.getElementById('yl_loginErr'),
        email: document.getElementById('yl_email'),
        password: document.getElementById('yl_password'),
        aUser: document.getElementById('yl_aUser'),
        aEmail: document.getElementById('yl_aEmail'),
        logout: document.getElementById('yl_logout'),
        stats: document.getElementById('yl_stats'),
        panelCount: document.getElementById('yl_panelCount'),
        kw: document.getElementById('yl_kw'),
        statusFilter: document.getElementById('yl_statusFilter'),
        refresh: document.getElementById('yl_refresh'),
        newBtn: document.getElementById('yl_new'),
        tbody: document.getElementById('yl_tbody'),
        tableState: document.getElementById('yl_tableState'),
        tfoot: document.getElementById('yl_tfoot'),
        editor: document.getElementById('yl_editor'),
        editorForm: document.getElementById('yl_editorForm'),
        editorTitle: document.getElementById('yl_editorTitle'),
        editorClose: document.getElementById('yl_editorClose'),
        editorCancel: document.getElementById('yl_editorCancel'),
        editorSave: document.getElementById('yl_editorSave'),
        formErr: document.getElementById('yl_formErr'),
        fTitle: document.getElementById('yl_f_title'),
        fSummary: document.getElementById('yl_f_summary'),
        fContent: document.getElementById('yl_f_content'),
        fCategory: document.getElementById('yl_f_category'),
        fTheme: document.getElementById('yl_f_theme'),
        fAuthor: document.getElementById('yl_f_author'),
        fSource: document.getElementById('yl_f_source'),
        fTags: document.getElementById('yl_f_tags'),
        fTime: document.getElementById('yl_f_time'),
        fViews: document.getElementById('yl_f_views'),
        fLikes: document.getElementById('yl_f_likes'),
        fTop: document.getElementById('yl_f_top'),
        fPublished: document.getElementById('yl_f_published'),
        confirm: document.getElementById('yl_confirm'),
        confirmText: document.getElementById('yl_confirmText'),
        confirmNo: document.getElementById('yl_confirmNo'),
        confirmYes: document.getElementById('yl_confirmYes'),
        toast: document.getElementById('yl_toast')
    };

    var yl_state = {
        rows: [],
        editingId: null,
        pendingDeleteId: null,
        loading: false
    };

    var yl_sb = null;

    /* ===== 工具 ===== */
    function yl_esc(yl_s) {
        return String(yl_s === null || yl_s === undefined ? '' : yl_s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function yl_pad(yl_n) {
        return (yl_n < 10 ? '0' : '') + yl_n;
    }

    function yl_dateText(yl_iso) {
        var yl_d = new Date(yl_iso);
        if (isNaN(yl_d.getTime())) { return '—'; }
        return yl_d.getFullYear() + '-' + yl_pad(yl_d.getMonth() + 1) + '-' + yl_pad(yl_d.getDate()) +
            ' ' + yl_pad(yl_d.getHours()) + ':' + yl_pad(yl_d.getMinutes());
    }

    function yl_toLocalInput(yl_iso) {
        var yl_d = yl_iso ? new Date(yl_iso) : new Date();
        if (isNaN(yl_d.getTime())) { yl_d = new Date(); }
        return yl_d.getFullYear() + '-' + yl_pad(yl_d.getMonth() + 1) + '-' + yl_pad(yl_d.getDate()) +
            'T' + yl_pad(yl_d.getHours()) + ':' + yl_pad(yl_d.getMinutes());
    }

    function yl_toast(yl_msg, yl_isErr) {
        yl_el.toast.textContent = yl_msg;
        yl_el.toast.classList.toggle('yl_toast--err', !!yl_isErr);
        yl_el.toast.hidden = false;
        clearTimeout(yl_toast._t);
        yl_toast._t = setTimeout(function () { yl_el.toast.hidden = true; }, 2400);
    }

    /* ===== 登录态 ===== */
    function yl_isAdmin(yl_session) {
        var yl_meta = yl_session && yl_session.user && yl_session.user.app_metadata;
        return !!(yl_meta && yl_meta.role === 'admin');
    }

    function yl_showLogin(yl_msg) {
        yl_el.loginView.hidden = false;
        yl_el.consoleView.hidden = true;
        yl_el.aUser.hidden = true;
        if (yl_msg) {
            yl_el.loginErr.textContent = yl_msg;
            yl_el.loginErr.hidden = false;
        }
    }

    function yl_showConsole(yl_session) {
        yl_el.loginView.hidden = true;
        yl_el.consoleView.hidden = false;
        yl_el.aUser.hidden = false;
        yl_el.loginErr.hidden = true;
        yl_el.aEmail.textContent = yl_session.user.email;
        yl_load();
    }

    function yl_handleSession(yl_session) {
        if (yl_session && yl_isAdmin(yl_session)) {
            yl_showConsole(yl_session);
            return;
        }
        if (yl_session) {
            yl_sb.auth.signOut();
            yl_showLogin('当前账号不是管理员（app_metadata.role 不是 admin），已自动退出。');
            return;
        }
        yl_showLogin();
    }

    /* ===== 数据 ===== */
    function yl_filtered() {
        var yl_kw = yl_el.kw.value.trim().toLowerCase();
        var yl_mode = yl_el.statusFilter.value;
        return yl_state.rows.filter(function (yl_row) {
            if (yl_mode === 'published' && !yl_row.is_published) { return false; }
            if (yl_mode === 'draft' && yl_row.is_published) { return false; }
            if (!yl_kw) { return true; }
            return (yl_row.title + ' ' + yl_row.summary + ' ' + yl_row.author).toLowerCase().indexOf(yl_kw) > -1;
        });
    }

    function yl_renderStats() {
        var yl_total = yl_state.rows.length;
        var yl_pub = yl_state.rows.filter(function (yl_r) { return yl_r.is_published; }).length;
        var yl_draft = yl_total - yl_pub;
        var yl_top = yl_state.rows.filter(function (yl_r) { return yl_r.is_top; }).length;

        var yl_items = [
            { yl_label: '全部新闻', yl_val: yl_total, yl_cls: '' },
            { yl_label: '已发布', yl_val: yl_pub, yl_cls: 'yl_stat--accent' },
            { yl_label: '草稿', yl_val: yl_draft, yl_cls: 'yl_stat--warn' },
            { yl_label: '置顶', yl_val: yl_top, yl_cls: '' }
        ];
        yl_el.stats.innerHTML = yl_items.map(function (yl_it) {
            return '<div class="yl_stat ' + yl_it.yl_cls + '"><span>' + yl_it.yl_label +
                '</span><b>' + yl_it.yl_val + '</b></div>';
        }).join('');
    }

    function yl_renderTable() {
        var yl_rows = yl_filtered();
        yl_el.panelCount.textContent = '共 ' + yl_rows.length + ' 条';

        if (yl_state.loading) {
            yl_el.tbody.innerHTML = '';
            yl_el.tableState.hidden = false;
            yl_el.tableState.textContent = '正在加载数据…';
            return;
        }

        if (!yl_rows.length) {
            yl_el.tbody.innerHTML = '';
            yl_el.tableState.hidden = false;
            yl_el.tableState.textContent = yl_state.rows.length
                ? '没有符合筛选条件的新闻。'
                : '还没有任何新闻，点击右上角「新建新闻」开始录入。';
            yl_el.tfoot.textContent = '';
            return;
        }

        yl_el.tableState.hidden = true;
        yl_el.tbody.innerHTML = yl_rows.map(function (yl_row) {
            var yl_status = yl_row.is_published
                ? '<span class="yl_badge yl_badge--pub">已发布</span>'
                : '<span class="yl_badge yl_badge--draft">草稿</span>';
            if (yl_row.is_top) {
                yl_status += '<span class="yl_badge yl_badge--top">置顶</span>';
            }
            return '<tr data-yl-id="' + yl_row.id + '">' +
                '<td>' +
                    '<div class="yl_tTitle">' + yl_esc(yl_row.title) + '</div>' +
                    '<div class="yl_tMeta">' + yl_esc(yl_row.source || '未填写来源') + '</div>' +
                '</td>' +
                '<td>' + yl_esc(yl_row.category) + '</td>' +
                '<td>' + yl_esc(yl_row.author) + '</td>' +
                '<td>' + yl_status + '</td>' +
                '<td class="yl_colNum">' + (yl_row.views || 0) + '</td>' +
                '<td>' + yl_dateText(yl_row.published_at) + '</td>' +
                '<td>' +
                    '<div class="yl_ops">' +
                        '<button class="yl_op" data-yl-act="edit" type="button">编辑</button>' +
                        '<button class="yl_op" data-yl-act="toggle-pub" type="button">' +
                            (yl_row.is_published ? '转草稿' : '发布') + '</button>' +
                        '<button class="yl_op" data-yl-act="toggle-top" type="button">' +
                            (yl_row.is_top ? '取消置顶' : '置顶') + '</button>' +
                        '<button class="yl_op yl_op--danger" data-yl-act="del" type="button">删除</button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        }).join('');

        yl_el.tfoot.textContent = '已显示 ' + yl_rows.length + ' / ' + yl_state.rows.length + ' 条 · 数据来自 Supabase 表 public.yl_news';
    }

    function yl_render() {
        yl_renderStats();
        yl_renderTable();
    }

    /* ===== 加载 ===== */
    function yl_load() {
        yl_state.loading = true;
        yl_renderTable();

        yl_sb.from(yl_cfg.table)
            .select('id,title,summary,content,category,author,source,tags,cover_theme,is_top,is_published,views,likes,published_at,created_at')
            .order('published_at', { ascending: false })
            .then(function (yl_res) {
                yl_state.loading = false;
                if (yl_res.error) {
                    yl_el.tableState.hidden = false;
                    yl_el.tableState.textContent = '加载失败：' + yl_res.error.message;
                    yl_el.tbody.innerHTML = '';
                    yl_toast('加载失败：' + yl_res.error.message, true);
                    return;
                }
                yl_state.rows = yl_res.data || [];
                yl_render();
            }, function (yl_err) {
                yl_state.loading = false;
                yl_el.tableState.hidden = false;
                yl_el.tableState.textContent = '请求异常：' + ((yl_err && yl_err.message) || yl_err);
                yl_el.tbody.innerHTML = '';
            });
    }

    /* ===== 编辑器 ===== */
    function yl_formErr(yl_msg) {
        if (!yl_msg) {
            yl_el.formErr.hidden = true;
            return;
        }
        yl_el.formErr.textContent = yl_msg;
        yl_el.formErr.hidden = false;
    }

    function yl_openEditor(yl_id) {
        yl_state.editingId = yl_id || null;
        yl_formErr('');
        yl_el.editorForm.reset();

        if (!yl_id) {
            yl_el.editorTitle.textContent = '新建新闻';
            yl_el.fTime.value = yl_toLocalInput();
            yl_el.fViews.value = 0;
            yl_el.fLikes.value = 0;
            yl_el.fPublished.checked = true;
            yl_el.fTop.checked = false;
            yl_el.fTheme.value = 'cyan';
        } else {
            var yl_row = yl_state.rows.filter(function (yl_r) { return String(yl_r.id) === String(yl_id); })[0];
            if (!yl_row) { return; }
            yl_el.editorTitle.textContent = '编辑新闻 #' + yl_row.id;
            yl_el.fTitle.value = yl_row.title || '';
            yl_el.fSummary.value = yl_row.summary || '';
            yl_el.fContent.value = yl_row.content || '';
            yl_el.fCategory.value = yl_row.category || '校园';
            yl_el.fTheme.value = yl_row.cover_theme || 'cyan';
            yl_el.fAuthor.value = yl_row.author || '';
            yl_el.fSource.value = yl_row.source || '';
            yl_el.fTags.value = (yl_row.tags || []).join(',');
            yl_el.fTime.value = yl_toLocalInput(yl_row.published_at);
            yl_el.fViews.value = yl_row.views || 0;
            yl_el.fLikes.value = yl_row.likes || 0;
            yl_el.fTop.checked = !!yl_row.is_top;
            yl_el.fPublished.checked = !!yl_row.is_published;
        }

        yl_el.editor.hidden = false;
        yl_el.fTitle.focus();
    }

    function yl_closeEditor() {
        yl_el.editor.hidden = true;
        yl_state.editingId = null;
    }

    function yl_collect() {
        var yl_tags = yl_el.fTags.value.split(/[,，]/).map(function (yl_t) { return yl_t.trim(); })
            .filter(function (yl_t) { return yl_t !== ''; });
        var yl_time = yl_el.fTime.value ? new Date(yl_el.fTime.value) : new Date();

        return {
            title: yl_el.fTitle.value.trim(),
            summary: yl_el.fSummary.value.trim(),
            content: yl_el.fContent.value.trim(),
            category: yl_el.fCategory.value,
            author: yl_el.fAuthor.value.trim(),
            source: yl_el.fSource.value.trim() || null,
            tags: yl_tags,
            cover_theme: yl_el.fTheme.value,
            views: Math.max(0, parseInt(yl_el.fViews.value, 10) || 0),
            likes: Math.max(0, parseInt(yl_el.fLikes.value, 10) || 0),
            is_top: yl_el.fTop.checked,
            is_published: yl_el.fPublished.checked,
            published_at: isNaN(yl_time.getTime()) ? new Date().toISOString() : yl_time.toISOString()
        };
    }

    function yl_save(yl_ev) {
        yl_ev.preventDefault();

        var yl_payload = yl_collect();
        if (!yl_payload.title || !yl_payload.summary || !yl_payload.author) {
            yl_formErr('标题、摘要、作者为必填项。');
            return;
        }
        if (yl_payload.title.length < 4) {
            yl_formErr('标题至少 4 个字。');
            return;
        }

        yl_formErr('');
        yl_el.editorSave.disabled = true;
        yl_el.editorSave.textContent = '保存中…';

        var yl_req;
        if (yl_state.editingId) {
            yl_req = yl_sb.from(yl_cfg.table).update(yl_payload).eq('id', yl_state.editingId);
        } else {
            yl_req = yl_sb.from(yl_cfg.table).insert(yl_payload);
        }

        yl_req.then(function (yl_res) {
            yl_el.editorSave.disabled = false;
            yl_el.editorSave.textContent = '保存';
            if (yl_res.error) {
                yl_formErr('保存失败：' + yl_res.error.message);
                return;
            }
            yl_toast(yl_state.editingId ? '已更新新闻' : '已创建新闻');
            yl_closeEditor();
            yl_load();
        }, function (yl_err) {
            yl_el.editorSave.disabled = false;
            yl_el.editorSave.textContent = '保存';
            yl_formErr('保存失败：' + ((yl_err && yl_err.message) || yl_err));
        });
    }

    /* ===== 行操作 ===== */
    function yl_patch(yl_id, yl_payload, yl_okText) {
        yl_sb.from(yl_cfg.table).update(yl_payload).eq('id', yl_id).then(function (yl_res) {
            if (yl_res.error) {
                yl_toast('操作失败：' + yl_res.error.message, true);
                return;
            }
            yl_toast(yl_okText);
            yl_load();
        });
    }

    function yl_askDelete(yl_id) {
        var yl_row = yl_state.rows.filter(function (yl_r) { return String(yl_r.id) === String(yl_id); })[0];
        if (!yl_row) { return; }
        yl_state.pendingDeleteId = yl_id;
        yl_el.confirmText.textContent = '「' + yl_row.title + '」将被永久删除，且无法恢复。';
        yl_el.confirm.hidden = false;
    }

    function yl_doDelete() {
        var yl_id = yl_state.pendingDeleteId;
        if (!yl_id) { return; }
        yl_el.confirmYes.disabled = true;

        yl_sb.from(yl_cfg.table).delete().eq('id', yl_id).then(function (yl_res) {
            yl_el.confirmYes.disabled = false;
            yl_el.confirm.hidden = true;
            yl_state.pendingDeleteId = null;
            if (yl_res.error) {
                yl_toast('删除失败：' + yl_res.error.message, true);
                return;
            }
            yl_toast('已删除该新闻');
            yl_load();
        });
    }

    /* ===== 事件 ===== */
    yl_el.loginForm.addEventListener('submit', function (yl_ev) {
        yl_ev.preventDefault();
        yl_el.loginErr.hidden = true;
        yl_el.loginBtn.disabled = true;
        yl_el.loginBtn.textContent = '登录中…';

        yl_sb.auth.signInWithPassword({
            email: yl_el.email.value.trim(),
            password: yl_el.password.value
        }).then(function (yl_res) {
            yl_el.loginBtn.disabled = false;
            yl_el.loginBtn.textContent = '登录后台';
            if (yl_res.error) {
                yl_el.loginErr.textContent = '登录失败：' + yl_res.error.message;
                yl_el.loginErr.hidden = false;
                return;
            }
            yl_el.password.value = '';
            yl_handleSession(yl_res.data.session);
        }, function (yl_err) {
            yl_el.loginBtn.disabled = false;
            yl_el.loginBtn.textContent = '登录后台';
            yl_el.loginErr.textContent = '登录异常：' + ((yl_err && yl_err.message) || yl_err);
            yl_el.loginErr.hidden = false;
        });
    });

    yl_el.logout.addEventListener('click', function () {
        yl_sb.auth.signOut().then(function () {
            yl_state.rows = [];
            yl_showLogin();
            yl_toast('已退出登录');
        });
    });

    yl_el.refresh.addEventListener('click', function () { yl_load(); });

    yl_el.kw.addEventListener('input', function () { yl_renderTable(); });
    yl_el.statusFilter.addEventListener('change', function () { yl_renderTable(); });

    yl_el.newBtn.addEventListener('click', function () { yl_openEditor(null); });
    yl_el.editorClose.addEventListener('click', yl_closeEditor);
    yl_el.editorCancel.addEventListener('click', yl_closeEditor);
    yl_el.editorForm.addEventListener('submit', yl_save);

    yl_el.tbody.addEventListener('click', function (yl_ev) {
        var yl_btn = yl_ev.target.closest('[data-yl-act]');
        if (!yl_btn) { return; }
        var yl_tr = yl_btn.closest('tr');
        if (!yl_tr) { return; }
        var yl_id = yl_tr.getAttribute('data-yl-id');
        var yl_row = yl_state.rows.filter(function (yl_r) { return String(yl_r.id) === String(yl_id); })[0];
        if (!yl_row) { return; }

        var yl_act = yl_btn.getAttribute('data-yl-act');
        if (yl_act === 'edit') {
            yl_openEditor(yl_id);
        } else if (yl_act === 'toggle-pub') {
            yl_patch(yl_id, { is_published: !yl_row.is_published },
                yl_row.is_published ? '已转为草稿' : '已发布');
        } else if (yl_act === 'toggle-top') {
            yl_patch(yl_id, { is_top: !yl_row.is_top },
                yl_row.is_top ? '已取消置顶' : '已设为置顶');
        } else if (yl_act === 'del') {
            yl_askDelete(yl_id);
        }
    });

    yl_el.confirmNo.addEventListener('click', function () {
        yl_el.confirm.hidden = true;
        yl_state.pendingDeleteId = null;
    });
    yl_el.confirmYes.addEventListener('click', yl_doDelete);

    document.addEventListener('keydown', function (yl_ev) {
        if (yl_ev.key !== 'Escape') { return; }
        if (!yl_el.confirm.hidden) {
            yl_el.confirm.hidden = true;
            yl_state.pendingDeleteId = null;
        } else if (!yl_el.editor.hidden) {
            yl_closeEditor();
        }
    });

    yl_el.editor.addEventListener('click', function (yl_ev) {
        if (yl_ev.target.getAttribute('data-yl-close')) { yl_closeEditor(); }
    });
    yl_el.confirm.addEventListener('click', function (yl_ev) {
        if (yl_ev.target.getAttribute('data-yl-close')) {
            yl_el.confirm.hidden = true;
            yl_state.pendingDeleteId = null;
        }
    });

    /* ===== 启动 ===== */
    function yl_boot() {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            yl_showLogin('未找到 cdn/supabase.js，请确认该文件随页面一起拷贝。');
            yl_el.loginBtn.disabled = true;
            return;
        }

        yl_sb = window.supabase.createClient(yl_cfg.url, yl_cfg.key);

        yl_sb.auth.getSession().then(function (yl_res) {
            yl_handleSession(yl_res.data ? yl_res.data.session : null);
        });
    }

    yl_boot();
})();
