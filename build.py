# Składa index.html (pełna strona do hostowania) i _artifact.html (podgląd w Claude) z _fragment.html + olc.js
frag = open('_fragment.html').read()
olc = open('olc.js').read().replace('if(typeof module !== "undefined") module.exports = {olcEncode, olcDecode, olcRecover, parsePlace, findCity};', '')
frag = frag.replace('/*OLC*/', olc)
open('_artifact.html', 'w').write(frag)
i = frag.index('<style>'); j = frag.index('</style>') + len('</style>')
doc = ('<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + frag[:i] + frag[i:j] + '\n</head>\n<body>\n' + frag[j:].lstrip() + '\n</body>\n</html>\n')
open('index.html', 'w').write(doc)
print('ok', len(doc))
