#!/usr/bin/env python3
"""Rebuild everything in order. Usage: python3 scripts/build_all.py [--sprites all|sample|skip]"""
import subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__))
mode = sys.argv[sys.argv.index("--sprites") + 1] if "--sprites" in sys.argv else "sample"
steps = ["build_items.py", "build_npcs.py", "validate_gifts_items.py", "build_bundles.py",
         "build_schedules.py", "build_collections.py", "build_guide.py"]
steps = [[s] for s in steps]
if mode != "skip": steps.append(["fetch_sprites.py", "--" + mode])
steps.append(["validate.py"])
for s in steps:
    print("==>", " ".join(s), flush=True)
    subprocess.run([sys.executable, os.path.join(here, s[0])] + s[1:], cwd=here, check=True)
