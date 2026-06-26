import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Printer, Settings, Activity, 
  DownloadCloud, Search, Cpu, Plus, Trash2, Edit2, List, CheckSquare, Square
} from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:5000/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="brand">
          <Cpu className="brand-icon" size={28} />
          <span>PrintControl</span>
        </div>
        
        <nav style={{ marginTop: '2rem' }}>
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="#" className={`nav-item ${activeTab === 'clients' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('clients'); }}>
            <Users size={20} /> Clientes
          </a>
          <a href="#" className={`nav-item ${activeTab === 'printers' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('printers'); }}>
            <Printer size={20} /> Impressoras
          </a>
          <a href="#" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}>
            <Settings size={20} /> Configurações
          </a>
        </nav>
      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'clients' && <ClientsView onSelectClient={(c) => { setSelectedClient(c); setActiveTab('client_dashboard'); }} />}
        {activeTab === 'client_dashboard' && selectedClient && <ClientDashboardView client={selectedClient} onBack={() => setActiveTab('clients')} />}
      </main>
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchStats(); }, []);
  const fetchStats = () => {
    fetch(`${API_BASE}/dashboard/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  };

  if (!stats) return <div style={{color:'white'}}>Carregando estatísticas...</div>;

  return (
    <div className="animate-fade-in">
      <header className="header">
        <h1>Visão Global</h1>
        <div className="header-actions">
          <button onClick={fetchStats}><Activity size={18} /> Atualizar</button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card" style={{ animationDelay: '0.1s' }}>
          <div className="stat-header"><span>Páginas Impressas</span><Activity size={18} color="var(--accent)" /></div>
          <div className="stat-value">{stats.totalPages}</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.2s' }}>
          <div className="stat-header"><span>Impressoras Monitoradas</span><Printer size={18} color="var(--success)" /></div>
          <div className="stat-value">{stats.monitoredPrinters}</div>
        </div>
        <div className="stat-card" style={{ animationDelay: '0.3s' }}>
          <div className="stat-header"><span>Clientes Cadastrados</span><Users size={18} color="#f59e0b" /></div>
          <div className="stat-value">{stats.totalClients}</div>
        </div>
      </div>

      <div className="glass-panel">
        <h2>Histórico Recente de Impressões</h2>
        <div className="client-list">
          {stats.recentJobs && stats.recentJobs.length > 0 ? (
            stats.recentJobs.map((job, i) => (
              <div className="client-row" key={i}>
                <div className="client-info">
                  <h3>{job.clientName}</h3>
                  <p>{job.printerModel} • {job.totalPages} página(s) • {job.documentName} • User: {job.userName}</p>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {new Date(job.printedAt).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p style={{color: 'var(--text-muted)'}}>Sem registros.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientsView({ onSelectClient }) {
  const [clients, setClients] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showPrintersModal, setShowPrintersModal] = useState(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [clientPrinters, setClientPrinters] = useState([]);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = () => {
    fetch(`${API_BASE}/clients`)
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(err => console.error(err));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, code: formCode })
    })
    .then(() => { setShowCreateModal(false); setFormName(''); setFormCode(''); fetchClients(); })
  };

  const handleEdit = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/clients/${showEditModal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, code: formCode })
    })
    .then(() => { setShowEditModal(null); setFormName(''); setFormCode(''); fetchClients(); })
  };

  const handleDelete = (id) => {
    if(!window.confirm("Deseja realmente excluir este cliente e todo seu histórico?")) return;
    fetch(`${API_BASE}/clients/${id}`, { method: 'DELETE' })
    .then(() => fetchClients())
  };

  const openPrinters = (client) => {
    setShowPrintersModal(client);
    fetch(`${API_BASE}/clients/${client.id}/printers`)
      .then(res => res.json())
      .then(data => setClientPrinters(data));
  };

  const togglePrinterMonitor = (printerId, currentStatus) => {
    fetch(`${API_BASE}/printers/${printerId}/monitor`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isMonitored: !currentStatus })
    }).then(() => {
      // Refresh printers list
      fetch(`${API_BASE}/clients/${showPrintersModal.id}/printers`)
      .then(res => res.json())
      .then(data => setClientPrinters(data));
    });
  };

  const forceScan = (clientId) => {
    fetch(`${API_BASE}/admin/force-scan/${clientId}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => alert(data.message));
  };

  if (!clients) return <div style={{color:'white'}}>Carregando lista de clientes...</div>;

  return (
    <div className="animate-fade-in" style={{position: 'relative'}}>
      <header className="header">
        <h1>Gestão de Clientes</h1>
        <div className="header-actions">
          <button onClick={() => { setFormName(''); setFormCode(''); setShowCreateModal(true); }}>
            <Plus size={18} /> Novo Cliente
          </button>
        </div>
      </header>

      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h2>{showCreateModal ? 'Cadastrar Novo Cliente' : 'Editar Cliente'}</h2>
            <form onSubmit={showCreateModal ? handleCreate : handleEdit}>
              <div style={{marginBottom: '1rem'}}>
                <label>Nome / Razão Social</label>
                <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div style={{marginBottom: '1.5rem'}}>
                <label>CNPJ ou Código</label>
                <input type="text" value={formCode} onChange={e => setFormCode(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {setShowCreateModal(false); setShowEditModal(null);}}>Cancelar</button>
                <button type="submit" className="btn-save">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPrintersModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{width: '600px'}}>
            <h2>Impressoras de: {showPrintersModal.name}</h2>
            <div className="client-list" style={{maxHeight: '400px', overflowY: 'auto', marginBottom: '1rem'}}>
              {clientPrinters.length === 0 ? <p style={{color:'var(--text-muted)'}}>Nenhuma impressora descoberta.</p> : 
                clientPrinters.map(p => (
                  <div className="client-row" key={p.id} style={{padding: '0.8rem'}}>
                    <div className="client-info">
                      <h4>{p.model}</h4>
                      <p>IP: {p.ipAddress}</p>
                    </div>
                    <button 
                      onClick={() => togglePrinterMonitor(p.id, p.isMonitored)}
                      style={{
                        background: p.isMonitored ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: p.isMonitored ? 'var(--success)' : 'var(--text-muted)',
                        border: `1px solid ${p.isMonitored ? 'var(--success)' : 'var(--border)'}`,
                        display: 'flex', gap: '0.5rem', alignItems: 'center'
                      }}>
                      {p.isMonitored ? <CheckSquare size={16} /> : <Square size={16} />}
                      {p.isMonitored ? 'Monitorando' : 'Ignorada'}
                    </button>
                  </div>
                ))
              }
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowPrintersModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel">
        <div className="client-list">
          {clients.length === 0 ? (
            <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '2rem'}}>Nenhum cliente cadastrado.</p>
          ) : (
            clients.map(client => (
              <div className="client-row" key={client.id}>
                <div className="client-info">
                  <h3>{client.name} (ID: {client.id})</h3>
                  <p>CNPJ/Code: {client.clientCode} • {client.printerCount} Impressoras Cadastradas</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  
                  <button onClick={() => { setFormName(client.name); setFormCode(client.clientCode); setShowEditModal(client); }} className="icon-btn" title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="icon-btn danger" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={() => openPrinters(client)} className="icon-btn primary" title="Ver Impressoras">
                    <Printer size={16} />
                  </button>
                  <button onClick={() => onSelectClient(client)} className="icon-btn" style={{background: 'var(--accent)', color: 'white'}} title="Gerenciar Sistema do Cliente">
                    <Activity size={16} />
                  </button>
                  
                  <div style={{width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem'}}></div>
                  
                  <a href={`${API_BASE}/clients/${client.id}/download-agent`} download>
                    <button style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <DownloadCloud size={16} /> Baixar Agente
                    </button>
                  </a>
                  <button onClick={() => forceScan(client.id)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Search size={16} /> Forçar Escaneamento
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

function ClientDashboardView({ client, onBack }) {
  const [activeSubTab, setActiveSubTab] = useState('history'); // history, rules, billing
  
  // History state
  const [jobs, setJobs] = useState([]);
  // Rules state
  const [quotas, setQuotas] = useState([]);
  const [newQuotaUser, setNewQuotaUser] = useState('');
  const [newQuotaMax, setNewQuotaMax] = useState(0);
  // Billing state
  const [pricePerPage, setPricePerPage] = useState(0.10);
  
  useEffect(() => {
    if (activeSubTab === 'history') fetchJobs();
    if (activeSubTab === 'rules') fetchQuotas();
  }, [activeSubTab]);
  
  const fetchJobs = () => {
    fetch(`${API_BASE}/clients/${client.id}/jobs`)
      .then(res => res.json())
      .then(data => setJobs(data));
  };
  
  const fetchQuotas = () => {
    fetch(`${API_BASE}/quotas/${client.id}`)
      .then(res => res.json())
      .then(data => setQuotas(data));
  };

  const saveQuota = (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/quotas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, userName: newQuotaUser, maxPages: parseInt(newQuotaMax), isBlocked: false })
    }).then(() => { fetchQuotas(); setNewQuotaUser(''); setNewQuotaMax(0); });
  };

  const deleteQuota = (id) => {
    fetch(`${API_BASE}/quotas/${id}`, { method: 'DELETE' }).then(() => fetchQuotas());
  };
  
  return (
    <div className="animate-fade-in">
      <header className="header">
        <h1>Sistema do Cliente: {client.name}</h1>
        <div className="header-actions">
          <button onClick={onBack} className="btn-cancel">Voltar para Clientes</button>
        </div>
      </header>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button onClick={() => { setActiveSubTab('history'); fetchJobs(); }} className={activeSubTab === 'history' ? 'btn-save' : 'btn-cancel'}>Histórico</button>
        <button onClick={() => setActiveSubTab('rules')} className={activeSubTab === 'rules' ? 'btn-save' : 'btn-cancel'}>Regras e Cotas</button>
        <button onClick={() => { setActiveSubTab('billing'); fetchJobs(); }} className={activeSubTab === 'billing' ? 'btn-save' : 'btn-cancel'}>Bilhetagem</button>
      </div>
      
      <div className="glass-panel">
        {activeSubTab === 'history' && (
          <div>
            <h2>Histórico de Impressões</h2>
            <div className="client-list">
              {jobs.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Nenhuma impressão registrada.</p> :
                jobs.map((job, i) => (
                  <div className="client-row" key={i}>
                    <div className="client-info">
                      <h3>{job.documentName}</h3>
                      <p>{job.printerModel} • Usuário: {job.userName} • {job.totalPages} página(s)</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{job.printedAt}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        {activeSubTab === 'rules' && (
          <div>
            <h2>Regras e Cotas por Usuário</h2>
            <form onSubmit={saveQuota} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <label>Usuário do Windows</label>
                <input type="text" required value={newQuotaUser} onChange={e => setNewQuotaUser(e.target.value)} style={{marginTop:'0.5rem', display:'block'}}/>
              </div>
              <div>
                <label>Máx. Páginas (0 = ilimitado)</label>
                <input type="number" required value={newQuotaMax} onChange={e => setNewQuotaMax(e.target.value)} style={{marginTop:'0.5rem', display:'block'}}/>
              </div>
              <button type="submit" className="btn-save">Adicionar / Atualizar</button>
            </form>
            
            <div className="client-list">
              {quotas.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Sem regras definidas para os usuários deste cliente.</p> :
                quotas.map(q => (
                  <div className="client-row" key={q.id}>
                    <div className="client-info">
                      <h3>{q.userName}</h3>
                      <p>Limite: {q.maxPages === 0 ? 'Ilimitado' : q.maxPages} • Usadas: {q.pagesUsed}</p>
                    </div>
                    <button onClick={() => deleteQuota(q.id)} className="icon-btn danger"><Trash2 size={16} /></button>
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        {activeSubTab === 'billing' && (
          <div>
            <h2>Resumo Financeiro da Bilhetagem</h2>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg)', padding: '1rem', borderRadius: '8px' }}>
              <label>Definir Preço por Página (R$):</label>
              <input type="number" step="0.01" value={pricePerPage} onChange={e => setPricePerPage(parseFloat(e.target.value) || 0)} style={{ width: '120px' }} />
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">Total de Páginas (Geral)</div>
                <div className="stat-value">{jobs.reduce((acc, job) => acc + job.totalPages, 0)}</div>
              </div>
              <div className="stat-card" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'var(--success)' }}>
                <div className="stat-header" style={{ color: 'var(--success)' }}>Faturamento (Estimativa)</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>
                  R$ {(jobs.reduce((acc, job) => acc + job.totalPages, 0) * pricePerPage).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
