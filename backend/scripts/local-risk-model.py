"""Pinned local-only MLX model. Install local-risk-requirements.txt in a Python 3.12 venv first."""
import argparse
import json
import hashlib
import os
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
root = backend.parent
pin = json.loads((backend / 'risk-model.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action', choices=['download', 'serve'])
args = parser.parse_args()
model = Path(os.environ.get('ACCORD_RISK_MODEL_DIR', root / '.tools/risk-model-v2')).resolve()
cache = root / '.tools/risk-hf-cache'
(cache / 'hub').mkdir(parents=True, exist_ok=True)
if args.action == 'download':
    os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
    from huggingface_hub import snapshot_download
    snapshot_download(repo_id=pin['id'], revision=pin['revision'], local_dir=model,
                      allow_patterns=['*.json', '*.safetensors', '*.txt', 'LICENSE', 'README.md'])
    weights = model / 'model.safetensors'
    if weights.stat().st_size != pin['weights_bytes'] or hashlib.file_digest(weights.open('rb'), 'sha256').hexdigest() != pin['weights_sha256']:
        raise SystemExit('Pinned model weight checksum mismatch')
    (model / 'accord-pin.json').write_text(json.dumps(pin))
    print('Pinned local model downloaded:', model)
else:
    if json.loads((model / 'accord-pin.json').read_text()) != pin:
        raise SystemExit('Model pin missing or changed; run download first')
    weights = model / 'model.safetensors'
    if weights.stat().st_size != pin['weights_bytes'] or hashlib.file_digest(weights.open('rb'), 'sha256').hexdigest() != pin['weights_sha256']:
        raise SystemExit('Model weights changed since download')
    env = {'PATH': '/usr/bin:/bin:/opt/homebrew/bin', 'TMPDIR': '/tmp', 'HF_HOME': str(cache), 'HF_HUB_OFFLINE': '1'}
    os.execve(sys.executable, [sys.executable, '-m', 'mlx_lm.server', '--model', str(model),
              '--host', '127.0.0.1', '--port', '4002', '--allowed-origins', 'http://127.0.0.1:4001',
              '--prompt-cache-bytes', '536870912', '--max-tokens', str(pin['max_tokens']),
              '--decode-concurrency', '1', '--prompt-concurrency', '1', '--log-level', 'WARNING'], env)
