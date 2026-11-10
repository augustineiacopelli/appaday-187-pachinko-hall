#!/usr/bin/env python3
"""Assemble index.html from src/*.js and src/shell.html. Run from anywhere."""
import glob, os, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
parts = sorted(glob.glob(os.path.join(src, 's[0-9][0-9]_*.js')))
js = '\n\n'.join(open(p, encoding='utf-8').read().rstrip() for p in parts)
shell = open(os.path.join(src, 'shell.html'), encoding='utf-8').read()
assert shell.count('/*__SCRIPT__*/') == 1
out = shell.replace('/*__SCRIPT__*/', js)
dest = os.path.join(root, '..', 'index.html')
open(dest, 'w', encoding='utf-8', newline='\n').write(out)
print('wrote', dest, len(out), 'bytes', out.count('\n') + 1, 'lines')
