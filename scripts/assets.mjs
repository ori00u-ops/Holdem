import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
// Keep the existing editable icon, adapt only its palette to the new brand.
let svg=await readFile('public/icon.svg','utf8');
for(const [from,to] of Object.entries({'#173b35':'#234332','#0f172a':'#13271d','#020617':'#0b1715','#fde68a':'#ecd5a4','#f59e0b':'#b7985c','#34d399':'#c2b47d','#f8fafc':'#f4f0e5','#cbd5e1':'#cec5a8','#dc2626':'#ae5756','#111827':'#24392b','#fef3c7':'#ede1c0','#422006':'#283e2b'}))svg=svg.replaceAll(from,to);
await writeFile('public/icon.svg',svg);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage();for(const size of [192,512]){await page.setViewportSize({width:size,height:size});await page.setContent(`<html><body style="margin:0;background:#0b1715">${svg.replace('<svg ','<svg width="100%" height="100%" ')}</body></html>`);await page.screenshot({path:`public/icon-${size}.png`});}console.log('Updated existing vector palette and rendered 192/512 PNG app icons.');}finally{await browser.close();}
