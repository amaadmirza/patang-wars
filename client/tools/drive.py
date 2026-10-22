"""Dev helper: drive Edge via DevTools protocol.
python tools/drive.py URL OUTPREFIX "[wait_ms|]js" ...   -> screenshots OUTPREFIX0.png (after load), 1.png (after step 1)... + console/network errors"""
import sys, subprocess, json, time, base64, os, random, urllib.request, tempfile
import websocket
url, prefix, *steps = sys.argv[1:]
E = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
port = random.randint(9300, 9900)
p = subprocess.Popen([E, '--headless=new', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-certificate-errors', '--window-size=1280,640',
                      f'--remote-debugging-port={port}', '--remote-allow-origins=*', f'--user-data-dir={tempfile.gettempdir()}/edge-drive-{port}', 'about:blank'],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
tabs = None
for _ in range(60):
    try: tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')); break
    except Exception: time.sleep(.3)
ws = websocket.create_connection([t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl'], timeout=30)
logs = []; nid = 0
def send(method, **params):
    global nid; nid += 1; ws.send(json.dumps({'id': nid, 'method': method, 'params': params}))
    while True:
        d = json.loads(ws.recv())
        ev(d)
        if d.get('id') == nid: return d
def ev(d):
    m = d.get('method')
    if m == 'Runtime.exceptionThrown':
        x = d['params']['exceptionDetails']; logs.append('EXC ' + (x.get('exception', {}).get('description') or x['text']).split('\n')[0])
    elif m == 'Runtime.consoleAPICalled' and d['params']['type'] in ('error',):
        logs.append('console.error ' + ' '.join(str(a.get('value', a.get('description'))) for a in d['params']['args'])[:200])
    elif m == 'Network.responseReceived' and d['params']['response']['status'] >= 400:
        logs.append(f"NET {d['params']['response']['status']} {d['params']['response']['url']}")
    elif m == 'Network.loadingFailed': logs.append('NETFAIL ' + d['params'].get('errorText', ''))
def wait(sec):
    end = time.time() + sec; ws.settimeout(.2)
    while time.time() < end:
        try: ev(json.loads(ws.recv()))
        except Exception: pass
    ws.settimeout(30)
def shot(i):
    d = send('Page.captureScreenshot', format='png'); open(f'{prefix}{i}.png', 'wb').write(base64.b64decode(d['result']['data']))
send('Runtime.enable'); send('Network.enable'); send('Page.enable'); send('Page.navigate', url=url); wait(7); shot(0)
for i, s in enumerate(steps, 1):
    w = 2.5
    if '|' in s and s.split('|')[0].isdigit(): w = int(s.split('|')[0]) / 1000; s = s.split('|', 1)[1]
    r = send('Runtime.evaluate', expression=s, awaitPromise=True)
    if 'exceptionDetails' in r['result']: logs.append(f'STEP{i} ' + str(r['result']['exceptionDetails'].get('text')) + ' ' + str(r['result']['exceptionDetails'].get('exception', {}).get('description', ''))[:150])
    elif r['result']['result'].get('value') is not None: print(f'step{i} =>', r['result']['result']['value'])
    wait(w); shot(i)
seen = []
for l in logs:
    if l not in seen: seen.append(l)
print('\n'.join(seen[:40]) or 'no console/network errors')
ws.close(); p.kill()
