'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  ShoppingBag,
  Scale,
  Clock,
  Palette,
  Calculator,
  Copy,
  Check,
  X,
  Sparkles,
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { PRODUCT_TYPES, PRESET_COLORS } from '../data/initialData';
import {
  calculateProductPricing,
  getCostPerGram,
  formatCurrency,
  formatNumber,
} from '../utils/calculations';
import { compressAndUploadPhoto } from '../lib/dbSync';
import SmartImage from './SmartImage';

export default function ProductManager({
  products,
  setProducts,
  yarns,
  laborConfig,
  onNavigateToYarns,
  onNavigateToLabor,
}) {
  const fileInputRef = useRef(null);

  const yarnsMap = useMemo(() => {
    const map = {};
    yarns.forEach((y) => {
      map[y.id] = y;
    });
    return map;
  }, [yarns]);

  const createEmptyForm = () => ({
    nome: '',
    tipo: PRODUCT_TYPES[0],
    cores: yarns.length > 0 ? [yarns[0].cor] : ['Cru'],
    pesoTotal: '',
    autoSyncPeso: true,
    linhasUsadas:
      yarns.length > 0
        ? [{ yarnId: yarns[0].id, pesoUsado: 150 }]
        : [],
    horasGastas: 3,
    valorHora: laborConfig.valorHoraPadrao,
    custoExtra: 0,
    margemLucro: laborConfig.margemLucroPadrao || 0,
    estoqueAtual: 1,
    estoqueMinimo: 0,
    fotos: [],
    visivelCatalogo: true,
    observacoes: '',
  });

  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [colorInput, setColorInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Se o usuário acabou de cadastrar a primeira linha, pré-seleciona ela no formulário vazio
  useEffect(() => {
    if (!editingId && form.linhasUsadas.length === 0 && yarns.length > 0) {
      setForm((prev) => ({
        ...prev,
        cores: [yarns[0].cor],
        linhasUsadas: [{ yarnId: yarns[0].id, pesoUsado: 150 }],
      }));
    }
  }, [yarns, editingId, form.linhasUsadas.length]);

  // Cálculo em tempo real da peça sendo montada no formulário
  const livePricing = useMemo(() => {
    return calculateProductPricing(form, yarnsMap, laborConfig.valorHoraPadrao);
  }, [form, yarnsMap, laborConfig.valorHoraPadrao]);

  const effectivePesoProduto = form.autoSyncPeso
    ? livePricing.pesoTotalLinhas
    : Number(form.pesoTotal) || 0;

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const url = await compressAndUploadPhoto(file);
        if (url) uploadedUrls.push(url);
      }
      setForm((prev) => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...uploadedUrls],
      }));
    } catch (err) {
      console.error(err);
      alert('Não foi possível processar uma das fotos selecionadas.');
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleRemovePhoto(indexToRemove) {
    setForm((prev) => ({
      ...prev,
      fotos: (prev.fotos || []).filter((_, idx) => idx !== indexToRemove),
    }));
  }

  function handleAddColor(colorName) {
    const trimmed = (colorName || colorInput).trim();
    if (!trimmed) return;
    if (!form.cores.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setForm((prev) => ({
        ...prev,
        cores: [...prev.cores, trimmed],
      }));
    }
    setColorInput('');
  }

  function handleRemoveColor(colorToRemove) {
    setForm((prev) => ({
      ...prev,
      cores: prev.cores.filter((c) => c !== colorToRemove),
    }));
  }

  function handleSyncColorsFromYarns() {
    const yarnColors = form.linhasUsadas
      .map((u) => yarnsMap[u.yarnId]?.cor)
      .filter(Boolean);
    const merged = Array.from(new Set([...form.cores, ...yarnColors]));
    setForm((prev) => ({ ...prev, cores: merged }));
  }

  function handleAddYarnUsage() {
    if (yarns.length === 0) return;
    const defaultYarn = yarns[0];
    setForm((prev) => {
      const nextColors = prev.cores.includes(defaultYarn.cor)
        ? prev.cores
        : [...prev.cores, defaultYarn.cor];
      return {
        ...prev,
        cores: nextColors,
        linhasUsadas: [
          ...prev.linhasUsadas,
          { yarnId: defaultYarn.id, pesoUsado: 100 },
        ],
      };
    });
  }

  function handleUpdateYarnUsage(index, field, value) {
    setForm((prev) => {
      const updated = prev.linhasUsadas.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      let updatedColors = prev.cores;
      if (field === 'yarnId' && yarnsMap[value]?.cor) {
        const newColor = yarnsMap[value].cor;
        if (!updatedColors.includes(newColor)) {
          updatedColors = [...updatedColors, newColor];
        }
      }
      return {
        ...prev,
        cores: updatedColors,
        linhasUsadas: updated,
      };
    });
  }

  function handleRemoveYarnUsage(index) {
    setForm((prev) => ({
      ...prev,
      linhasUsadas: prev.linhasUsadas.filter((_, idx) => idx !== index),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) {
      alert('Informe o nome ou identificação da peça.');
      return;
    }
    if (form.linhasUsadas.length === 0) {
      alert('Adicione pelo menos uma linha utilizada na confecção da peça.');
      return;
    }

    const payload = {
      id: editingId || `prod-${Date.now()}`,
      nome: form.nome.trim(),
      tipo: form.tipo,
      cores: form.cores.length > 0 ? form.cores : ['Cru'],
      pesoTotal: effectivePesoProduto,
      linhasUsadas: form.linhasUsadas.map((u) => ({
        yarnId: u.yarnId,
        pesoUsado: Number(u.pesoUsado) || 0,
      })),
      horasGastas: Number(form.horasGastas) || 0,
      valorHora: Number(form.valorHora) || 0,
      custoExtra: Number(form.custoExtra) || 0,
      margemLucro: Number(form.margemLucro) || 0,
      estoqueAtual: Math.max(0, Number(form.estoqueAtual) || 0),
      estoqueMinimo: Math.max(0, Number(form.estoqueMinimo) || 0),
      fotos: Array.isArray(form.fotos) ? form.fotos : [],
      visivelCatalogo:
        form.visivelCatalogo === undefined ? true : Boolean(form.visivelCatalogo),
      precoCatalogo: Number(livePricing.valorFinalSugerido.toFixed(2)),
      observacoes: form.observacoes.trim(),
      criadoEm: new Date().toISOString().slice(0, 10),
    };

    if (editingId) {
      setProducts((prev) => prev.map((p) => (p.id === editingId ? payload : p)));
      setEditingId(null);
    } else {
      setProducts((prev) => [payload, ...prev]);
    }

    setForm(createEmptyForm());
  }

  function handleEdit(prod) {
    setEditingId(prod.id);
    const sumLinhas = (prod.linhasUsadas || []).reduce(
      (acc, cur) => acc + (Number(cur.pesoUsado) || 0),
      0
    );
    setForm({
      nome: prod.nome,
      tipo: prod.tipo,
      cores: prod.cores || [],
      pesoTotal: prod.pesoTotal,
      autoSyncPeso: Number(prod.pesoTotal) === sumLinhas,
      linhasUsadas: prod.linhasUsadas || [],
      horasGastas: prod.horasGastas,
      valorHora: prod.valorHora,
      custoExtra: prod.custoExtra || 0,
      margemLucro: prod.margemLucro || 0,
      estoqueAtual: prod.estoqueAtual ?? 0,
      estoqueMinimo: prod.estoqueMinimo ?? 0,
      fotos: Array.isArray(prod.fotos) ? prod.fotos : [],
      visivelCatalogo:
        prod.visivelCatalogo === undefined ? true : Boolean(prod.visivelCatalogo),
      observacoes: prod.observacoes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleToggleCatalogVisibility(prod) {
    const nextVal = !(prod.visivelCatalogo ?? true);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === prod.id ? { ...p, visivelCatalogo: nextVal } : p
      )
    );
  }

  function handleDelete(id) {
    if (window.confirm('Deseja excluir esta peça do catálogo?')) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(createEmptyForm());
      }
    }
  }

  function handleCopySummary(prod) {
    const calc = calculateProductPricing(prod, yarnsMap, laborConfig.valorHoraPadrao);
    const linhasTexto = calc.itensLinhas
      .map((item) =>
        item.yarn
          ? `• ${item.yarn.descricao} (${item.yarn.cor} - ${item.yarn.marca}): ${item.pesoUsado}g = ${formatCurrency(item.custoSubtotal)}`
          : `• Linha removida: ${item.pesoUsado}g`
      )
      .join('\n');

    const text = [
      `🧶 *FICHA DE PRECIFICAÇÃO - ${prod.nome.toUpperCase()}*`,
      `📌 Tipo: ${prod.tipo}`,
      `🎨 Cores: ${(prod.cores || []).join(', ')}`,
      `⚖️ Peso da Peça: ${prod.pesoTotal}g`,
      ``,
      `*Linhas Utilizadas:*`,
      linhasTexto,
      `💰 Custo de Linhas: ${formatCurrency(calc.custoLinhas)}`,
      calc.custoExtra > 0 ? `✨ Acessórios/Extras: ${formatCurrency(calc.custoExtra)}` : null,
      `⏱️ Mão de Obra: ${calc.horasGastas}h × ${formatCurrency(calc.valorHora)}/h = ${formatCurrency(calc.custoMaoDeObra)}`,
      `────────────────────`,
      `💵 *Custo Base (Material + Horas):* ${formatCurrency(calc.valorBasePeca)}`,
      calc.margemLucro > 0
        ? `🌟 *Valor Final c/ Margem (${calc.margemLucro}%):* ${formatCurrency(calc.valorFinalSugerido)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(prod.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchTerm.toLowerCase();
      return (
        p.nome.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        (p.cores || []).some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [products, searchTerm]);

  return (
    <div className="workspace-grid-wide">
      {/* Coluna Esquerda: Cadastro do Produto, Fotos e Cálculo Automático */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <ShoppingBag size={20} color="var(--primary)" />
              {editingId ? 'Editar Peça de Crochê' : 'Cadastrar Peça & Publicar no Catálogo'}
            </h2>
            <p className="panel-subtitle">
              Cadastre a peça com fotos, linhas usadas e horas para aparecer automaticamente no Catálogo Virtual.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingId(null);
                setForm(createEmptyForm());
              }}
            >
              <X size={16} /> Cancelar
            </button>
          )}
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {/* Nome e Tipo do Produto */}
          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Nome / Modelo da Peça *</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Tapete Oval Bico Russo, Sousplat..."
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Categoria / Tipo *</span>
              </label>
              <select
                className="select"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fotos da Peça para o Catálogo Virtual */}
          <div className="field-group">
            <label className="field-label">
              <span>Fotos da Peça (para o Catálogo Virtual)</span>
              <span className="field-hint">Câmera do celular ou galeria</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhotos}
                style={{ flex: 1 }}
              >
                <Camera size={18} color="var(--primary)" />
                {uploadingPhotos
                  ? 'Enviando foto(s)...'
                  : 'Tirar Foto ou Escolher da Galeria'}
              </button>
            </div>

            {form.fotos && form.fotos.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                  marginTop: '0.45rem',
                }}
              >
                {form.fotos.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '78px',
                      height: '78px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid var(--border-strong)',
                    }}
                  >
                    <SmartImage
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: '#fff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Remover foto"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes / Medidas para a Cliente + Visibilidade no Catálogo */}
          <div className="field-group">
            <div className="field-label">
              <span>Detalhes e Medidas da Peça (visível para a cliente)</span>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  color: 'var(--secondary)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.visivelCatalogo}
                  onChange={(e) =>
                    setForm({ ...form, visivelCatalogo: e.target.checked })
                  }
                />
                Mostrar no Catálogo Virtual
              </label>
            </div>
            <textarea
              rows={2}
              className="textarea"
              placeholder="Ex: Medida 70cm x 50cm. Confeccionado em barbante 100% algodão. Aceito encomendas em outras cores!"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          {/* Cores do Produto (Uma ou Mais Cores) */}
          <div className="field-group">
            <label className="field-label">
              <span>Cores do Produto (uma ou mais) *</span>
              <button
                type="button"
                onClick={handleSyncColorsFromYarns}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Puxar cores das linhas
              </button>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input"
                placeholder="Digite uma cor (ex: Cru, Mostarda)..."
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddColor();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleAddColor()}
                style={{ whiteSpace: 'nowrap' }}
              >
                + Cor
              </button>
            </div>

            {/* Sugestões rápidas de cores */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {PRESET_COLORS.slice(0, 8).map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="tag"
                  style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                  onClick={() => handleAddColor(c.name)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: '1px solid rgba(0,0,0,0.2)',
                    }}
                  />
                  + {c.name}
                </button>
              ))}
            </div>

            {/* Cores selecionadas na peça */}
            <div className="color-chips-wrap">
              {form.cores.map((cor) => (
                <span key={cor} className="color-chip">
                  <Palette size={13} color="var(--primary)" />
                  {cor}
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(cor)}
                    title="Remover cor"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              {form.cores.length === 0 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                  Nenhuma cor adicionada ainda.
                </span>
              )}
            </div>
          </div>

          {/* Quais Linhas Usou + Quantidade em Peso (g) */}
          <div className="field-group">
            <div className="field-label">
              <span>Quais Linhas Usou & Peso (g) *</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddYarnUsage}
              >
                <Plus size={14} /> + Linha na Peça
              </button>
            </div>

            {yarns.length === 0 ? (
              <div className="calc-preview-box">
                <span style={{ fontSize: '0.85rem' }}>
                  Cadastre primeiro os rolos de linha na aba <strong>1. Linhas</strong> para selecioná-los aqui.
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateToYarns}
                >
                  Ir para Cadastro de Linhas
                </button>
              </div>
            ) : (
              <div className="yarn-usage-list">
                {form.linhasUsadas.map((usage, index) => {
                  const selectedYarn = yarnsMap[usage.yarnId];
                  const costPerGram = getCostPerGram(selectedYarn);
                  const subtotal = costPerGram * (Number(usage.pesoUsado) || 0);

                  return (
                    <div key={index} className="yarn-usage-row">
                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Linha #{index + 1} (Tipo, Cor, Ordem e Marca)
                        </label>
                        <select
                          className="select"
                          value={usage.yarnId}
                          onChange={(e) =>
                            handleUpdateYarnUsage(index, 'yarnId', e.target.value)
                          }
                        >
                          {yarns.map((y) => (
                            <option key={y.id} value={y.id}>
                              {y.descricao} — {y.cor} ({y.marca} | {y.ordem} |{' '}
                              {formatCurrency(y.valor)}/{y.pesoRolo}g)
                            </option>
                          ))}
                        </select>
                        <div className="yarn-usage-cost">
                          Custo na peça: {formatCurrency(subtotal)} (R${' '}
                          {formatNumber(costPerGram, 4)}/g)
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: '0.25rem',
                          }}
                        >
                          Peso Usado (g)
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          className="input"
                          placeholder="Gramas"
                          value={usage.pesoUsado}
                          onChange={(e) =>
                            handleUpdateYarnUsage(index, 'pesoUsado', e.target.value)
                          }
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleRemoveYarnUsage(index)}
                          title="Remover esta linha"
                          disabled={form.linhasUsadas.length === 1}
                        >
                          <Trash2 size={16} /> Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Peso Total do Produto, Custos Extras e Estoque */}
          <div className="form-row-3">
            <div className="field-group">
              <label className="field-label">
                <span>Peso da Peça (g) *</span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    color: 'var(--secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.autoSyncPeso}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        autoSyncPeso: e.target.checked,
                        pesoTotal: e.target.checked
                          ? livePricing.pesoTotalLinhas
                          : form.pesoTotal || livePricing.pesoTotalLinhas,
                      })
                    }
                  />
                  Auto ({livePricing.pesoTotalLinhas}g)
                </label>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                className="input"
                value={effectivePesoProduto}
                disabled={form.autoSyncPeso}
                onChange={(e) =>
                  setForm({
                    ...form,
                    autoSyncPeso: false,
                    pesoTotal: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Extras / Emb. (R$)</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.10"
                className="input"
                placeholder="0.00"
                value={form.custoExtra}
                onChange={(e) => setForm({ ...form, custoExtra: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Qtd. em Estoque</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                className="input"
                placeholder="Ex: 1"
                value={form.estoqueAtual}
                onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })}
              />
            </div>
          </div>

          {/* Módulo de Horas Gastas e Valor da Hora para a Peça */}
          <div
            style={{
              background: 'var(--bg-sage-soft)',
              border: '1px solid #C6E0D4',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
                marginBottom: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--secondary)',
                }}
              >
                <Clock size={17} /> Horas Gastas & Valor da Hora
              </div>
              <button
                type="button"
                onClick={onNavigateToLabor}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--secondary)',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Calcular valor da minha hora
              </button>
            </div>

            <div className="form-row-3">
              <div className="field-group">
                <label className="field-label">
                  <span>Horas Gastas *</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  className="input"
                  placeholder="Ex: 4.5"
                  value={form.horasGastas}
                  onChange={(e) => setForm({ ...form, horasGastas: e.target.value })}
                  required
                />
                <span className="field-hint">Ex: 2.5 = 2h e 30min</span>
              </div>

              <div className="field-group">
                <label className="field-label">
                  <span>Valor da Hora (R$/h) *</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  className="input"
                  value={form.valorHora}
                  onChange={(e) => setForm({ ...form, valorHora: e.target.value })}
                  required
                />
                <span className="field-hint">
                  Padrão: {formatCurrency(laborConfig.valorHoraPadrao)}/h
                </span>
              </div>

              <div className="field-group">
                <label className="field-label">
                  <span>Lucro Extra (%)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="300"
                  step="5"
                  className="input"
                  value={form.margemLucro}
                  onChange={(e) => setForm({ ...form, margemLucro: e.target.value })}
                />
                <span className="field-hint">0% = apenas Custo + Horas</span>
              </div>
            </div>
          </div>

          {/* Recibo de Precificação Automática em Tempo Real */}
          <div className="pricing-receipt">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                color: 'var(--primary)',
                fontSize: '0.95rem',
              }}
            >
              <Calculator size={18} /> Resumo do Cálculo da Peça
            </div>

            <div className="receipt-row">
              <span>
                Custo das Linhas ({livePricing.pesoTotalLinhas}g):
              </span>
              <strong>{formatCurrency(livePricing.custoLinhas)}</strong>
            </div>

            {livePricing.custoExtra > 0 && (
              <div className="receipt-row">
                <span>Acessórios / Extras:</span>
                <strong>{formatCurrency(livePricing.custoExtra)}</strong>
              </div>
            )}

            <div className="receipt-row">
              <span>
                Mão de Obra ({livePricing.horasGastas}h ×{' '}
                {formatCurrency(livePricing.valorHora)}/h):
              </span>
              <strong>{formatCurrency(livePricing.custoMaoDeObra)}</strong>
            </div>

            <div className="receipt-divider" />

            <div className="receipt-row" style={{ fontSize: '0.95rem' }}>
              <span>
                <strong>Valor Base (Material + Horas):</strong>
              </span>
              <strong style={{ color: 'var(--secondary)', fontSize: '1.08rem' }}>
                {formatCurrency(livePricing.valorBasePeca)}
              </strong>
            </div>

            {livePricing.margemLucro > 0 && (
              <div className="receipt-row">
                <span>
                  + Margem do Ateliê ({livePricing.margemLucro}%):
                </span>
                <strong>+ {formatCurrency(livePricing.valorLucro)}</strong>
              </div>
            )}

            <div className="receipt-total">
              <div>
                <div className="total-label">PREÇO NO CATÁLOGO VIRTUAL</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                  {livePricing.margemLucro > 0
                    ? `Material + ${livePricing.horasGastas}h + ${livePricing.margemLucro}% margem`
                    : `Custo de linhas + ${livePricing.horasGastas}h de trabalho`}
                </div>
              </div>
              <div className="total-amount">
                {formatCurrency(livePricing.valorFinalSugerido)}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {editingId ? (
              <>
                <Check size={18} /> Atualizar Peça Cadastrada
              </>
            ) : (
              <>
                <Plus size={18} /> Salvar Peça e Publicar no Catálogo
              </>
            )}
          </button>
        </form>
      </div>

      {/* Coluna Direita: Lista de Produtos Confeccionados */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Sparkles size={20} color="var(--secondary)" />
              Peças Cadastradas ({filteredProducts.length})
            </h2>
            <p className="panel-subtitle">
              Gerencie suas peças e escolha quais aparecem no Catálogo Virtual das clientes.
            </p>
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            className="input"
            placeholder="Buscar peça por nome, tipo ou cor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma peça cadastrada ainda. Use o formulário para cadastrar a primeira!</p>
          </div>
        ) : (
          <div className="form-stack">
            {filteredProducts.map((prod) => {
              const calc = calculateProductPricing(
                prod,
                yarnsMap,
                laborConfig.valorHoraPadrao
              );
              const isVisible = prod.visivelCatalogo ?? true;
              const coverPhoto =
                Array.isArray(prod.fotos) && prod.fotos.length > 0
                  ? prod.fotos[0]
                  : null;

              return (
                <div key={prod.id} className="product-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                      {coverPhoto ? (
                        <SmartImage
                          src={coverPhoto}
                          alt={prod.nome}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-strong)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            background: 'var(--bg-subtle)',
                            border: '1px dashed var(--border-strong)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-light)',
                            flexShrink: 0,
                          }}
                          title="Sem foto cadastrada"
                        >
                          <ImageIcon size={22} />
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{prod.nome}</h3>
                          <span className="tag order-tag">{prod.tipo}</span>
                          <span className="tag">
                            <Scale size={12} /> {prod.pesoTotal}g
                          </span>
                          <span
                            className="tag"
                            style={{
                              background:
                                (Number(prod.estoqueAtual) || 0) > 0
                                  ? 'var(--bg-sage-soft)'
                                  : '#FEF3C7',
                              color:
                                (Number(prod.estoqueAtual) || 0) > 0
                                  ? 'var(--secondary)'
                                  : '#92400E',
                            }}
                          >
                            Estoque: {Number(prod.estoqueAtual) || 0} un.
                          </span>
                        </div>

                        <div className="color-chips-wrap" style={{ marginTop: '0.4rem' }}>
                          {(prod.cores || []).map((cor) => (
                            <span key={cor} className="tag" style={{ background: '#FFF' }}>
                              <Palette size={11} color="var(--primary)" /> {cor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleToggleCatalogVisibility(prod)}
                        title={
                          isVisible
                            ? 'Clique para ocultar do catálogo público'
                            : 'Clique para mostrar no catálogo público'
                        }
                        style={{
                          color: isVisible ? 'var(--secondary)' : 'var(--text-muted)',
                          borderColor: isVisible ? '#C6E0D4' : 'var(--border-strong)',
                        }}
                      >
                        {isVisible ? (
                          <>
                            <Eye size={14} /> No Catálogo
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} /> Oculta
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleCopySummary(prod)}
                        title="Copiar ficha para WhatsApp"
                      >
                        {copiedId === prod.id ? (
                          <>
                            <Check size={14} color="var(--secondary)" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Ficha
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEdit(prod)}
                        title="Editar peça"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => handleDelete(prod.id)}
                        title="Excluir peça"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {prod.observacoes && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-subtle)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {prod.observacoes}
                    </div>
                  )}

                  {/* Lista Mobile-Friendly de Linhas Usadas na Peça */}
                  <div className="product-yarns-mini-list">
                    <div
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      Linhas Utilizadas na Peça:
                    </div>
                    {calc.itensLinhas.map((item, idx) => (
                      <div key={idx} className="product-yarn-mini-item">
                        <div>
                          <strong>
                            {item.yarn ? item.yarn.descricao : 'Linha excluída'}
                          </strong>
                          {item.yarn && (
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.76rem' }}>
                              Cor: {item.yarn.cor} • {item.yarn.marca} ({item.yarn.ordem})
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                            {item.pesoUsado}g
                          </span>
                          <strong style={{ color: 'var(--secondary)' }}>
                            {formatCurrency(item.custoSubtotal)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumo de Custos e Valor Final */}
                  <div className="product-breakdown-grid">
                    <div className="breakdown-item">
                      <span>Material ({calc.pesoTotalLinhas}g)</span>
                      <strong>{formatCurrency(calc.custoMaterialTotal)}</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>
                        Mão de Obra ({calc.horasGastas}h)
                      </span>
                      <strong>{formatCurrency(calc.custoMaoDeObra)}</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>
                        {calc.margemLucro > 0
                          ? `Preço no Catálogo (c/ +${calc.margemLucro}%)`
                          : 'Preço no Catálogo'}
                      </span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>
                        {formatCurrency(calc.valorFinalSugerido)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
