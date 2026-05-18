"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { getTimelineData, saveTimelineData, TimelineEntry, verifyPassword, enhanceDescription, askBlackboxChat } from "./actions";

export default function Home() {
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'extra' | 'pending' | 'chat'>('extra');
  const [isBudgetMode, setIsBudgetMode] = useState(false);
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  
  // Auth State
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    description: "",
    tags: "",
    type: "extra" as "extra" | "pending",
    price: "",
  });

  useEffect(() => {
    loadData();
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const loadData = async () => {
    setLoading(true);
    const data = await getTimelineData();
    setTimelineData(data);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const valid = await verifyPassword(adminPassword);
    if (valid) {
      setIsAdmin(true);
      setIsLoginModalOpen(false);
    } else {
      setLoginError("Contraseña incorrecta");
    }
  };

  const handleOpenModal = (entry?: TimelineEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        title: entry.title,
        date: entry.date,
        description: entry.description,
        tags: entry.tags.join(", "),
        type: entry.type || "extra",
        price: entry.price !== undefined ? entry.price.toString() : "",
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: "",
        date: "",
        description: "",
        tags: "",
        type: activeTab,
        price: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!formData.description.trim()) {
      alert("Por favor, escribe al menos algunas palabras en la descripción para que la IA pueda mejorarla.");
      return;
    }
    setIsEnhancing(true);
    const res = await enhanceDescription(formData.description);
    setIsEnhancing(false);
    
    if (res.success && res.data) {
      setFormData(prev => ({ ...prev, description: res.data as string }));
    } else {
      alert("Error al mejorar texto: " + res.error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tagsArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    const finalDate = formData.date || "Por definir";
    const priceNum = formData.price ? parseFloat(formData.price) : undefined;

    let newData: TimelineEntry[];

    if (editingEntry) {
      newData = timelineData.map(item => 
        item.id === editingEntry.id 
          ? { ...item, ...formData, date: finalDate, tags: tagsArray, price: priceNum } 
          : item
      );
    } else {
      const newEntry: TimelineEntry = {
        id: Date.now().toString(),
        title: formData.title,
        date: finalDate,
        description: formData.description,
        tags: tagsArray,
        type: formData.type,
        price: priceNum,
      };
      newData = [...timelineData, newEntry];
    }

    const res = await saveTimelineData(newData, adminPassword);
    if (res.success) {
      setTimelineData(newData);
      handleCloseModal();
    } else {
      alert("Error al guardar: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      const newData = timelineData.filter(item => item.id !== id);
      const res = await saveTimelineData(newData, adminPassword);
      if (res.success) {
        setTimelineData(newData);
        if (selectedBudgetIds.has(id)) {
          const newSet = new Set(selectedBudgetIds);
          newSet.delete(id);
          setSelectedBudgetIds(newSet);
        }
      } else {
        alert("Error al eliminar: " + res.error);
      }
    }
  };

  const toggleBudgetSelection = (id: string) => {
    const newSet = new Set(selectedBudgetIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedBudgetIds(newSet);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "Por definir") return "Por definir";
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return `${day} de ${months[parseInt(month, 10) - 1]}, ${year}`;
    }
    return dateString;
  };

  const currentTabItems = timelineData.filter(item => (item.type || 'extra') === activeTab);

  // Table items depends on whether we are generating a budget or just printing normally
  const tableItems = isBudgetMode 
    ? timelineData.filter(item => selectedBudgetIds.has(item.id)) 
    : currentTabItems;

  return (
    <main>
      {/* Top right buttons container */}
      <div className="print-hidden" style={{ position: 'fixed', top: '15px', right: '15px', display: 'flex', gap: '10px', zIndex: 1000 }}>
        <button 
          onClick={toggleTheme}
          style={{ padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}
        >
          {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
        </button>
        
        {!isAdmin ? (
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            style={{ padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}
          >
            🔒 Acceso Admin
          </button>
        ) : (
          <button 
            onClick={() => { setIsAdmin(false); setAdminPassword(''); setIsBudgetMode(false); }}
            style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', backdropFilter: 'blur(10px)' }}
          >
            Cerrar Sesión
          </button>
        )}
      </div>

      <div className="header-container">
        <h1 className="header-title">
          {isBudgetMode ? 'Presupuesto de Implementaciones' : 'Bitácora de Implementaciones'}
        </h1>
        <p className="header-subtitle">
          {isBudgetMode ? (
            <>Presupuesto oficial estimado para las tareas e implementaciones seleccionadas.</>
          ) : (
            <>
              Registro oficial de actualizaciones, auditorías y nuevas funcionalidades incorporadas al sistema del Colegio Profesional de Psicopedagogía. <br/> 
              <strong>(Implementaciones y Tareas Extraordinarias Fuera del Presupuesto Original).</strong>
            </>
          )}
        </p>
        <div style={{ marginTop: '5rem', marginBottom: '3rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img 
            src="/logo.png" 
            alt="Escudo del Colegio Profesional de Psicopedagogía de Salta" 
            style={{ maxWidth: '300px', height: 'auto', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }} 
          />
        </div>
      </div>

      <div className="controls-container">
        {isAdmin && !isBudgetMode && (
          <>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              + Agregar Registro
            </button>
            <button 
              className="btn" 
              onClick={() => setIsBudgetMode(true)}
            >
              📄 Armar Presupuesto
            </button>
          </>
        )}
      </div>

      {!isBudgetMode && (
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'extra' ? 'active' : ''}`}
            onClick={() => setActiveTab('extra')}
          >
            Completadas / Extras
          </button>
          <button 
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Implementaciones Pendientes
          </button>
          {isAdmin && (
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              ✨ Chatbot IA
            </button>
          )}
        </div>
      )}

      {activeTab === 'chat' && isAdmin && (
        <div className="chat-container print-hidden" style={{ maxWidth: '800px', margin: '0 auto 2rem', backgroundColor: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                <h3>Hola, soy tu asistente IA de Blackbox</h3>
                <p>Hazme cualquier consulta general y trataré de ayudarte.</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: msg.role === 'user' ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)', color: msg.role === 'user' ? 'white' : 'var(--text-primary)', padding: '1rem', borderRadius: '15px', borderBottomRightRadius: msg.role === 'user' ? '0' : '15px', borderBottomLeftRadius: msg.role === 'assistant' ? '0' : '15px' }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ))
            )}
            {isChatLoading && (
              <div style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '15px', borderBottomLeftRadius: '0' }}>
                <span style={{ animation: 'pulse 1.5s infinite' }}>Escribiendo...</span>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if(!chatInput.trim() || isChatLoading) return;
              const userMsg = chatInput;
              setChatInput("");
              const newHistory = [...chatMessages, {role: 'user' as const, content: userMsg}];
              setChatMessages(newHistory);
              setIsChatLoading(true);
              const res = await askBlackboxChat(newHistory);
              setIsChatLoading(false);
              if(res.success && res.data) {
                setChatMessages([...newHistory, {role: 'assistant', content: res.data}]);
              } else {
                setChatMessages([...newHistory, {role: 'assistant', content: `**Error:** ${res.error}`}]);
              }
            }} 
            style={{ padding: '1rem', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '10px' }}
          >
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              className="form-input"
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="submit" className="btn btn-primary" disabled={isChatLoading || !chatInput.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      {isBudgetMode && (
        <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
          Selecciona las implementaciones que deseas incluir en este presupuesto.
        </div>
      )}

      <div className={`timeline-container ${!isBudgetMode ? `show-${activeTab}` : ''}`} style={{ display: activeTab === 'chat' ? 'none' : 'block' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando bitácora...</div>
        ) : timelineData.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay registros en la bitácora.</div>
        ) : (!isBudgetMode && currentTabItems.length === 0) ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay registros en esta sección.
          </div>
        ) : null}

        {!loading && timelineData.map((item) => {
          // If in budget mode, we show all items but allow selection. If printed in budget mode, unselected are hidden.
          const isSelectedForBudget = selectedBudgetIds.has(item.id);
          
          // CRITICAL FIX: Determine if it should be hidden in the PDF based on the mode AND tab
          const isHiddenInPrint = isBudgetMode 
            ? !isSelectedForBudget 
            : (item.type || 'extra') !== activeTab;
          
          let itemTypeClass = item.type === 'pending' ? 'item-pending' : 'item-extra';
          
          // In budget mode, we don't use tab classes to hide items, we show all so they can select
          if (isBudgetMode) {
             itemTypeClass = '';
          }
          
          const categoryItems = timelineData.filter(i => (i.type || 'extra') === (item.type || 'extra'));
          const displayIndex = categoryItems.findIndex(i => i.id === item.id) + 1;

          return (
            <div className={`timeline-item ${itemTypeClass} ${isHiddenInPrint ? 'print-hidden' : ''}`} key={item.id} style={{ position: 'relative' }}>
              <div className="timeline-node"></div>
              
              {isBudgetMode && (
                <div className="print-hidden" style={{ position: 'absolute', left: '-50px', top: '3rem', zIndex: 10 }}>
                  <input 
                    type="checkbox" 
                    checked={isSelectedForBudget} 
                    onChange={() => toggleBudgetSelection(item.id)}
                    style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                  />
                </div>
              )}

              <div className="timeline-content" style={isBudgetMode && isSelectedForBudget ? { border: '2px solid var(--accent-color)', boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' } : {}}>
                {isAdmin && !isBudgetMode && (
                  <div className="timeline-item-actions">
                    <button 
                      className="btn-icon" 
                      onClick={() => handleOpenModal(item)}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button 
                      className="btn-icon danger" 
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                )}
                
                <span className="timeline-date">{formatDate(item.date)}</span>
                <h3 className="timeline-title">
                  {isBudgetMode ? `Ítem: ${item.title}` : `${displayIndex}. ${item.title}`}
                </h3>
                
                {item.price !== undefined && (
                  <div style={{ color: 'var(--accent-secondary)', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>
                    Inversión: ${item.price.toLocaleString('es-AR')}
                  </div>
                )}

                <div className="timeline-description">
                  <ReactMarkdown>{item.description}</ReactMarkdown>
                </div>
                <div className="timeline-tags">
                  {item.tags.map((tag, index) => (
                    <span className="tag" key={index}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print Only Summary Table */}
      <div className="print-only summary-table-container">
        <h2 style={{ color: 'black', marginBottom: '1rem', textAlign: 'center', fontFamily: 'var(--font-outfit)' }}>
          {isBudgetMode 
            ? 'Resumen de Presupuesto' 
            : `Resumen de Costos (${activeTab === 'extra' ? 'Completadas/Extras' : 'Pendientes'})`
          }
        </h2>
        <table className="summary-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Ítem</th>
              <th style={{ width: '60%' }}>Descripción</th>
              <th style={{ width: '30%', textAlign: 'right' }}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {tableItems.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.title}</td>
                <td style={{ textAlign: 'right' }}>{item.price !== undefined ? `$${item.price.toLocaleString('es-AR')}` : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>Total General:</td>
              <td style={{ fontWeight: 'bold', textAlign: 'right', fontSize: '1.2rem' }}>
                ${tableItems.reduce((acc, curr) => acc + (curr.price || 0), 0).toLocaleString('es-AR')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isLoginModalOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsLoginModalOpen(false)}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="modal-header">Acceso de Administrador</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                />
                {loginError && <small style={{ color: '#ef4444', marginTop: '8px', display: 'block' }}>{loginError}</small>}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setIsLoginModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Ingresar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && isAdmin && (
        <div className="modal-backdrop" onMouseDown={handleCloseModal}>
          <div className="modal-content" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <h2 className="modal-header">
              {editingEntry ? "Editar Registro" : "Nuevo Registro"}
            </h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Tipo de Registro</label>
                <select 
                  className="form-input" 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as "extra" | "pending"})}
                  style={{ background: 'var(--bg-color)' }}
                >
                  <option value="extra">Implementaciones y Tareas Extraordinarias (Completado)</option>
                  <option value="pending">Implementaciones Pendientes</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Título</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Costo / Presupuesto (Opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>$</span>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.date === "Por definir" ? "" : formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  style={{ colorScheme: theme }}
                />
                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                  Dejar vacío para mantener como "Por definir"
                </small>
              </div>
              
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Descripción (soporta Markdown)</label>
                  <button 
                    type="button" 
                    onClick={handleEnhance}
                    disabled={isEnhancing}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px',
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      cursor: isEnhancing ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: isEnhancing ? 0.7 : 1,
                      fontWeight: 'bold',
                      boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)'
                    }}
                  >
                    {isEnhancing ? '✨ Procesando...' : '✨ Mejorar con IA'}
                  </button>
                </div>
                <textarea 
                  className="form-textarea" 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
              
              <div className="form-group">
                <label className="form-label">Etiquetas (separadas por coma)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Base de Datos, Interfaz"
                  value={formData.tags}
                  onChange={e => setFormData({...formData, tags: e.target.value})}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="print-hidden" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, display: 'flex', gap: '1rem' }}>
        {isBudgetMode && (
          <button 
            className="btn"
            onClick={() => {
              setIsBudgetMode(false);
              setSelectedBudgetIds(new Set());
            }}
            style={{
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--card-border)',
              borderRadius: '50px',
              backdropFilter: 'blur(10px)'
            }}
          >
            ❌ Cancelar
          </button>
        )}
        <button 
          className="btn" 
          onClick={handlePrint}
          style={{
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            padding: '1rem 2rem',
            fontSize: '1.1rem',
            backgroundColor: isBudgetMode ? 'var(--accent-secondary)' : 'var(--card-bg)',
            color: isBudgetMode ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--accent-color)',
            borderRadius: '50px',
            backdropFilter: 'blur(10px)'
          }}
        >
          {isBudgetMode ? '🖨️ Exportar Presupuesto a PDF' : '🖨️ Exportar a PDF'}
        </button>
      </div>
    </main>
  );
}
