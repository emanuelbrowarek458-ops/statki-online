const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');
const rooms = new Map();
const sizes = [5,4,3,3,2];
function fleetValid(fleet) {
  if (!Array.isArray(fleet) || fleet.length !== sizes.length) return false;
  const used = new Set();
  return fleet.every((ship,k) => {
    if (!Array.isArray(ship) || ship.length !== sizes[k] || ship.some(i=>!Number.isInteger(i)||i<0||i>99||used.has(i))) return false;
    const sorted=[...ship].sort((a,b)=>a-b);
    if (new Set(sorted).size!==sorted.length) return false;
    const horizontal=sorted.every((v,i)=>v===sorted[0]+i && Math.floor(v/10)===Math.floor(sorted[0]/10));
    const vertical=sorted.every((v,i)=>v===sorted[0]+10*i);
    if (!horizontal&&!vertical) return false;
    if (ship.some(i=>[...used].some(j=>Math.abs(i%10-j%10)<=1&&Math.abs(Math.floor(i/10)-Math.floor(j/10))<=1))) return false;
    ship.forEach(i=>used.add(i)); return true;
  });
}
function player(){return {token:crypto.randomBytes(24).toString('hex'),fleet:null,shots:[]};}
function view(room,p){const other=room.players[1-p];return {code:room.code,joined:!!other,ready:!!room.players[p].fleet,otherReady:!!other?.fleet,turn:room.turn===p,winner:room.winner===null?null:room.winner===p?'you':'other',mine:room.players[p].fleet,received:other?.shots||[],shots:room.players[p].shots,sunk:other?.fleet?.filter(s=>s.every(i=>room.players[p].shots.some(x=>x.i===i)))||[],last:room.last};}
function action(path,data){
  if(path==='/api/create') {if(rooms.size>=1000) throw Error('Serwer jest pełny. Spróbuj później.');let code;do{code=crypto.randomBytes(4).toString('hex').toUpperCase()}while(rooms.has(code));const p=player();const room={code,players:[p],turn:0,winner:null,updated:Date.now(),last:'Czekamy na drugiego gracza.'};rooms.set(code,room);return {token:p.token,...view(room,0)};}
  const room=rooms.get(String(data.code||'').toUpperCase());if(!room)throw Error('Nie znaleziono pokoju.');
  if(path==='/api/join'){if(room.players.length===2)throw Error('Pokój jest już pełny.');const p=player();room.players.push(p);room.updated=Date.now();room.last='Rozstawcie swoje floty.';return {token:p.token,...view(room,1)};}
  const p=room.players.findIndex(x=>x.token===data.token);if(p<0)throw Error('Brak dostępu do pokoju.');room.updated=Date.now();
  if(path==='/api/ready'){if(room.players[p].fleet)throw Error('Flota jest już zatwierdzona.');if(!fleetValid(data.fleet))throw Error('Nieprawidłowy układ. Statki muszą być oddzielone jednym polem, także po skosie.');room.players[p].fleet=data.fleet;if(room.players.length===2&&room.players.every(x=>x.fleet))room.last='Bitwa rozpoczęta. Twórca pokoju strzela pierwszy.';}
  else if(path==='/api/fire'){
    if(room.winner!==null||room.players.length!==2||!room.players.every(x=>x.fleet))throw Error('Bitwa nie jest aktywna.');
    if(room.turn!==p)throw Error('Poczekaj na swoją turę.');
    const i=data.i;if(!Number.isInteger(i)||i<0||i>99||room.players[p].shots.some(s=>s.i===i))throw Error('Wybierz inne pole.');
    const enemy=room.players[1-p];const hit=enemy.fleet.some(s=>s.includes(i));room.players[p].shots.push({i,hit});
    const sunk=enemy.fleet.some(s=>s.includes(i)&&s.every(j=>room.players[p].shots.some(x=>x.i===j)));
    room.last=`${String.fromCharCode(65+i%10)}${Math.floor(i/10)+1}: ${sunk?'trafiony, zatopiony!':hit?'trafiony!':'pudło.'}`;
    if(enemy.fleet.flat().every(j=>room.players[p].shots.some(s=>s.i===j)))room.winner=p;
    room.turn=1-p;
  } else if(path!=='/api/state')throw Error('Nieznana operacja.');
  return view(room,p);
}
const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&req.url==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('User-agent: *\nAllow: /\nDisallow: /api/\n');}
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method==='GET'&&(req.url==='/'||req.url?.startsWith('/?'))){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});return res.end(fs.readFileSync(__dirname+'/index.html'));}
  if(req.method!=='POST'||!req.url.startsWith('/api/'))return reply(404,{error:'Nie znaleziono.'});
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'Niedozwolone źródło.'});}catch{return reply(403,{error:'Niedozwolone źródło.'});}}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>10000)return reply(413,{error:'Żądanie jest zbyt duże.'});}reply(200,action(req.url,JSON.parse(body||'{}')));}catch(e){reply(400,{error:e.message});}
});
if(require.main===module){server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Statki: http://localhost:'+(Number(process.env.PORT)||3000)));setInterval(()=>{for(const [code,r]of rooms)if(Date.now()-r.updated>86400000)rooms.delete(code)},60000).unref();}
module.exports={server,action,fleetValid};
