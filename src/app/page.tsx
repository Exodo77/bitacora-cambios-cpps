"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getTimelineData, saveTimelineData, TimelineEntry } from "./actions";

export default function Home() {
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'extra' | 'pending'>('extra');
  
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
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getTimelineData();
    setTimelineData(data);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
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
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: "",
        date: "",
        description: "",
        tags: "",
        type: activeTab, // Default to the current tab
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tagsArray = formData.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    // Si la fecha queda vacía al guardar, forzamos "Por definir"
    const finalDate = formData.date || "Por definir";

    let newData: TimelineEntry[];

    if (editingEntry) {
      newData = timelineData.map(item => 
        item.id === editingEntry.id 
          ? { ...item, ...formData, date: finalDate, tags: tagsArray } 
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
      };
      newData = [...timelineData, newEntry];
    }

    setTimelineData(newData);
    await saveTimelineData(newData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      const newData = timelineData.filter(item => item.id !== id);
      setTimelineData(newData);
      await saveTimelineData(newData);
    }
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

  // Check if current tab is empty
  const currentTabItems = timelineData.filter(item => (item.type || 'extra') === activeTab);

  return (
    <main>
      <div className="header-container">
        <h1 className="header-title">Bitácora de Implementaciones</h1>
        <p className="header-subtitle">
          Registro oficial de actualizaciones, auditorías y nuevas funcionalidades incorporadas al sistema del Colegio Profesional de Psicopedagogía. <br/> 
          <strong>(Implementaciones y Tareas Extraordinarias Fuera del Presupuesto Original).</strong>
        </p>
        <div style={{ marginTop: '5rem', marginBottom: '3rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <img 
            src="/logo.png" 
            alt="Escudo del Colegio Profesional de Psicopedagogía de Salta" 
            style={{ maxWidth: '300px', height: 'auto', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }} 
          />
        </div>
      </div>

      <div className="controls-container">
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Agregar Registro
        </button>
        <button className="btn" onClick={handlePrint}>
          Exportar a PDF
        </button>
      </div>

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
      </div>

      <div className={`timeline-container show-${activeTab}`}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando bitácora...</div>
        ) : timelineData.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay registros en la bitácora.</div>
        ) : currentTabItems.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            No hay registros en esta sección.
          </div>
        ) : null}

        {!loading && timelineData.map((item) => {
          const itemTypeClass = item.type === 'pending' ? 'item-pending' : 'item-extra';
          return (
            <div className={`timeline-item ${itemTypeClass}`} key={item.id}>
              <div className="timeline-node"></div>
              <div className="timeline-content">
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
                
                <span className="timeline-date">{formatDate(item.date)}</span>
                <h3 className="timeline-title">{item.title}</h3>
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

      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.date === "Por definir" ? "" : formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  style={{ colorScheme: "dark" }}
                />
                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px", display: "block" }}>
                  Dejar vacío para mantener como "Por definir"
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción (soporta Markdown)</label>
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
    </main>
  );
}
