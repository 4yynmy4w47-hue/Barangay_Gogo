const KEY="barangaygo-v1", ADMIN_CODE="BRGY-ADMIN-2026", PUROKS=[1,2,3,4,5];
const DOCS=["Barangay Clearance","Certificate of Indigency","Certificate of Residency","Barangay Certificate"];
let db={users:[],requests:[]}, session=null, mem=null;
try{const r=localStorage.getItem(KEY);if(r)db=JSON.parse(r);session=sessionStorage.getItem(KEY+"s")}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}sync()};
const setSess=v=>{session=v;try{v?sessionStorage.setItem(KEY+"s",v):sessionStorage.removeItem(KEY+"s")}catch(e){}};
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const me=()=>db.users.find(u=>u.mobile===session);
let authMode="resident", draft={step:1,type:DOCS[0]}, filter="All", pfilter="All", view=null, modal=false, err="", lastReq=null, editing=false;
const fmt=d=>new Date(d).toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"});
const fmtT=d=>new Date(d).toLocaleString("en-US",{month:"short",day:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
const pk=()=>PUROKS.map(p=>`<option value="${p}">Purok ${p}</option>`).join("");

function nav(){return location.hash.slice(1)||(session?"dashboard":"login")}
function go(h){location.hash=h}
window.addEventListener("hashchange",render);

const HERO=`<div class="hero"><div class="logo" style="text-align:left">🏛 BarangayGo</div><h1>Your barangay documents, now just a click away.</h1><p>A faster, easier and more convenient way to request clearances and certificates.</p>
<svg class="hall" viewBox="0 0 320 170" role="img" aria-label="Sketch of a barangay hall"><path class="n" d="M10 150H310"/><circle class="g" cx="34" cy="118" r="22"/><path class="n" d="M34 140V150"/><circle class="g" cx="288" cy="122" r="20"/><path class="n" d="M288 142V150"/><rect x="70" y="82" width="180" height="68"/><path class="r" d="M60 82L160 42L260 82Z"/><path class="n" d="M160 42V10"/><path class="g" d="M160 10H190L182 18L190 26H160Z"/><rect x="144" y="108" width="32" height="42"/><rect x="88" y="98" width="30" height="26"/><rect x="202" y="98" width="30" height="26"/></svg>
<div class="chips">${PUROKS.map(p=>`<span>Purok ${p}</span>`).join("")}</div><p class="note">Maasahan. Mas Mabilis. Para sa Lahat.</p></div>`;
function authView(r){
 if(r==="login")return `<div class="auth">${HERO}<div class="box"><div class="logo">Log in</div><p class="sub">Access your requests, anytime.</p>
 <div class="seg"><button data-a="mode" data-v="resident" class="${authMode==="resident"?"on":""}">Resident</button><button data-a="mode" data-v="admin" class="${authMode==="admin"?"on":""}">Admin</button></div>
 <label>Mobile Number</label><input id="mobile" inputmode="tel" placeholder="09XX XXX XXXX">
 <label>Password</label><input id="pw" type="password" placeholder="••••••••">
 <p class="err">${esc(err)}</p><button class="p w" data-a="login">Log in</button>
 <p class="sub" style="margin-top:14px">Don’t have an account? <a href="#signup">Sign up</a></p></div></div>`;
 return `<div class="auth">${HERO}<div class="box"><div class="logo">Create an account</div><p class="sub">Join your purok and request documents online.</p>
 <div class="seg"><button data-a="mode" data-v="resident" class="${authMode==="resident"?"on":""}">Resident</button><button data-a="mode" data-v="admin" class="${authMode==="admin"?"on":""}">Admin registration</button></div>
 <label>Full Name</label><input id="name" placeholder="Juan Dela Cruz">
 <label>Mobile Number</label><input id="mobile" inputmode="tel" placeholder="09XX XXX XXXX">
 <label>${authMode==="admin"?"Purok you manage":"Purok"}</label><select id="purok">${pk()}</select>
 ${authMode==="admin"?`<label>Admin access code</label><input id="code" type="password" placeholder="Given by the barangay captain"><p class="note">Demo code: ${ADMIN_CODE}</p>`:""}
 <label>Password</label><input id="pw" type="password" placeholder="At least 6 characters">
 <label>Confirm Password</label><input id="pw2" type="password">
 <p class="err">${esc(err)}</p><button class="p w" data-a="signup">${authMode==="admin"?"Register as admin":"Sign up"}</button>
 <p class="sub" style="margin-top:14px">Already have an account? <a href="#login">Log in</a></p></div></div>`;
}

function shell(r,body){
 const u=me(), admin=u.role==="admin";
 const items=admin?[["dashboard","🏠 Dashboard"],["profile","👤 Profile"]]:[["dashboard","🏠 Dashboard"],["new","📝 New Request"],["requests","📋 My Requests"],["profile","👤 Profile"]];
 return `<div class="app"><nav class="side"><div class="logo">🏛 BarangayGo</div>
 ${items.map(([k,l])=>`<button class="${r===k?"on":""}" data-a="go" data-v="${k}">${l}</button>`).join("")}
 <div class="sp"></div><button data-a="askout">🚪 Log Out</button></nav><main class="main">${body}</main>
 ${modal?`<div class="modal"><div class="box center"><h3>Log Out</h3><p>Are you sure you want to log out?</p><div class="row" style="justify-content:center"><button data-a="cancel">Cancel</button><button class="p" data-a="logout">Log Out</button></div></div></div>`:""}</div>`;
}
const head=(t,s)=>{const u=me();return `<div class="top"><div><h1>${t}</h1><div class="note">${s||""}</div></div><span class="badge">${esc(u.name)} · ${u.role==="admin"?"Admin":"Resident"} · Purok ${u.purok}</span></div>`};
const mine=()=>db.requests.filter(q=>q.owner===session);
const cnt=(l,s)=>l.filter(q=>q.status===s).length;
const stats=l=>`<div class="stats"><div class="stat">📄 Total Requests<b>${l.length}</b></div><div class="stat">⏳ Pending<b>${cnt(l,"Pending")}</b></div><div class="stat">✅ Approved<b>${cnt(l,"Approved")}</b></div><div class="stat">📦 Ready for Pickup<b>${cnt(l,"Ready")}</b></div></div>`;
const stLabel=s=>s==="Ready"?"Ready for Pickup":s;

function table(l,admin){
 if(!l.length)return `<p class="note">No requests yet.</p>`;
 return `<div class="tw"><table><tr><th>Ref. No.</th>${admin?"<th>Resident</th><th>Purok</th>":""}<th>Document Type</th><th>Status</th><th>Date</th><th></th></tr>
 ${l.map(q=>`<tr><td>${q.ref}</td>${admin?`<td>${esc(q.name)}</td><td>${q.purok}</td>`:""}<td>${esc(q.type)}</td><td><span class="pill st-${q.status}">${stLabel(q.status)}</span></td><td>${fmt(q.date)}</td>
 <td>${admin?`${q.status==="Pending"?`<button class="s" data-a="set" data-id="${q.ref}" data-v="Approved">Approve</button> <button class="s" data-a="set" data-id="${q.ref}" data-v="Rejected">Reject</button>`:""}${q.status==="Approved"?`<button class="s" data-a="set" data-id="${q.ref}" data-v="Ready">Mark ready</button>`:""}`:`<button class="s" data-a="detail" data-id="${q.ref}">View</button>`}</td></tr>`).join("")}</table></div>`;
}

function page(r){
 const u=me();
 if(!u){setSess(null);return authView("login")}
 const admin=u.role==="admin";
 if(r==="dashboard"){
  if(admin){
   const all=db.requests, l=pfilter==="All"?all:all.filter(q=>q.purok==pfilter);
   return shell(r,head("Hello, "+esc(u.name.split(" ")[0])+"!","Admin overview · you manage Purok "+u.purok)+stats(l)+
   `<div class="card"><h3>Requests by purok</h3><div class="tabs" style="margin-top:10px">${["All",...PUROKS].map(p=>`<button class="${pfilter==p?"on":""}" data-a="pf" data-v="${p}">${p==="All"?"All puroks":"Purok "+p}</button>`).join("")}</div>${table([...l].reverse(),true)}</div>`);
  }
  const l=mine();
  return shell(r,head("Hello, "+esc(u.name.split(" ")[0])+"!","Here’s an overview of your requests.")+stats(l)+
  `<div class="card banner"><div><h2>Need a barangay document?</h2><p>You can now request it online anytime, anywhere.</p><button class="p" data-a="go" data-v="new">Request Now</button></div><div class="big">📱</div></div>`);
 }
 if(r==="new"&&!admin){
  const d=draft, S=["Document","Details","Upload ID","Review"];
  let b=`<div class="steps">${S.map((s,i)=>`<span class="${d.step===i+1?"on":""}">${i+1}. ${s}</span>`).join("")}</div>`;
  if(d.step===1)b+=`<h3>Select Document Type</h3><div style="margin-top:10px">${DOCS.map(x=>`<label class="opt ${d.type===x?"on":""}"><input type="radio" name="doc" data-a="doc" data-v="${x}" ${d.type===x?"checked":""}>${x}</label>`).join("")}</div>`;
  if(d.step===2)b+=`<h3>Personal Information</h3><label>Full Name</label><input value="${esc(u.name)}" disabled><label>Purok</label><input value="Purok ${u.purok}" disabled>
   <label>Date of Birth</label><input id="dob" type="date" value="${esc(d.dob||"")}"><label>Purpose of Request</label>
   <select id="purpose">${["","Enrollment","Employment","Scholarship","Travel","Other"].map(x=>`<option value="${x}" ${d.purpose===x?"selected":""}>${x||"Choose purpose"}</option>`).join("")}</select>
   <label>Additional Details (Optional)</label><input id="more" value="${esc(d.more||"")}" placeholder="e.g. Name of school, course, etc.">`;
  if(d.step===3)b+=`<h3>Upload a Valid ID</h3><p class="note">Use a clear photo of your Student ID, National ID, etc. (JPG, PNG)</p><label class="opt" style="justify-content:center;padding:28px;border-style:dashed">⬆ Click to upload<input id="idf" type="file" accept="image/*" style="display:none"></label>
   ${d.idData?`<img class="preview" src="${d.idData}" alt="ID preview"><div class="note">${esc(d.idName)}</div>`:""}`;
  if(d.step===4)b+=`<h3>Review Your Request</h3><div class="dl card" style="margin-top:10px"><div><span>Document Type</span>${esc(d.type)}</div><div><span>Full Name</span>${esc(u.name)}</div><div><span>Purok</span>${u.purok}</div><div><span>Date of Birth</span>${esc(d.dob)}</div><div><span>Purpose</span>${esc(d.purpose)}</div><div><span>Additional Details</span>${esc(d.more||"N/A")}</div><div><span>Valid ID</span>${esc(d.idName)}</div></div>`;
  b+=`<p class="err">${esc(err)}</p><div class="row"><button data-a="back" ${d.step===1?"disabled":""}>Back</button><button class="p" data-a="next">${d.step===4?"Submit Request":"Next"}</button></div>`;
  return shell(r,head("Request a Barangay Document")+`<div class="card">${b}</div>`);
 }
 if(r==="success"&&lastReq){const q=lastReq;
  return shell("new",`<div class="card center"><div class="big">✅</div><h2>Request Submitted!</h2><p>Your request for ${esc(q.type)} has been successfully submitted. You will be notified once it is processed.</p>
  <div class="dl card" style="text-align:left"><div><span>Request Number</span>${q.ref}</div><div><span>Date Submitted</span>${fmtT(q.date)}</div></div>
  <button class="p" data-a="go" data-v="requests">Go to My Requests</button><p><a href="#dashboard">Back to Dashboard</a></p></div>`);}
 if(r==="requests"&&!admin){
  const l=mine().filter(q=>filter==="All"||q.status===filter);
  return shell(r,head("My Requests")+`<div class="card"><div class="tabs">${["All","Pending","Approved","Ready"].map(f=>`<button class="${filter===f?"on":""}" data-a="f" data-v="${f}">${f==="Ready"?"Ready for Pickup":f}</button>`).join("")}</div>${table([...l].reverse(),false)}</div>`);
 }
 if(r==="complete"&&lastReq){const q=lastReq,ready=q.status==="Ready";
  return shell("requests",`<div class="card center"><div class="big">${ready?"📄":"⏳"}</div><h2>${ready?"Your Request is Ready!":"Request "+stLabel(q.status)}</h2>
  <p>${ready?"Your "+esc(q.type)+" is now ready for pickup. Please bring your valid ID when claiming your document.":"We’ll let you know once it moves to the next step."}</p>
  <div class="dl card" style="text-align:left"><div><span>Request Number</span>${q.ref}</div><div><span>Purok</span>${q.purok}</div>${ready?`<div><span>Ready for Pickup</span>${fmt(q.pickup)}, 09:00 AM - 05:00 PM</div>`:""}</div>
  <button data-a="go" data-v="dashboard">Back to Dashboard</button></div>`);}
 if(r==="profile"){
  const f=(k,l,v,t)=>`<div class="row" style="margin:0;border-bottom:1px solid var(--line);padding:8px 0;align-items:center"><div style="flex:1"><span class="note">${l}</span>${editing&&t?`<input id="e-${k}" value="${esc(v)}">`:`<div>${esc(v||"—")}</div>`}</div></div>`;
  return shell(r,head("My Profile")+`<div class="card">${f("name","Full Name",u.name,1)}${f("mobile","Mobile Number",u.mobile,0)}${f("email","Email Address",u.email,1)}${f("address","Address",u.address||"Rizal, Roxas, Isabela",1)}
  ${editing?`<div style="padding:8px 0"><span class="note">Purok</span><select id="e-purok">${PUROKS.map(p=>`<option value="${p}" ${u.purok==p?"selected":""}>Purok ${p}</option>`).join("")}</select></div>`:f("purok","Purok","Purok "+u.purok,0)}
  ${f("role","Account type",admin?"Admin":"Resident",0)}<div class="row"><span></span><button class="p" data-a="${editing?"saveprof":"edit"}">${editing?"Save changes":"Edit profile"}</button></div></div>`);
 }
 return shell("dashboard","");
}

function render(){
 const r=nav(), pub=r==="login"||r==="signup";
 if(!session&&!pub){go("login");return}
 if(session&&pub){go("dashboard");return}
 $("#app").innerHTML=(pub?authView(r):page(r))+'<div id="dbp" class="dbpill"></div>';pill();
}

/* ---- Database (shared cloud store, falls back to this device) ---- */
const hash=async(m,p)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("brgygo:"+m+":"+p));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")};
let cloud=null,cstate="local",sent={};
const PILL={local:"Saved on this device only",connecting:"Connecting to database…",live:"● Database connected",slow:"Database not reachable yet",error:"Database error · saved on this device"};
function pill(){const p=$("#dbp");if(p)p.textContent=PILL[cstate]}
function put(n,k,o){const s=JSON.stringify(o);if(sent[n+k]===s)return;sent[n+k]=s;cloud.collection(n).doc(k).set(o).catch(()=>{delete sent[n+k];cstate="error";pill()})}
function sync(){if(!cloud)return;db.users.forEach(u=>put("users",u.mobile,u));db.requests.forEach(q=>put("requests",q.ref,q))}
async function initCloud(){
 try{
  if(typeof claude==="undefined")return;
  const c=await claude.use("db");if(!c)return;
  cloud=c;cstate="connecting";pill();
  const t=setTimeout(()=>{if(cstate==="connecting"){cstate="slow";pill()}},10000);
  const watch=(name,key)=>c.collection(name).onSnapshot(s=>{
   clearTimeout(t);cstate="live";
   db[name]=s.docs.map(d=>({...d.data()}));
   db[name].forEach(o=>{sent[name+o[key]]=JSON.stringify(o)});
   try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}
   pill();const a=document.activeElement;if(!a||!/INPUT|SELECT|TEXTAREA/.test(a.tagName))render();
  },()=>{cstate="error";pill()});
  watch("users","mobile");watch("requests","ref");
 }catch(e){}
}
function readIn(id){const e=$("#"+id);return e?e.value.trim():""}
document.addEventListener("click",async e=>{
 const t=e.target.closest("[data-a]");if(!t)return;
 const a=t.dataset.a,v=t.dataset.v,id=t.dataset.id;
 if(a==="doc"){draft.type=v;render();return}
 if(a==="mode"){authMode=v;err="";render();return}
 if(a==="go"){err="";go(v);return}
 if(a==="login"){
  const m=readIn("mobile").replace(/\s/g,""),h=await hash(m,$("#pw").value),u=db.users.find(x=>x.mobile===m&&x.pw===h);
  if(!u||u.role!==authMode){err=!u?"Wrong mobile number or password.":"This account is registered as "+u.role+". Switch the tab above.";render();return}
  err="";setSess(m);go("dashboard");render();return}
 if(a==="signup"){
  const name=readIn("name"),m=readIn("mobile").replace(/\s/g,""),pw=$("#pw").value,pw2=$("#pw2").value;
  if(!name)err="Enter your full name.";
  else if(!/^09\d{9}$/.test(m))err="Mobile number must look like 09XX XXX XXXX.";
  else if(pw.length<6)err="Password needs at least 6 characters.";
  else if(pw!==pw2)err="Passwords don’t match.";
  else if(db.users.some(x=>x.mobile===m))err="That mobile number is already registered.";
  else if(authMode==="admin"&&readIn("code")!==ADMIN_CODE)err="Incorrect admin access code.";
  else{
   db.users.push({name,mobile:m,pw:await hash(m,pw),purok:+$("#purok").value,role:authMode,email:"",address:"Rizal, Roxas, Isabela"});
   save();err="";setSess(m);go("dashboard");render();return}
  render();return}
 if(a==="askout"){modal=true;render();return}
 if(a==="cancel"){modal=false;render();return}
 if(a==="logout"){modal=false;setSess(null);go("login");render();return}
 if(a==="next"||a==="back"){
  const d=draft;
  if(a==="back"){d.step--;err="";render();return}
  if(d.step===2){d.dob=readIn("dob");d.purpose=readIn("purpose");d.more=readIn("more");if(!d.dob||!d.purpose){err="Add your date of birth and purpose.";render();return}}
  if(d.step===3&&!d.idData){err="Upload a photo of your valid ID.";render();return}
  err="";
  if(d.step<4){d.step++;render();return}
  const u=me(),n=db.requests.reduce((a,x)=>Math.max(a,+x.ref.split("-")[2]||0),0)+1,q={ref:"BG-"+new Date().getFullYear()+"-"+String(n).padStart(4,"0"),owner:u.mobile,name:u.name,purok:u.purok,type:d.type,dob:d.dob,purpose:d.purpose,more:d.more,idName:d.idName,status:"Pending",date:Date.now()};
  db.requests.push(q);save();lastReq=q;draft={step:1,type:DOCS[0]};go("success");render();return}
 if(a==="f"){filter=v;render();return}
 if(a==="pf"){pfilter=v;render();return}
 if(a==="detail"){lastReq=db.requests.find(q=>q.ref===id);go("complete");render();return}
 if(a==="set"){const q=db.requests.find(x=>x.ref===id);q.status=v;if(v==="Ready")q.pickup=Date.now()+864e5;save();render();return}
 if(a==="edit"){editing=true;render();return}
 if(a==="saveprof"){const u=me();u.name=readIn("e-name")||u.name;u.email=readIn("e-email");u.address=readIn("e-address");u.purok=+$("#e-purok").value;db.requests.filter(q=>q.owner===u.mobile).forEach(q=>{q.name=u.name;q.purok=u.purok});save();editing=false;render()}
});
document.addEventListener("change",e=>{
 if(e.target.id==="idf"&&e.target.files[0]){
  const f=e.target.files[0],r=new FileReader();
  r.onload=()=>{draft.idData=r.result;draft.idName=f.name;render()};r.readAsDataURL(f);}
});
render();initCloud();
