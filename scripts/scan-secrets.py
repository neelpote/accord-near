"""Fail closed on recognizable credential formats, without printing matched secrets."""
import re, subprocess, sys
patterns=[r'ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}',r'gh[pousr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{60,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'(?i)(?:private_key|secret_key)\s*["\x27]?\s*[:=]\s*["\x27]0x[0-9a-f]{64}']
files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0');bad=[]
for path in filter(None,files):
 try:data=open(path,'rb').read().decode('utf8')
 except (UnicodeError,OSError):continue
 if any(re.search(p,data) for p in patterns):bad.append(path)
if bad: print('Potential credentials in:',*bad,sep='\n');sys.exit(1)
print('Recognizable credential scan passed for tracked files (not a guarantee of no secrets).')
