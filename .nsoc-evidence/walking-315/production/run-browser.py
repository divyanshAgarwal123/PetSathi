import pathlib,subprocess,json,socket,time,datetime
root=pathlib.Path('/Users/divyanshagarwal/Documents/ChatGPT/randoms/nsoc');out=pathlib.Path(__file__).parent;processes=[];stopped=[]
try:
 for name,port in [('petsathi315',5841),('petsathi315-parent',5842)]:
  log=(out/(name+'-http.log')).open('w');p=subprocess.Popen(['python3','-m','http.server',str(port),'--bind','127.0.0.1'],cwd=root/name,stdout=log,stderr=subprocess.STDOUT);processes.append((name,p,log))
 for port in [5841,5842]:
  for attempt in range(30):
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.1):break
   except OSError:time.sleep(.1)
 with(out/'pet-production-browser.log').open('w')as f:r=subprocess.run(['node',str(out/'pet-production-browser.mjs')],stdout=f,stderr=subprocess.STDOUT)
 raise SystemExit(r.returncode)
finally:
 for name,p,log in processes:
  p.terminate();p.wait(timeout=5);log.close();stopped.append({'name':name,'pid':p.pid,'exit':p.returncode})
 (out/'pet-production/owned-servers-stopped.json').write_text(json.dumps(stopped,indent=2)+'\n')
