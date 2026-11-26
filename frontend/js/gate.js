/*
  姓名：宁瑞祥
  学号：2001010503
  建立时间：2026-11-26 16:32:10
  使用的大模型：DeepSeek-V4.1-Flash
  功能：后台管理页的前端访问口令（软保护层，仅前端遮挡，真实权限仍由 Supabase Auth + RLS 控制）
*/
(function () {
    // 口令 "yl-admin-2026" 的 FNV-1a 32 位哈希；改口令时把新口令填进 window.yl_hash() 取哈希后替换此处
    var yl_gateHash = 'ee092a5f';
    var yl_gateKey = 'yl_gate_ok';
    var yl_gate = document.getElementById('yl_gate');
    var yl_form = document.getElementById('yl_gateForm');
    var yl_input = document.getElementById('yl_gateCode');
    var yl_err = document.getElementById('yl_gateErr');

    function yl_hash(yl_text) {
        var yl_h = 2166136261;
        for (var yl_i = 0; yl_i < yl_text.length; yl_i++) {
            yl_h ^= yl_text.charCodeAt(yl_i);
            yl_h = Math.imul(yl_h, 16777619);
        }
        return (yl_h >>> 0).toString(16);
    }
    window.yl_hash = yl_hash;

    function yl_store(yl_value) {
        try {
            sessionStorage.setItem(yl_gateKey, yl_value);
        } catch (yl_e) {
            // file:// 等环境下 sessionStorage 可能不可用，退化为仅当前页面有效
        }
    }

    function yl_passed() {
        try {
            return sessionStorage.getItem(yl_gateKey) === '1';
        } catch (yl_e) {
            return false;
        }
    }

    if (yl_passed()) {
        yl_gate.hidden = true;
        return;
    }

    document.body.style.overflow = 'hidden';
    yl_input.focus();

    yl_form.addEventListener('submit', function (yl_event) {
        yl_event.preventDefault();
        if (yl_hash(yl_input.value.trim()) === yl_gateHash) {
            yl_store('1');
            yl_gate.hidden = true;
            document.body.style.overflow = '';
        } else {
            yl_err.hidden = false;
            yl_err.textContent = '口令不正确，请重试。';
            yl_input.value = '';
            yl_input.focus();
        }
    });
})();
