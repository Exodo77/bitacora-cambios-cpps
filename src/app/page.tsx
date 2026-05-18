"use client";

import React, { useState, useEffect } from "react";
import { getTimelineData, saveTimelineData, TimelineEntry } from "./actions";

export default function Home() {
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    description: "",
    tags: "",
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
      });
    } else {
      setEditingEntry(null);
      setFormData({
        title: "",
        date: "",
        description: "",
        tags: "",
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

    let newData: TimelineEntry[];

    if (editingEntry) {
      newData = timelineData.map(item => 
        item.id === editingEntry.id 
          ? { ...item, ...formData, tags: tagsArray } 
          : item
      );
    } else {
      const newEntry: TimelineEntry = {
        id: Date.now().toString(),
        title: formData.title,
        date: formData.date,
        description: formData.description,
        tags: tagsArray,
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

  return (
    <main>
      <div className="header-container">
        <h1 className="header-title">Bitácora de Implementaciones</h1>
        <p className="header-subtitle">
          Registro oficial de actualizaciones, auditorías y nuevas funcionalidades incorporadas al sistema del Colegio Profesional de Psicopedagogía, fuera del alcance inicial.
        </p>
      </div>

      <div className="controls-container">
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Agregar Registro
        </button>
        <button className="btn" onClick={handlePrint}>
          Exportar a PDF
        </button>
      </div>

      <div className="timeline-container">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando bitácora...</div>
        ) : timelineData.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay registros en la bitácora.</div>
        ) : (
          timelineData.map((item) => (
            <div className="timeline-item" key={item.id}>
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
                
                <span className="timeline-date">{item.date}</span>
                <h3 className="timeline-title">{item.title}</h3>
                <p className="timeline-description">{item.description}</p>
                <div className="timeline-tags">
                  {item.tags.map((tag, index) => (
                    <span className="tag" key={index}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-header">
              {editingEntry ? "Editar Registro" : "Nuevo Registro"}
            </h2>
            <form onSubmit={handleSave}>
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
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: 17 de Mayo, 2026 o Por definir"
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
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
