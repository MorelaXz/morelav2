
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url as string);
const __dirname = path.dirname(__filename);


const _morelaSrc = path.join(process.cwd(), "./Morela.ts")
const _morelaDst = path.join(process.cwd(), "./Morela.js")
const CASE_FILE = fs.existsSync(_morelaSrc) ? _morelaSrc : _morelaDst;

const Case = {
    get: (n) => {
        let c = fs.readFileSync(CASE_FILE, "utf8");
        let r = /case .*?:/g;
        let f = (c.match(r) || []).find((v: string) => v.includes(n));
        if (!f) throw new Error(`Case "${n}" tidak ditemukan`);
        
        let s = c.indexOf(f),
            b = c.indexOf("{", s),
            i = b + 1,
            x = 1;
        while (x && i < c.length) c[i++] == "{" ? x++ : c[i - 1] == "}" && x--;
        return c.slice(s, i);
    },

    add: (cod) => {
        let c = fs.readFileSync(CASE_FILE, "utf8");
        if (!cod.includes("case")) throw new Error("harus ada 'case'.");
        if (!cod.includes("{") || !cod.includes("}")) throw new Error("blok ga ada, ada bodoh *{ }*");
        if (!cod.includes("break")) throw new Error("case harus ada 'break'.");

        let r = /case\s+["'`](.*?)["'`]\s*:/g, m;
        while ((m = r.exec(c)) !== null) {
            if ([`"`, `'`, "`"].some(q => cod.includes(`case ${q}${m[1]}${q}`))) {
                throw new Error(`Case "${m[1]}" sudah ada!`);
            }
        }

        let p = c.lastIndexOf("default:");
        if (p == -1) throw new Error("default: tidak ditemukan di Morela.js");

        let out = c.slice(0, p) + "\n  " + cod.trim() + "\n\n  " + c.slice(p);
        fs.writeFileSync(CASE_FILE, out);
    },

    delete: (ky) => {
        let c = fs.readFileSync(CASE_FILE, "utf8");
        let r = new RegExp(`case\\s+["'\`]${ky}["'\`]\\s*:\\s*`);
        let m = c.match(r);
        if (!m) throw new Error(`Case "${ky}" tidak ditemukan`);

        let s = c.indexOf(m[0]);
        let b = c.indexOf("{", s);
        if (b === -1) throw new Error("blok { ga ada");

        let x = 1, i = b + 1;
        while (x && i < c.length) {
            if (c[i] === "{") x++;
            else if (c[i] === "}") x--;
            i++;
        }
        let out = c.slice(0, s) + c.slice(i);
        fs.writeFileSync(CASE_FILE, out);
    },

    list: () => {
        let c = fs.readFileSync(CASE_FILE, "utf8");
        let r = /case\s+["'`](.*?)["'`]\s*:/g;
        let list = [], m;
        while ((m = r.exec(c)) !== null) list.push(m[1]);
        return list.length ? list.join("\n") : "Tidak ada case!";
    }
};

export default Case;