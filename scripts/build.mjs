import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>readFile(path.join(root,p),'utf8');
const parts=await Promise.all(['src/engine.js','src/content.js','src/app.js'].map(read));
const script=parts.map(s=>s.replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
// Parse before emitting the standalone artifact. It remains runnable directly from file://.
new Function(script);
const html=(await read('src/index.html')).replace('/* APP_STYLES */',await read('src/styles.css')).replace('/* APP_SCRIPT */',()=>`(()=>{\n'use strict';\n${script}\n})();`);
await mkdir(path.join(root,'dist'),{recursive:true});
await writeFile(path.join(root,'dist/index.html'),html);
await writeFile(path.join(root,'index.html'),html);
await writeFile(path.join(root,'Index.html'),html);
for(const file of await readdir(path.join(root,'public'))){await copyFile(path.join(root,'public',file),path.join(root,'dist',file));await copyFile(path.join(root,'public',file),path.join(root,file));}
console.log(`Built standalone index.html (${Math.round(Buffer.byteLength(html)/1024)} KB) and dist/.`);
