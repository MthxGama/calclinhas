'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  Check,
  X,
  Scale,
  Tag,
  Palette,
  Layers,
  DollarSign,
} from 'lucide-react';
import { PRESET_COLORS, ORDEM_OPTIONS } from '../data/initialData';
import { getCostPerGram, formatCurrency, formatNumber } from '../utils/calculations';

const EMPTY_FORM = {
  descricao: '',
  cor: 'Cru',
  corHex: '#F5EFE6',
  ordem: 'Ordem 6 (Médio - Tradicional)',
  pesoRolo: 600,
  marca: '',
  valor: '',
};

export default function YarnManager({ yarns, setYarns, products }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterOrdem, setFilterOrdem] = useState('TODAS');
  const [customOrdem, setCustomOrdem] = useState(false);

  // Calcula quanto de cada linha já foi utilizado nos produtos cadastrados
  const usedGramsByYarn = useMemo(() => {
    const map = {};
    products.forEach((prod) => {
      (prod.linhasUsadas || []).forEach((item) => {
        map[item.yarnId] = (map[item.yarnId] || 0) + (Number(item.pesoUsado) || 0);
      });
    });
    return map;
  }, [products]);

  const previewCostPerGram = useMemo(() => {
    const peso = Number(form.pesoRolo);
    const val = Number(form.valor);
    if (!peso || peso <= 0 || !val || val <= 0) return 0;
    return val / peso;
  }, [form.pesoRolo, form.valor]);

  function handleSelectPresetColor(preset) {
    setForm((prev) => ({
      ...prev,
      cor: preset.name,
      corHex: preset.hex,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.descricao.trim() || !form.cor.trim() || !form.marca.trim()) {
      alert('Preencha a descrição do tipo de linha, a cor e a marca.');
      return;
    }
    const pesoRolo = Number(form.pesoRolo);
    const valor = Number(form.valor);
    if (!pesoRolo || pesoRolo <= 0 || !valor || valor <= 0) {
      alert('Informe um peso do rolo (em gramas) e um valor maiores que zero.');
      return;
    }

    const payload = {
      id: editingId || `yarn-${Date.now()}`,
      descricao: form.descricao.trim(),
      cor: form.cor.trim(),
      corHex: form.corHex || '#C85A32',
      ordem: form.ordem.trim() || 'Ordem 6',
      pesoRolo,
      marca: form.marca.trim(),
      valor,
    };

    if (editingId) {
      setYarns((prev) => prev.map((y) => (y.id === editingId ? payload : y)));
      setEditingId(null);
    } else {
      setYarns((prev) => [payload, ...prev]);
    }

    setForm(EMPTY_FORM);
    setCustomOrdem(false);
  }

  function handleEdit(yarn) {
    setEditingId(yarn.id);
    const isPresetOrdem = ORDEM_OPTIONS.includes(yarn.ordem);
    setCustomOrdem(!isPresetOrdem);
    setForm({
      descricao: yarn.descricao,
      cor: yarn.cor,
      corHex: yarn.corHex || '#C85A32',
      ordem: yarn.ordem,
      pesoRolo: yarn.pesoRolo,
      marca: yarn.marca,
      valor: yarn.valor,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    const usedInProducts = products.filter((p) =>
      (p.linhasUsadas || []).some((u) => u.yarnId === id)
    );
    const msg =
      usedInProducts.length > 0
        ? `Esta linha está vinculada a ${usedInProducts.length} produto(s). Deseja excluir mesmo assim?`
        : 'Tem certeza que deseja excluir este rolo de linha?';
    if (window.confirm(msg)) {
      setYarns((prev) => prev.filter((y) => y.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    }
  }

  const filteredYarns = useMemo(() => {
    return yarns.filter((y) => {
      const matchesSearch =
        y.descricao.toLowerCase().includes(search.toLowerCase()) ||
        y.cor.toLowerCase().includes(search.toLowerCase()) ||
        y.marca.toLowerCase().includes(search.toLowerCase()) ||
        y.ordem.toLowerCase().includes(search.toLowerCase());
      const matchesOrdem = filterOrdem === 'TODAS' || y.ordem === filterOrdem;
      return matchesSearch && matchesOrdem;
    });
  }, [yarns, search, filterOrdem]);

  return (
    <div className="workspace-grid">
      {/* Formulário de Cadastro de Rolos de Linha */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Sparkles size={20} color="var(--primary)" />
              {editingId ? 'Editar Rolo de Linha' : 'Cadastrar Rolo de Linha'}
            </h2>
            <p className="panel-subtitle">
              Registre os rolos comprados para calcular o custo exato por grama.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              <X size={16} /> Cancelar
            </button>
          )}
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">
              <span>Descrição do Tipo de Linha *</span>
              <span className="field-hint">Ex: Barbante 85% Algodão, Fio Amigurumi</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Barbante 85% Algodão / Linha Mercerizada..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              required
            />
          </div>

          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Marca *</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Círculo, Euroroma, Barroco..."
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Ordem / Espessura *</span>
                <button
                  type="button"
                  onClick={() => setCustomOrdem(!customOrdem)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {customOrdem ? 'Escolher da lista' : 'Digitar outra'}
                </button>
              </label>
              {customOrdem ? (
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Ordem 6, TEX 590, Fio 4..."
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                  required
                />
              ) : (
                <select
                  className="select"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: e.target.value })}
                >
                  {ORDEM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Cor do Rolo */}
          <div className="field-group">
            <label className="field-label">
              <span>Cor da Linha *</span>
              <span className="field-hint">Clique em uma cor ou digite o nome/número</span>
            </label>
            <div className="color-picker-row">
              <input
                type="color"
                className="color-input-native"
                value={form.corHex}
                onChange={(e) => setForm({ ...form, corHex: e.target.value })}
                title="Escolher tom da cor"
              />
              <input
                type="text"
                className="input"
                placeholder="Ex: Cru, Rosa Bebê (Cor 3131), Verde Musgo..."
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                required
              />
            </div>
            <div className="swatch-list">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className={`swatch-btn ${
                    form.cor.toLowerCase() === preset.name.toLowerCase() ? 'selected' : ''
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                  onClick={() => handleSelectPresetColor(preset)}
                />
              ))}
            </div>
          </div>

          {/* Peso do Rolo e Valor */}
          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Peso do Rolo (gramas) *</span>
                <span className="field-hint">Ex: 600g, 1000g</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className="input"
                placeholder="Ex: 600"
                value={form.pesoRolo}
                onChange={(e) => setForm({ ...form, pesoRolo: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                {[125, 150, 200, 400, 600, 700, 1000].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="tag"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setForm({ ...form, pesoRolo: g })}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Valor Pago no Rolo (R$) *</span>
                <span className="field-hint">Preço de compra</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input"
                placeholder="Ex: 22.90"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Prévia de custo por grama */}
          <div className="calc-preview-box">
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Cálculo Automático de Custo da Linha
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                Cada <strong>100g</strong> desta linha custa{' '}
                <strong>{formatCurrency(previewCostPerGram * 100)}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                Valor por grama
              </span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>
                R$ {formatNumber(previewCostPerGram, 4)} / g
              </strong>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {editingId ? (
              <>
                <Check size={18} /> Salvar Alterações do Rolo
              </>
            ) : (
              <>
                <Plus size={18} /> Adicionar Rolo ao Estoque
              </>
            )}
          </button>
        </form>
      </div>

      {/* Lista de Rolos Cadastrados */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Layers size={20} color="var(--secondary)" />
              Rolos de Linha Cadastrados ({filteredYarns.length})
            </h2>
            <p className="panel-subtitle">
              Consulte o valor por grama, espessura (ordem), marca e uso em peças.
            </p>
          </div>
        </div>

        <div className="search-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: '210px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-light)',
              }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.2rem' }}
              placeholder="Buscar por tipo de linha, cor, marca ou ordem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            style={{ width: 'auto', minWidth: '190px' }}
            value={filterOrdem}
            onChange={(e) => setFilterOrdem(e.target.value)}
          >
            <option value="TODAS">Todas as Ordens / Espessuras</option>
            {Array.from(new Set(yarns.map((y) => y.ordem))).map((ord) => (
              <option key={ord} value={ord}>
                {ord}
              </option>
            ))}
          </select>
        </div>

        {filteredYarns.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum rolo de linha encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="items-grid">
            {filteredYarns.map((yarn) => {
              const costPerGram = getCostPerGram(yarn);
              const usedGrams = usedGramsByYarn[yarn.id] || 0;
              const remainingGrams = Math.max(0, Number(yarn.pesoRolo) - usedGrams);

              return (
                <div key={yarn.id} className="yarn-card">
                  <div className="yarn-card-top">
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div
                        className="yarn-color-dot"
                        style={{ backgroundColor: yarn.corHex || '#F5EFE6' }}
                        title={`Cor: ${yarn.cor}`}
                      />
                      <div>
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {yarn.descricao}
                        </h3>
                        <div
                          style={{
                            fontSize: '0.83rem',
                            color: 'var(--primary)',
                            fontWeight: 600,
                          }}
                        >
                          Cor: {yarn.cor}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEdit(yarn)}
                        title="Editar linha"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => handleDelete(yarn.id)}
                        title="Excluir linha"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="yarn-meta-badges">
                    <span className="tag brand-tag">
                      <Tag size={12} /> {yarn.marca}
                    </span>
                    <span className="tag order-tag">
                      <Layers size={12} /> {yarn.ordem}
                    </span>
                    <span className="tag">
                      <Scale size={12} /> Rolo de {yarn.pesoRolo}g
                    </span>
                  </div>

                  <div className="yarn-price-strip">
                    <div className="yarn-price-cell">
                      <span>Valor do Rolo</span>
                      <strong>{formatCurrency(yarn.valor)}</strong>
                    </div>
                    <div className="yarn-price-cell">
                      <span>Custo / 100g</span>
                      <strong>{formatCurrency(costPerGram * 100)}</strong>
                    </div>
                    <div className="yarn-price-cell">
                      <span>Custo / grama</span>
                      <strong style={{ color: 'var(--primary)' }}>
                        R$ {formatNumber(costPerGram, 4)}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '0.5rem',
                    }}
                  >
                    <span>Usado nas peças: <strong>{usedGrams}g</strong></span>
                    <span>
                      Saldo aprox. de 1 rolo: <strong>{remainingGrams}g</strong>
                    </span>
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
