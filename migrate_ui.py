import re

html_path = r"C:\print_agent\PrintCenter.html"
out_path = r"C:\print_agent\AdminPanel\index.html"

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Substitute data mock arrays with empty arrays and loadData function
data_script_pattern = r"const clients = \[.*?\];.*?const printers = \[.*?\];"
new_data_script = """
const API_BASE = "http://127.0.0.1:5000/api";
let clients = [];
let printers = [];

async function loadData() {
    try {
        const cRes = await fetch(`${API_BASE}/clients`);
        clients = await cRes.json();
        
        const pRes = await fetch(`${API_BASE}/printers`);
        printers = await pRes.json();
        
        render();
        updateBadges();
    } catch(e) {
        console.error("Erro ao conectar com API: ", e);
        toast("Erro de conexão com servidor!");
    }
}
"""
html = re.sub(data_script_pattern, new_data_script, html, flags=re.DOTALL)

# 2. Update Inicializar
html = html.replace("goTo('dashboard');", "goTo('dashboard');\n        loadData();\n        setInterval(loadData, 5000); // Polling de 5s")

# 3. Update saveClient
save_client_pattern = r"function saveClient\(event\) \{.*?(?=function deleteClient)"
new_save_client = """function saveClient(event) {
    event.preventDefault();
    const id = document.getElementById('clientId').value;
    const data = {
        name: document.getElementById('clientName').value,
        doc: document.getElementById('clientDoc').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        address: document.getElementById('clientAddress').value,
        plan: document.getElementById('clientPlan').value,
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/clients/${id}` : `${API_BASE}/clients`;
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()).then(resp => {
        closeModal('modalClient');
        toast(id ? 'Cliente atualizado!' : 'Cliente criado com sucesso!');
        loadData();
    }).catch(err => toast("Erro ao salvar!"));
}
"""
html = re.sub(save_client_pattern, new_save_client, html, flags=re.DOTALL)

# 4. Update deleteClient
delete_client_pattern = r"function deleteClient\(id\) \{.*?(?=function statusTag)"
new_delete_client = """function deleteClient(id) {
    if (!confirm('Excluir cliente e suas impressoras permanentemente?')) return;
    
    fetch(`${API_BASE}/clients/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(resp => {
        if (currentPage === 'client-detail' && currentClientId === id) goTo('clients');
        toast('Cliente excluído.');
        loadData();
    }).catch(err => toast("Erro ao excluir."));
}

// ==================== HELPERS ====================
"""
html = re.sub(delete_client_pattern, new_delete_client, html, flags=re.DOTALL)

# 5. Update downloadClientAgent
dl_agent_pattern = r"function downloadClientAgent\(clientId\) \{.*?\}"
new_dl_agent = """function downloadClientAgent(clientId) {
    toast(`⬇️ Gerando e baixando agente...`);
    window.location.href = `${API_BASE}/clients/${clientId}/download-agent`;
}"""
html = re.sub(dl_agent_pattern, new_dl_agent, html, flags=re.DOTALL)

# 6. Update tonerBar to handle null
toner_pattern = r"function tonerBar\(level\) \{.*?return.*?;\s*\}"
new_toner = """function tonerBar(level) {
    if (level === null || level === undefined || level === "N/A" || level === "") {
        return `<span class="tag tag-yellow"><i class="fas fa-exclamation-circle"></i> Nível N/A</span>`;
    }
    let color = 'var(--green)';
    if (level < 20) color = 'var(--red)';
    else if (level < 40) color = 'var(--yellow)';
    return `<div style="display:flex;align-items:center;gap:5px;"><div style="width:44px;height:5px;background:var(--bg-input);border-radius:6px;overflow:hidden;"><div style="width:${level}%;height:100%;background:${color};border-radius:6px;"></div></div>${level}%</div>`;
}"""
html = re.sub(toner_pattern, new_toner, html, flags=re.DOTALL)

# 7. Add Force Scan action via refreshData and Global downloadAgent
html = html.replace(
    "function refreshData() {", 
    "function refreshData() {\n    if (currentPage === 'client-detail' && currentClientId) {\n        fetch(`${API_BASE}/admin/force-scan/${currentClientId}`, { method: 'POST' }).then(()=>toast('Ordem enviada ao Agente!'));\n    }\n"
)

with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Migration completed.")
