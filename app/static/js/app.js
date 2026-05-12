// Pistos — He that is faithful in that which is least is faithful also in much.
// Luke 16:10, KJV
// Frontend wired to Flask API. No Anthropic key client-side.

const { useState, useEffect, useRef } = React;

const C = {
  slate:"#1E2A3A", slateMid:"#2c3e52", slateDeep:"#141e2b",
  amber:"#F5A623", amberLight:"#FBBF24", amberDim:"#b87d19", amberPale:"#FEF9EC",
  white:"#FAFAFA", surface:"#E8EDF2", surfaceMid:"#d4dce6",
  text:"#1E2A3A", textMid:"#4a5568", textLight:"#8a96a3",
  success:"#22c55e", danger:"#ef4444", info:"#3b82f6", border:"#d0d9e3",
};

// ── API helpers ────────────────────────────────────────────
const api = {
  async get(path) {
    const res = await fetch(path, { credentials: "include" });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};

// Offline queue
const QUEUE_KEY = "pistos_offline_queue";
function enqueue(item) {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  q.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
async function flushQueue() {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  if (!q.length) return;
  const remaining = [];
  for (const item of q) {
    try { await api.post(item.path, item.body); }
    catch { remaining.push(item); }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

// ── GrainIcon ──────────────────────────────────────────────
function GrainIcon() {
  return React.createElement("svg", { width:24, height:24, viewBox:"0 0 28 28", fill:"none" },
    React.createElement("ellipse", { cx:14, cy:20, rx:4, ry:7, fill:C.amber, opacity:0.9 }),
    React.createElement("ellipse", { cx:9, cy:16, rx:3, ry:5.5, fill:C.amber, opacity:0.65, transform:"rotate(-20 9 16)" }),
    React.createElement("ellipse", { cx:19, cy:16, rx:3, ry:5.5, fill:C.amber, opacity:0.65, transform:"rotate(20 19 16)" }),
    React.createElement("line", { x1:14, y1:13, x2:14, y2:4, stroke:C.amber, strokeWidth:1.5, strokeLinecap:"round" }),
    React.createElement("line", { x1:9, y1:10.5, x2:11, y2:4, stroke:C.amber, strokeWidth:1.2, strokeLinecap:"round", opacity:0.65 }),
    React.createElement("line", { x1:19, y1:10.5, x2:17, y2:4, stroke:C.amber, strokeWidth:1.2, strokeLinecap:"round", opacity:0.65 })
  );
}

// ── Helpers ────────────────────────────────────────────────
const fmt = (n, c="USD") => `${c==="USD"?"$":"ZWG "}${Number(n||0).toFixed(2)}`;
const pct = (a,b) => Math.min(100, b ? Math.round((a/b)*100) : 0);
const today = () => new Date().toISOString().split("T")[0];

function ProgressBar({ value, color }) {
  return React.createElement("div", { style:{ height:6, background:C.surface, borderRadius:99, overflow:"hidden" } },
    React.createElement("div", { style:{ height:"100%", width:`${value}%`, background:color, borderRadius:99, transition:"width 0.6s ease" } })
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return React.createElement("div", { style:{
    position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
    background: type==="error" ? C.danger : C.success,
    color:"#fff", borderRadius:10, padding:"10px 20px", fontSize:13,
    fontWeight:700, zIndex:999, boxShadow:"0 4px 20px #0004",
  }}, msg);
}

// ── Login Screen ───────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(""); setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const data = await api.post(path, form);
      onLogin(data);
    } catch(e) {
      setError(e.error || (e.errors && e.errors.join(", ")) || "Something went wrong");
    } finally { setLoading(false); }
  }

  const inp = (key, type, ph) => React.createElement("input", {
    type, value:form[key], placeholder:ph,
    onChange: e => setForm(p => ({...p, [key]: e.target.value})),
    onKeyDown: e => e.key==="Enter" && submit(),
    style:{ width:"100%", padding:"11px 14px", borderRadius:10,
      border:`1.5px solid ${C.border}`, background:C.surface,
      fontSize:14, color:C.text, outline:"none", fontFamily:"inherit", marginBottom:12 }
  });

  return React.createElement("div", { style:{ minHeight:"100vh", background:C.slate, display:"flex", alignItems:"center", justifyContent:"center", padding:20 } },
    React.createElement("div", { style:{ background:C.white, borderRadius:20, padding:"36px 28px", width:"100%", maxWidth:380, boxShadow:"0 20px 60px #00000044" } },
      React.createElement("div", { style:{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 } },
        React.createElement(GrainIcon),
        React.createElement("div", { style:{ fontSize:26, fontWeight:800, color:C.slate, marginTop:10 } }, "Pistos"),
        React.createElement("div", { style:{ fontSize:12, color:C.amber, fontStyle:"italic", textAlign:"center", marginTop:4 } },
          "He that is faithful in that which is least…"),
      ),
      mode==="register" && inp("name","text","Full name"),
      inp("email","email","Email address"),
      inp("password","password","Password"),
      error && React.createElement("div", { style:{ color:C.danger, fontSize:12.5, marginBottom:12 } }, error),
      React.createElement("button", {
        onClick:submit, disabled:loading,
        style:{ width:"100%", padding:"13px 0", borderRadius:11, border:"none",
          background:`linear-gradient(135deg,${C.amber},${C.amberLight})`,
          color:C.slate, fontWeight:800, fontSize:15, cursor:"pointer" }
      }, loading ? "…" : mode==="login" ? "Sign In" : "Register"),
      React.createElement("div", { style:{ textAlign:"center", marginTop:14, fontSize:13, color:C.textMid } },
        mode==="login" ? "No account? " : "Have an account? ",
        React.createElement("span", {
          onClick:()=>setMode(m=>m==="login"?"register":"login"),
          style:{ color:C.amber, cursor:"pointer", fontWeight:700 }
        }, mode==="login" ? "Register" : "Sign in")
      )
    )
  );
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    api.get("/api/transactions/summary?currency=USD").then(setSummary).catch(()=>{});
    api.get("/api/goals/").then(setGoals).catch(()=>{});
    api.get("/api/transactions/?currency=USD").then(setTxns).catch(()=>{});
  }, []);

  const s = summary || {};

  return React.createElement("div", null,
    // Banner
    React.createElement("div", { style:{ background:`linear-gradient(135deg,${C.slate},${C.slateMid})`, borderRadius:16, padding:"20px 22px", marginBottom:20, boxShadow:`0 4px 20px ${C.slate}33` } },
      React.createElement("div", { style:{ color:"#ffffff88", fontSize:12, marginBottom:4 } }, `${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}`),
      React.createElement("div", { style:{ color:C.white, fontSize:20, fontWeight:800, marginBottom:6 } }, "Pistos — Household Overview"),
      React.createElement("div", { style:{ color:C.amber, fontSize:12, fontStyle:"italic" } }, '"He that is faithful in that which is least…" — Luke 16:10, KJV')
    ),
    // Stats
    React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 } },
      ...[ ["Income",  fmt(s.total_income),  "USD this month", C.success],
           ["Expenses",fmt(s.total_expense), "USD this month", C.danger],
           ["Tithe Due",fmt(s.tithe),        "10% of income",  C.amber],
           ["Balance",  fmt(s.balance),      "After expenses", C.info] ]
      .map(([label,val,sub,color]) =>
        React.createElement("div", { key:label, style:{ background:C.white, borderRadius:14, padding:"16px 18px", border:`1px solid ${C.border}`, boxShadow:"0 1px 4px #0000000a" } },
          React.createElement("div", { style:{ fontSize:11, color:C.textLight, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 } }, label),
          React.createElement("div", { style:{ fontSize:22, fontWeight:800, color, marginBottom:4 } }, val),
          React.createElement("div", { style:{ fontSize:12, color:C.textMid } }, sub)
        )
      )
    ),
    // Give → Save → Live
    React.createElement("div", { style:{ background:C.amberPale, border:`1px solid ${C.amberDim}33`, borderLeft:`4px solid ${C.amber}`, borderRadius:12, padding:"16px 18px", marginBottom:20 } },
      React.createElement("div", { style:{ fontWeight:800, fontSize:13, color:C.slate, marginBottom:12 } }, "Give → Save → Live"),
      ...[["Tithe (10%)", s.tithe||0, s.total_income||1, 10],
          ["Max Offering (15%)", s.max_offering||0, s.total_income||1, 15]].map(([label,val,base,p]) =>
        React.createElement("div", { key:label, style:{ marginBottom:10 } },
          React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:C.textMid, marginBottom:4 } },
            React.createElement("span", null, label),
            React.createElement("span", { style:{ fontWeight:700, color:C.slate } }, fmt(val))
          ),
          React.createElement(ProgressBar, { value:p, color:C.amber })
        )
      )
    ),
    // Goals
    goals.length > 0 && React.createElement("div", { style:{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 18px", marginBottom:20 } },
      React.createElement("div", { style:{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 } }, "Goals"),
      ...goals.map(g => React.createElement("div", { key:g.id, style:{ marginBottom:14 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 } },
          React.createElement("span", { style:{ fontWeight:600 } }, g.name),
          React.createElement("span", { style:{ color:C.textLight, fontSize:12 } }, `${g.progress}%`)
        ),
        React.createElement(ProgressBar, { value:g.progress, color:C.success }),
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", fontSize:11.5, color:C.textLight, marginTop:4 } },
          React.createElement("span", null, `${fmt(g.saved)} saved`),
          React.createElement("span", null, `${fmt(g.target)} target`)
        )
      ))
    ),
    // Recent transactions
    React.createElement("div", { style:{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 18px" } },
      React.createElement("div", { style:{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 } }, "Recent Transactions"),
      txns.length === 0
        ? React.createElement("div", { style:{ color:C.textLight, fontSize:13, textAlign:"center", padding:"20px 0" } }, "No transactions yet. Add your first one.")
        : txns.slice(0,8).map(t => React.createElement("div", { key:t.id,
            style:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` } },
          React.createElement("div", null,
            React.createElement("div", { style:{ fontSize:13, fontWeight:600, color:C.text } }, t.description),
            React.createElement("div", { style:{ fontSize:11, color:C.textLight } }, `${t.category} · ${t.date}`)
          ),
          React.createElement("div", { style:{ fontWeight:800, fontSize:14, color:t.type==="income"?C.success:C.danger } },
            `${t.type==="income"?"+":"-"}${fmt(t.amount,t.currency)}`)
        ))
    )
  );
}

// ── Transactions ───────────────────────────────────────────
function Transactions({ showToast }) {
  const [tab, setTab]   = useState("form");
  const [type, setType] = useState("income");
  const [form, setForm] = useState({ desc:"", amount:"", currency:"USD", category:"Business", date:today() });
  const [saving, setSaving] = useState(false);
  const [msgs, setMsgs] = useState([{ role:"pistos", text:'Tell me about a transaction — for example: "I received $200 from a web project today" or "We spent $45 on groceries."' }]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping]   = useState(false);
  const bottomRef = useRef(null);
  const CATS = ["Business","Web Dev","Baby","Groceries","Transport","Utilities","Eating Out","Personal","Debt","Other"];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs, typing]);

  async function handleSave() {
    if (!form.desc || !form.amount) return;
    setSaving(true);
    const body = { type, description:form.desc, amount:form.amount, currency:form.currency, category:form.category, date:form.date, source:"form" };
    try {
      await api.post("/api/transactions/", body);
      showToast("Transaction saved", "success");
      setForm({ desc:"", amount:"", currency:"USD", category:"Business", date:today() });
    } catch(e) {
      // Offline — queue it
      enqueue({ path:"/api/transactions/", body });
      showToast("Saved offline — will sync when connected", "success");
    } finally { setSaving(false); }
  }

  async function sendChat() {
    if (!chatInput.trim() || typing) return;
    const msg = chatInput.trim();
    setChatInput("");
    setMsgs(m => [...m, { role:"user", text:msg }]);
    setTyping(true);
    try {
      // DEF-003/004: Call Flask backend, not Anthropic directly
      const data = await api.post("/api/chat/", { message: msg });
      setMsgs(m => [...m, { role:"pistos", text: data.reply }]);
      // If Pistos parsed a transaction and returned structured data
      if (data.transaction_data) {
        try {
          await api.post("/api/transactions/", { ...data.transaction_data, source:"chat" });
          showToast("Transaction recorded by Pistos", "success");
        } catch(e) {
          enqueue({ path:"/api/transactions/", body:{ ...data.transaction_data, source:"chat" } });
        }
      }
    } catch(e) {
      setMsgs(m => [...m, { role:"pistos", text:"Connection issue. Your message was not lost — please try again." }]);
    } finally { setTyping(false); }
  }

  const inp = (key, type, ph) => React.createElement("input", {
    type, value:form[key], placeholder:ph,
    onChange:e=>setForm(p=>({...p,[key]:e.target.value})),
    style:{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.surface, fontSize:14, color:C.text, outline:"none", fontFamily:"inherit" }
  });

  return React.createElement("div", null,
    React.createElement("div", { style:{ fontWeight:800, fontSize:20, color:C.text, marginBottom:4 } }, "Record Transaction"),
    React.createElement("div", { style:{ fontSize:13, color:C.textMid, marginBottom:20 } }, "Use the form for structured entry, or chat to enter naturally."),
    // Tab toggle
    React.createElement("div", { style:{ display:"flex", background:C.surface, borderRadius:10, padding:3, width:"fit-content", marginBottom:22 } },
      ...["form","chat"].map(t => React.createElement("button", { key:t, onClick:()=>setTab(t), style:{
        padding:"8px 20px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:600, fontSize:13, transition:"all 0.2s",
        background:tab===t?C.white:"transparent", color:tab===t?C.slate:C.textMid,
        boxShadow:tab===t?"0 1px 4px #0000001a":"none" }},
        t==="form"?"📋  Manual Form":"💬  Chat Entry"
      ))
    ),
    tab==="form"
      ? React.createElement("div", { style:{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, padding:"22px 20px" } },
          // Type toggle
          React.createElement("div", { style:{ display:"flex", gap:10, marginBottom:20 } },
            ...["income","expense"].map(t => React.createElement("button", { key:t, onClick:()=>setType(t), style:{
              flex:1, padding:"10px 0", borderRadius:10, border:`2px solid`,
              borderColor:type===t?(t==="income"?C.success:C.danger):C.border,
              background:type===t?(t==="income"?C.success+"15":C.danger+"15"):"transparent",
              color:type===t?(t==="income"?C.success:C.danger):C.textMid,
              fontWeight:700, fontSize:14, cursor:"pointer" }}, t==="income"?"↑ Income":"↓ Expense"))
          ),
          React.createElement("div", { style:{ marginBottom:14 } },
            React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 } }, "Description"),
            inp("desc","text","e.g. Oil Change Zim services")
          ),
          React.createElement("div", { style:{ marginBottom:14 } },
            React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 } }, "Amount"),
            inp("amount","number","0.00")
          ),
          React.createElement("div", { style:{ marginBottom:14 } },
            React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 } }, "Date"),
            inp("date","date","")
          ),
          React.createElement("div", { style:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:22 } },
            ...[ ["Currency","currency",["USD","ZWG"]], ["Category","category",CATS] ].map(([label,key,opts]) =>
              React.createElement("div", { key },
                React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 } }, label),
                React.createElement("select", { value:form[key], onChange:e=>setForm(p=>({...p,[key]:e.target.value})),
                  style:{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.surface, fontSize:14, color:C.text, outline:"none" } },
                  opts.map(o => React.createElement("option", { key:o }, o))
                )
              )
            )
          ),
          React.createElement("button", { onClick:handleSave, disabled:saving, style:{
            width:"100%", padding:"13px 0", borderRadius:11, border:"none",
            background:`linear-gradient(135deg,${C.amber},${C.amberLight})`,
            color:C.slate, fontWeight:800, fontSize:15, cursor:"pointer",
            boxShadow:`0 4px 14px ${C.amber}44` }},
            saving ? "Saving…" : "Save Transaction"
          )
        )
      : // Chat tab
        React.createElement("div", { style:{ background:C.white, borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" } },
          React.createElement("div", { style:{ height:320, overflowY:"auto", padding:"16px 14px" } },
            ...msgs.map((m,i) => React.createElement("div", { key:i, style:{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", marginBottom:10 } },
              React.createElement("div", { style:{
                maxWidth:"80%", padding:"10px 14px",
                borderRadius:m.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",
                background:m.role==="user"?C.slate:C.surface,
                color:m.role==="user"?C.white:C.text, fontSize:13.5, lineHeight:1.6 }}, m.text)
            )),
            typing && React.createElement("div", { style:{ display:"flex", gap:5, padding:"8px 4px" } },
              ...[0,1,2].map(i => React.createElement("div", { key:i, style:{
                width:7, height:7, borderRadius:"50%", background:C.amber,
                animation:`bounce 1.2s ease ${i*0.2}s infinite` }}))
            ),
            React.createElement("div", { ref:bottomRef })
          ),
          React.createElement("div", { style:{ borderTop:`1px solid ${C.border}`, display:"flex", gap:10, padding:"12px 14px", background:C.surface } },
            React.createElement("input", { value:chatInput, onChange:e=>setChatInput(e.target.value),
              onKeyDown:e=>e.key==="Enter"&&sendChat(),
              placeholder:"Tell Pistos about a transaction…",
              style:{ flex:1, padding:"10px 13px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.white, fontSize:14, color:C.text, outline:"none", fontFamily:"inherit" } }),
            React.createElement("button", { onClick:sendChat, style:{
              padding:"10px 16px", borderRadius:10, border:"none",
              background:C.amber, color:C.slate, cursor:"pointer", fontWeight:800, fontSize:13 }}, "Send")
          )
        )
  );
}

// ── Giving ─────────────────────────────────────────────────
function Giving({ showToast }) {
  const [recon, setRecon]   = useState(null);
  const [offering, setOffering] = useState(0);
  const [finalising, setFinalising] = useState(false);

  useEffect(() => {
    api.get("/api/giving/reconciliation").then(d => {
      setRecon(d);
      setOffering(0);
    }).catch(() => {});
  }, []);

  async function finalise() {
    if (!recon) return;
    setFinalising(true);
    try {
      await api.post("/api/giving/finalise", {
        income_base_usd: recon.USD.income_eligible,
        tithe_usd: recon.USD.tithe,
        offering_usd: offering,
        income_base_zwg: recon.ZWG.income_eligible,
        tithe_zwg: recon.ZWG.tithe,
        offering_zwg: 0,
      });
      showToast("Giving finalised. Backup triggered.", "success");
    } catch(e) {
      showToast(e.error || "Failed to finalise", "error");
    } finally { setFinalising(false); }
  }

  const usd = recon?.USD || {};
  const total = (usd.tithe || 0) + offering;
  const base = usd.income_eligible || 0;
  const totalPct = base ? Math.round((total/base)*100) : 0;

  return React.createElement("div", null,
    React.createElement("div", { style:{ fontWeight:800, fontSize:20, color:C.text, marginBottom:4 } }, "Giving — Friday Reconciliation"),
    React.createElement("div", { style:{ fontSize:13, color:C.textMid, marginBottom:20 } }, "Give first. Transport allowances excluded. Parts sales: net profit only."),
    React.createElement("div", { style:{ background:`linear-gradient(135deg,${C.slate},${C.slateMid})`, borderRadius:16, padding:"20px 22px", marginBottom:20, color:C.white } },
      React.createElement("div", { style:{ fontSize:11, color:"#ffffff66", letterSpacing:"0.08em", marginBottom:4 } }, "WEEK ENDING"),
      React.createElement("div", { style:{ fontSize:22, fontWeight:800 } }, recon?.week_ending || "—"),
      React.createElement("div", { style:{ fontSize:12, color:C.amber, marginTop:6, fontStyle:"italic" } }, "Net profit for parts · Transport excluded")
    ),
    React.createElement("div", { style:{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, padding:"20px", marginBottom:18 } },
      ...[["Eligible Income",fmt(usd.income_eligible)],["Tithe (10%)",fmt(usd.tithe)],["Max Offering (15%)",fmt(usd.max_offering)]].map(([label,val]) =>
        React.createElement("div", { key:label, style:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.border}` } },
          React.createElement("div", { style:{ fontSize:14, color:C.textMid } }, label),
          React.createElement("div", { style:{ fontWeight:800, fontSize:18, color:C.amber } }, val)
        )
      ),
      React.createElement("div", { style:{ paddingTop:16 } },
        React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:8 } },
          `Your Offering — max ${fmt(usd.max_offering)}`),
        React.createElement("input", { type:"number", value:offering, min:0, max:usd.max_offering||0,
          onChange:e=>setOffering(Math.min(usd.max_offering||0,Number(e.target.value))),
          style:{ width:"100%", padding:"12px 14px", borderRadius:10, border:`2px solid ${C.amber}`,
            background:C.amberPale, fontSize:20, fontWeight:800, color:C.slate, outline:"none", fontFamily:"inherit" } })
      ),
      React.createElement("div", { style:{ background:C.surface, borderRadius:10, padding:"14px 16px", marginTop:16 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:800, color:C.slate } },
          React.createElement("span", null, "Total Giving"),
          React.createElement("span", { style:{ color:C.amber } }, fmt(total))
        ),
        React.createElement("div", { style:{ fontSize:12, color:C.textLight, marginTop:4 } }, `${totalPct}% of income`),
        React.createElement(ProgressBar, { value:totalPct, color:C.amber })
      )
    ),
    React.createElement("button", { onClick:finalise, disabled:finalising, style:{
      width:"100%", padding:"14px 0", borderRadius:11, border:"none",
      background:`linear-gradient(135deg,${C.amber},${C.amberLight})`,
      color:C.slate, fontWeight:800, fontSize:15, cursor:"pointer",
      boxShadow:`0 4px 14px ${C.amber}44` }},
      finalising ? "Finalising…" : "Finalise & Trigger Backup →"
    ),
    React.createElement("div", { style:{ textAlign:"center", marginTop:14, fontSize:12, color:C.textLight, fontStyle:"italic" } },
      '"Bring ye all the tithes into the storehouse…" — Malachi 3:10, KJV')
  );
}

// ── Goals ──────────────────────────────────────────────────
function Goals({ showToast }) {
  const [goals, setGoals]   = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ name:"", target:"", currency:"USD" });

  const load = () => api.get("/api/goals/").then(setGoals).catch(()=>{});
  useEffect(() => { load(); }, []);

  async function addGoal() {
    try {
      await api.post("/api/goals/", form);
      showToast("Goal added", "success");
      setForm({ name:"", target:"", currency:"USD" });
      setAdding(false);
      load();
    } catch(e) { showToast(e.error || "Failed", "error"); }
  }

  const GOAL_COLORS = [C.success, C.info, C.amber, C.danger, "#8b5cf6"];

  return React.createElement("div", null,
    React.createElement("div", { style:{ fontWeight:800, fontSize:20, color:C.text, marginBottom:20 } }, "Goals"),
    ...goals.map((g,i) =>
      React.createElement("div", { key:g.id, style:{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, padding:"18px 20px", marginBottom:14 } },
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", marginBottom:10 } },
          React.createElement("div", null,
            React.createElement("div", { style:{ fontWeight:700, fontSize:15, color:C.text } }, g.name),
            g.is_protected && React.createElement("span", { style:{ fontSize:10, color:C.amber, fontWeight:700 } }, "🔒 Protected")
          ),
          React.createElement("span", { style:{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20,
            background:GOAL_COLORS[i%5]+"18", color:GOAL_COLORS[i%5], border:`1px solid ${GOAL_COLORS[i%5]}33` }},
            `${g.progress}%`)
        ),
        React.createElement(ProgressBar, { value:g.progress, color:GOAL_COLORS[i%5] }),
        React.createElement("div", { style:{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:12.5, color:C.textMid } },
          React.createElement("span", null, `Saved: `, React.createElement("strong", { style:{ color:C.text } }, fmt(g.saved, g.currency))),
          React.createElement("span", null, `Target: `, React.createElement("strong", { style:{ color:C.text } }, fmt(g.target, g.currency)))
        )
      )
    ),
    adding
      ? React.createElement("div", { style:{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, padding:"18px 20px", marginBottom:14 } },
          ...[ ["Goal Name","name","text","e.g. Emergency Fund"], ["Target Amount","target","number","0.00"] ].map(([label,key,type,ph]) =>
            React.createElement("div", { key, style:{ marginBottom:14 } },
              React.createElement("label", { style:{ display:"block", fontSize:11.5, fontWeight:700, color:C.textMid, textTransform:"uppercase", marginBottom:6 } }, label),
              React.createElement("input", { type, value:form[key], placeholder:ph,
                onChange:e=>setForm(p=>({...p,[key]:e.target.value})),
                style:{ width:"100%", padding:"10px 13px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.surface, fontSize:14, color:C.text, outline:"none", fontFamily:"inherit" } })
            )
          ),
          React.createElement("div", { style:{ display:"flex", gap:10 } },
            React.createElement("button", { onClick:addGoal, style:{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:C.amber, color:C.slate, fontWeight:800, cursor:"pointer" } }, "Save Goal"),
            React.createElement("button", { onClick:()=>setAdding(false), style:{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.textMid, fontWeight:700, cursor:"pointer" } }, "Cancel")
          )
        )
      : React.createElement("button", { onClick:()=>setAdding(true), style:{
          width:"100%", padding:"13px 0", borderRadius:11,
          border:`2px dashed ${C.border}`, background:"transparent",
          color:C.textMid, fontWeight:700, fontSize:14, cursor:"pointer" }},
          "+ Add New Goal"
        )
  );
}

// ── App Shell ──────────────────────────────────────────────
const NAV = [
  { id:"dashboard",    label:"Dashboard" },
  { id:"transactions", label:"Transactions" },
  { id:"giving",       label:"Giving" },
  { id:"goals",        label:"Goals" },
];

function App() {
  const [user, setUser]   = useState(null);
  const [view, setView]   = useState("dashboard");
  const [toast, setToast] = useState({ msg:"", type:"success" });
  const [checking, setChecking] = useState(true);

  // Check session on load
  useEffect(() => {
    api.get("/auth/me")
      .then(u => { setUser(u); flushQueue(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // Online sync
  useEffect(() => {
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
  }, []);

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:"", type:"success" }), 3000);
  }

  function handleLogin(data) {
    setUser(data);
    flushQueue();
  }

  if (checking) {
    return React.createElement("div", { style:{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.surface } },
      React.createElement("div", { style:{ width:36, height:36, border:`3px solid ${C.surface}`, borderTop:`3px solid ${C.amber}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" } })
    );
  }

  if (!user) return React.createElement(LoginScreen, { onLogin:handleLogin });

  const views = {
    dashboard:    React.createElement(Dashboard),
    transactions: React.createElement(Transactions, { showToast }),
    giving:       React.createElement(Giving, { showToast }),
    goals:        React.createElement(Goals, { showToast }),
  };

  return React.createElement("div", { style:{ display:"flex", flexDirection:"column", minHeight:"100vh", maxWidth:480, margin:"0 auto", background:C.white } },
    React.createElement("style", null, `
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:${C.surface};font-family:'DM Sans',system-ui,sans-serif}
      @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.surfaceMid};border-radius:3px}
      button:active{opacity:0.85}input:focus,select:focus{border-color:${C.amber}!important;outline:none}
    `),
    // Header
    React.createElement("div", { style:{ background:C.slate, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 } },
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:10 } },
        React.createElement(GrainIcon),
        React.createElement("div", null,
          React.createElement("div", { style:{ color:C.white, fontWeight:800, fontSize:19, lineHeight:1.1 } }, "Pistos"),
          React.createElement("div", { style:{ color:C.amber, fontSize:10, fontStyle:"italic" } }, "Luke 16:10, KJV")
        )
      ),
      React.createElement("div", { style:{ display:"flex", alignItems:"center", gap:8 } },
        ...["USD","ZWG"].map(c => React.createElement("span", { key:c, style:{ fontSize:10.5, fontWeight:700, padding:"3px 9px", borderRadius:20, background:C.amber+"22", color:C.amber, border:`1px solid ${C.amber}44` } }, c)),
        React.createElement("button", { onClick:async()=>{ await api.post("/auth/logout",{}); setUser(null); },
          style:{ fontSize:10.5, padding:"3px 9px", borderRadius:20, border:`1px solid ${C.border}`, background:"transparent", color:"#ffffff88", cursor:"pointer" } }, "Sign out")
      )
    ),
    // Content
    React.createElement("div", { style:{ flex:1, padding:"20px 16px 90px", overflowY:"auto" } },
      views[view]
    ),
    // Toast
    React.createElement(Toast, { msg:toast.msg, type:toast.type }),
    // Bottom nav
    React.createElement("div", { style:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:C.white, borderTop:`1px solid ${C.border}`, display:"flex", padding:"8px 0 14px", boxShadow:"0 -4px 20px #1E2A3A14", zIndex:100 } },
      ...NAV.map(n => React.createElement("button", { key:n.id, onClick:()=>setView(n.id), style:{
        flex:1, border:"none", background:"transparent", cursor:"pointer",
        display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"6px 0" }},
        React.createElement("div", { style:{ width:36, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background:view===n.id?C.amber+"22":"transparent" } },
          React.createElement("div", { style:{ width:8, height:8, borderRadius:"50%", background:view===n.id?C.amber:C.surfaceMid } })
        ),
        React.createElement("span", { style:{ fontSize:10, fontWeight:view===n.id?700:500, color:view===n.id?C.amber:C.textLight } }, n.label)
      ))
    ),
    // Footer
    React.createElement("div", { style:{ background:C.white, padding:"8px 16px 16px", textAlign:"center", fontSize:10, color:C.textLight, fontStyle:"italic" } },
      "Based on the Beginner's Guide to Budgeting by Rose Lee — Melrose Finance"
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
