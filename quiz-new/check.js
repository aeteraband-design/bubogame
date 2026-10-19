// Проверка новых тем «Вопросов дня»: node quiz-new/check.js [тема ...]
// Файл темы: quiz-new/<тема>.js с вызовом QZ_SET('<тема>', [ [уровень, вопрос, ВЕРНЫЙ, неверный, неверный, неверный], ... ]);
const fs = require('fs'), path = require('path'), vm = require('vm');
const DIR = __dirname, LV = ['s', 'l', 'm', 'x'], NEED = +(process.env.NEED || 20);
const STUB = /(^|\s)(нет такого|не выбирать|все ответы|ни один из|ничего из|все варианты|todo|xxx|\?\?\?|заглушка|вариант [a-dа-г])($|\s|[.,!])/i;
const MAXQ = 140, MAXO = 34;
function qzHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 100000 + (Math.abs(h) % 899999999); }
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"'.,!?:;()\-—–]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 3));

const files = (process.argv.slice(2).length ? process.argv.slice(2).map((t) => t + '.js') : fs.readdirSync(DIR).filter((f) => f.endsWith('.js') && f !== 'check.js'));
let bad = 0;
for (const f of files) {
    const sets = {}; const ctx = { QZ_SET: (t, rows) => { sets[t] = rows; } };
    vm.createContext(ctx);
    try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), ctx, { filename: f }); } catch (e) { console.log('✗', f, 'не читается:', e.message); bad++; continue; }
    for (const [t, rows] of Object.entries(sets)) {
        const err = [], warn = [], cnt = {}, seenQ = {}, seenId = {};
        rows.forEach((r, i) => {
            const n = `#${i + 1}`;
            if (!Array.isArray(r) || r.length !== 6) { err.push(`${n}: не 6 полей`); return; }
            if (r.some((x) => typeof x !== 'string' || !x.trim())) { err.push(`${n}: пустое или не строка`); return; }
            if (r.some((x) => x !== x.trim() || /\s{2}/.test(x))) err.push(`${n}: лишние пробелы`);
            const [lv, q, ...o] = r;
            if (!LV.includes(lv)) err.push(`${n}: уровень «${lv}»`);
            cnt[lv] = (cnt[lv] || 0) + 1;
            if (!/\?»?$/.test(q)) warn.push(`${n}: вопрос без «?» в конце — ${q}`);
            const opts = o.map(norm);
            if (new Set(opts).size !== 4) err.push(`${n}: повтор среди вариантов — ${o.join(' / ')}`);
            [q, ...o].forEach((x) => { if (STUB.test(x)) err.push(`${n}: заглушка — ${x}`); });
            if (q.length > MAXQ) warn.push(`${n}: длинный вопрос (${q.length}) — ${q}`);
            o.forEach((x) => { if (x.length > MAXO) warn.push(`${n}: длинный вариант (${x.length}) — ${x}`); });
            const k = norm(q);
            if (seenQ[k]) err.push(`${n}: дубль вопроса (${seenQ[k]}) — ${q}`); else seenQ[k] = n;
            const id = qzHash(t + '|' + q);
            if (seenId[id]) err.push(`${n}: совпал id с ${seenId[id]}`); else seenId[id] = n;
        });
        // похожие вопросы: тот же верный ответ и много общих слов
        for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
            const a = rows[i], b = rows[j]; if (!Array.isArray(a) || !Array.isArray(b)) continue;
            const wa = words(a[1]), wb = words(b[1]); let c = 0; wa.forEach((w) => { if (wb.has(w)) c++; });
            const sim = c / Math.max(1, Math.min(wa.size, wb.size));
            if ((norm(a[2]) === norm(b[2]) && sim >= 0.4) || sim >= 0.75) warn.push(`похожи #${i + 1}[${a[0]}] и #${j + 1}[${b[0]}]: ${a[1]} ‖ ${b[1]}`);
        }
        LV.forEach((l) => { if ((cnt[l] || 0) !== NEED) err.push(`уровень ${l}: ${cnt[l] || 0} из ${NEED}`); });
        console.log(`${err.length ? '✗' : '✓'} ${t} (${f}): ${LV.map((l) => l + '=' + (cnt[l] || 0)).join(' ')}, всего ${rows.length}`);
        err.forEach((e) => console.log('  ОШИБКА', e)); warn.forEach((w) => console.log('  внимание', w));
        if (err.length) bad++;
    }
}
process.exit(bad ? 1 : 0);
