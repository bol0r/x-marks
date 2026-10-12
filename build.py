# Składa index.html (pełna strona do hostowania) i _artifact.html (podgląd w Claude) z _fragment.html + olc.js
frag = open('_fragment.html').read()
import re
olc = re.sub(r'if\(typeof module !== "undefined"\) module\.exports = \{[^}]*\};', '', open('olc.js').read())
frag = frag.replace('/*OLC*/', olc)
open('_artifact.html', 'w').write(frag.replace('__LEAFLET_SRC__', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'))
frag = frag.replace('__LEAFLET_SRC__', 'vendor/leaflet-1.9.4.js')
i = frag.index('<style>'); j = frag.index('</style>') + len('</style>')
doc = ('<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + frag[:i] + frag[i:j] + '\n</head>\n<body>\n' + frag[j:].lstrip() + '\n</body>\n</html>\n')
open('index.html', 'w').write(doc)
print('ok', len(doc))
