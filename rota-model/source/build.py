"""Builds dist/rota-model.html from the source files. Run from this folder: python3 build.py"""
import os
here = os.path.dirname(os.path.abspath(__file__))
r = lambda p: open(os.path.join(here, p), encoding='utf-8').read()
t = r('src/page.html').replace('/*CSS*/', r('src/design.css')).replace('<!--DEFS-->', r('src/defs.svg'))
t = t.replace('/*ENGINE1*/', r('engine/engine.js')).replace('/*ENGINE3*/', r('engine/engine3.js'))
open(os.path.join(here, 'dist/rota-model.html'), 'w', encoding='utf-8').write(t)
print('Built dist/rota-model.html,', len(t), 'characters')
