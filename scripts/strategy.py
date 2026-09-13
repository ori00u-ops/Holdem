from pathlib import Path
import html,re
root=Path(__file__).resolve().parents[1]
source=(root/'STRATEGY.ko.md').read_text(encoding='utf-8')
def inline(s):
 s=html.escape(s)
 s=re.sub(r'\[([^\]]+)\]\((https?://[^ )]+)\)',r'<a href="\2" target="_blank" rel="noopener">\1</a>',s)
 s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
 return re.sub(r'`([^`]+)`',r'<code>\1</code>',s)
out=[];table=False
for line in source.splitlines():
 if line.startswith('|'):
  if re.match(r'^\|[ :|\-]+$',line):continue
  cells=line.strip('|').split('|')
  if not table:out.append('<div class="table-wrap"><table><thead>');tag='th';table=True
  else:tag='td'
  out.append('<tr>'+''.join(f'<{tag}>{inline(c.strip())}</{tag}>' for c in cells)+'</tr>')
  if tag=='th':out.append('</thead><tbody>')
  continue
 if table:out.append('</tbody></table></div>');table=False
 if not line:continue
 if line.startswith('# '):out.append('<h1>'+inline(line[2:])+'</h1>')
 elif line.startswith('## '):out.append('<h2>'+inline(line[3:])+'</h2>')
 else:out.append('<p>'+inline(line)+'</p>')
if table:out.append('</tbody></table></div>')
page='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>홀덤 도장 · 발전 및 수익화 전략</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f0e7;color:#1c3027;font:16px/1.9 system-ui,'Malgun Gothic',sans-serif}main{max-width:1040px;margin:auto;padding:40px 28px 90px}h1{font-size:clamp(28px,4vw,42px);line-height:1.45;letter-spacing:-.05em;margin:25px 0}h2{font-size:26px;margin:55px 0 22px;padding-top:22px;border-top:2px solid #b6a179;line-height:1.5}p{margin:18px 0}strong{color:#163b2b}a{color:#245b50;text-underline-offset:4px}table{border-collapse:collapse;width:100%;font-size:14px;min-width:560px}th{text-align:left;background:#17372c;color:#f4edda}th,td{padding:14px;border:1px solid #d1d4c6;vertical-align:top}td{background:#fffdf5}.table-wrap{overflow-x:auto;border-radius:9px;margin:24px 0}code{background:#e7e4d8;padding:2px 5px;border-radius:4px}header{letter-spacing:.12em;color:#68786c;font-size:12px;border-bottom:1px solid #bdc6b8;padding:15px 0}.print{float:right;background:#17372c;color:white;border:0;padding:9px 15px;border-radius:7px;cursor:pointer}@media print{body{background:white;font-size:11px}main{max-width:none;padding:0}h1{font-size:28px}h2{break-after:avoid;font-size:20px;margin-top:30px}tr{break-inside:avoid}.print{display:none}.table-wrap{overflow:visible}table{min-width:0;font-size:10px}th,td{padding:7px}a{color:inherit}}</style></head><body><main><header>HOLDEM DOJO · PRODUCT & GROWTH STRATEGY <button class="print" onclick="window.print()">인쇄 / PDF 저장</button></header>'''+''.join(out)+'</main></body></html>'
(root/'STRATEGY.ko.html').write_text(page,encoding='utf-8')
print('Created readable strategy HTML')
