'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Award,
} from 'lucide-react';
import { calculateProductPricing, formatCurrency, formatNumber } from '../utils/calculations';

export default function LaborCalculator({
  laborConfig,
  setLaborConfig,
  products,
  setProducts,
  yarns,
}) {
  const yarnsMap = useMemo(() => {
    const map = {};
    yarns.forEach((y) => {
      map[y.id] = y;
    });
    return map;
  }, [yarns]);

  const [selectedProductId, setSelectedProductId] = useState(
    products.length > 0 ? products[0].id : 'AVULSO'
  );
  const [simHoras, setSimHoras] = useState(4);
  const [simMinutos, setSimMinutos] = useState(30);
  const [simValorHora, setSimValorHora] = useState(laborConfig.valorHoraPadrao || 15);
  const [simCustoMaterialAvulso, setSimCustoMaterialAvulso] = useState(18.5);
  const [simMargem, setSimMargem] = useState(laborConfig.margemLucroPadrao || 0);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Cálculo de sugestão de valor da hora baseado na meta mensal
  const horasMensais = useMemo(() => {
    const dias = Number(laborConfig.diasPorSemana) || 0;
    const horasDia = Number(laborConfig.horasPorDia) || 0;
    return dias * horasDia * 4.33;
  }, [laborConfig.diasPorSemana, laborConfig.horasPorDia]);

  const valorHoraSugeridoMeta = useMemo(() => {
    if (!horasMensais || horasMensais <= 0) return 0;
    return (Number(laborConfig.metaMensal) || 0) / horasMensais;
  }, [laborConfig.metaMensal, horasMensais]);

  const selectedProduct = useMemo(() => {
    if (selectedProductId === 'AVULSO') return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  const selectedProductCalc = useMemo(() => {
    if (!selectedProduct) return null;
    return calculateProductPricing(
      selectedProduct,
      yarnsMap,
      laborConfig.valorHoraPadrao
    );
  }, [selectedProduct, yarnsMap, laborConfig.valorHoraPadrao]);

  const totalHorasSimuladas = (Number(simHoras) || 0) + (Number(simMinutos) || 0) / 60;
  const custoMaterialBase = selectedProductCalc
    ? selectedProductCalc.custoMaterialTotal
    : Number(simCustoMaterialAvulso) || 0;
  const custoMaoDeObraSimulado = totalHorasSimuladas * (Number(simValorHora) || 0);
  const valorPecaSemMargem = custoMaterialBase + custoMaoDeObraSimulado;
  const valorLucroSimulado = valorPecaSemMargem * ((Number(simMargem) || 0) / 100);
  const valorFinalDeterminado = valorPecaSemMargem + valorLucroSimulado;

  function handleSelectProductForSim(id) {
    setSelectedProductId(id);
    if (id !== 'AVULSO') {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        const h = Math.floor(Number(prod.horasGastas) || 0);
        const m = Math.round(((Number(prod.horasGastas) || 0) - h) * 60);
        setSimHoras(h);
        setSimMinutos(m);
        setSimValorHora(prod.valorHora ?? laborConfig.valorHoraPadrao);
        setSimMargem(prod.margemLucro ?? 0);
      }
    }
  }

  function handleApplySimToProduct() {
    if (!selectedProduct) return;
    const horasDecimais = Number(totalHorasSimuladas.toFixed(2));
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              horasGastas: horasDecimais,
              valorHora: Number(simValorHora) || 0,
              margemLucro: Number(simMargem) || 0,
            }
          : p
      )
    );
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  }

  function handleApplySuggestedHourlyRate() {
    const rounded = Number(valorHoraSugeridoMeta.toFixed(2));
    setLaborConfig((prev) => ({
      ...prev,
      valorHoraPadrao: rounded,
    }));
    setSimValorHora(rounded);
  }

  function handleUpdateAllProductsHourlyRate() {
    const rate = Number(laborConfig.valorHoraPadrao) || 0;
    if (
      window.confirm(
        `Deseja atualizar o valor da hora de todas as ${products.length} peças cadastradas para ${formatCurrency(rate)}/hora?`
      )
    ) {
      setProducts((prev) => prev.map((p) => ({ ...p, valorHora: rate })));
    }
  }

  function handleInlineProductChange(productId, field, value) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              [field]: Number(value) || 0,
            }
          : p
      )
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="workspace-grid">
        {/* Card 1: Definir Quanto Vale a Hora da Crocheteira */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <Award size={20} color="var(--primary)" />
                1. Quanto Vale a Sua Hora
              </h2>
              <p className="panel-subtitle">
                Defina o valor da sua hora diretamente ou descubra com base na sua meta mensal.
              </p>
            </div>
          </div>

          <div className="form-stack">
            <div
              style={{
                background: 'var(--bg-accent-soft)',
                border: '1px solid #F3C6B6',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
              }}
            >
              <label className="field-label" style={{ marginBottom: '0.4rem' }}>
                <span>Valor da Sua Hora de Trabalho (R$/hora)</span>
              </label>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  className="input"
                  style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1, minWidth: '130px' }}
                  value={laborConfig.valorHoraPadrao}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLaborConfig({ ...laborConfig, valorHoraPadrao: val });
                    setSimValorHora(val);
                  }}
                />
                {products.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleUpdateAllProductsHourlyRate}
                    title="Aplicar este valor da hora em todas as peças já cadastradas"
                  >
                    <RefreshCw size={15} /> Aplicar nas Peças
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1rem',
              }}
            >
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Não sabe quanto cobrar por hora? Calcule aqui:
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Informe quanto deseja ganhar por mês com o crochê e sua rotina:
              </p>

              <div className="form-stack">
                <div className="field-group">
                  <label className="field-label">
                    <span>Meta de Ganho Mensal (Salário Desejado em R$)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="50"
                    className="input"
                    placeholder="Ex: 2400"
                    value={laborConfig.metaMensal}
                    onChange={(e) =>
                      setLaborConfig({ ...laborConfig, metaMensal: e.target.value })
                    }
                  />
                </div>

                <div className="form-row-2">
                  <div className="field-group">
                    <label className="field-label">
                      <span>Dias por Semana</span>
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="7"
                      className="input"
                      value={laborConfig.diasPorSemana}
                      onChange={(e) =>
                        setLaborConfig({ ...laborConfig, diasPorSemana: e.target.value })
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">
                      <span>Horas por Dia</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max="16"
                      step="0.5"
                      className="input"
                      value={laborConfig.horasPorDia}
                      onChange={(e) =>
                        setLaborConfig({ ...laborConfig, horasPorDia: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="calc-preview-box sage">
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Total de <strong>{formatNumber(horasMensais, 0)} horas/mês</strong> dedicadas
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      Sua hora vale: {formatCurrency(valorHoraSugeridoMeta)} / h
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleApplySuggestedHourlyRate}
                  >
                    Usar este valor
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Determinar Valor Final da Peça (Horas Gastas + Valor da Hora + Linhas) */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <Clock size={20} color="var(--secondary)" />
                2. Horas Gastas & Valor Final da Peça
              </h2>
              <p className="panel-subtitle">
                Escolha uma peça cadastrada (ou simule uma nova) informando as horas gastas.
              </p>
            </div>
          </div>

          <div className="form-stack">
            <div className="field-group">
              <label className="field-label">
                <span>Selecionar Peça para Calcular</span>
              </label>
              <select
                className="select"
                value={selectedProductId}
                onChange={(e) => handleSelectProductForSim(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    Peça: {p.nome} ({p.tipo} - {p.pesoTotal}g)
                  </option>
                ))}
                <option value="AVULSO">
                  ✨ Simular Peça Avulsa (informar custo de material manualmente)
                </option>
              </select>
            </div>

            {selectedProductCalc ? (
              <div className="calc-preview-box">
                <div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block' }}>
                    Custo das linhas usadas nesta peça ({selectedProductCalc.pesoTotalLinhas}g)
                  </span>
                  <strong style={{ fontSize: '1rem' }}>
                    {formatCurrency(selectedProductCalc.custoMaterialTotal)}
                  </strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Cores: {(selectedProduct.cores || []).join(', ')}
                </div>
              </div>
            ) : (
              <div className="field-group">
                <label className="field-label">
                  <span>Custo de Linhas / Material da Peça Avulsa (R$)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  className="input"
                  value={simCustoMaterialAvulso}
                  onChange={(e) => setSimCustoMaterialAvulso(e.target.value)}
                />
              </div>
            )}

            <div className="form-row-2">
              <div className="field-group">
                <label className="field-label">
                  <span>Horas Gastas</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  className="input"
                  value={simHoras}
                  onChange={(e) => setSimHoras(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  <span>Minutos Extras (0 a 59)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  step="5"
                  className="input"
                  value={simMinutos}
                  onChange={(e) => setSimMinutos(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="field-group">
                <label className="field-label">
                  <span>Quanto Vale Sua Hora (R$/h)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.50"
                  className="input"
                  value={simValorHora}
                  onChange={(e) => setSimValorHora(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  <span>Margem de Lucro Extra (%)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="5"
                  className="input"
                  value={simMargem}
                  onChange={(e) => setSimMargem(e.target.value)}
                />
              </div>
            </div>

            {/* Resultado Final do Módulo de Horas */}
            <div className="pricing-receipt">
              <div className="receipt-row">
                <span>1. Custo das Linhas e Materiais:</span>
                <strong>{formatCurrency(custoMaterialBase)}</strong>
              </div>
              <div className="receipt-row">
                <span>
                  2. Mão de Obra ({simHoras}h {simMinutos > 0 ? `${simMinutos}m` : ''} ×{' '}
                  {formatCurrency(simValorHora)}/h):
                </span>
                <strong>{formatCurrency(custoMaoDeObraSimulado)}</strong>
              </div>
              <div className="receipt-divider" />
              <div className="receipt-row">
                <span>
                  <strong>Valor Base (Material + Horas):</strong>
                </span>
                <strong style={{ color: 'var(--secondary)', fontSize: '1.05rem' }}>
                  {formatCurrency(valorPecaSemMargem)}
                </strong>
              </div>
              {Number(simMargem) > 0 && (
                <div className="receipt-row">
                  <span>3. Margem Adicional ({simMargem}%):</span>
                  <strong>+ {formatCurrency(valorLucroSimulado)}</strong>
                </div>
              )}

              <div className="receipt-total">
                <div>
                  <div className="total-label">VALOR FINAL DETERMINADO</div>
                  <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                    Equivale a {formatNumber(totalHorasSimuladas, 2)}h de trabalho artesanal
                  </div>
                </div>
                <div className="total-amount">{formatCurrency(valorFinalDeterminado)}</div>
              </div>
            </div>

            {selectedProduct && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplySimToProduct}
              >
                <CheckCircle2 size={18} />
                {savedFeedback
                  ? 'Horas e Valor Salvos na Peça!'
                  : `Salvar Horas e Valor em "${selectedProduct.nome}"`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cards Interativos Mobile-First de Horas e Precificação Final por Peça */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <TrendingUp size={20} color="var(--primary)" />
              Ajuste Rápido de Horas e Valor por Peça
            </h2>
            <p className="panel-subtitle">
              Altere as horas gastas ou o valor da hora abaixo para recalcular o preço final de cada peça na hora.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">Nenhuma peça cadastrada ainda.</div>
        ) : (
          <div className="labor-pieces-grid">
            {products.map((prod) => {
              const calc = calculateProductPricing(
                prod,
                yarnsMap,
                laborConfig.valorHoraPadrao
              );
              return (
                <div key={prod.id} className="labor-piece-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{prod.nome}</strong>
                      <span className="tag">{prod.pesoTotal}g</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {prod.tipo} • Cores: {(prod.cores || []).join(', ')}
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="field-group">
                      <label className="field-label" style={{ fontSize: '0.76rem' }}>
                        <span>Horas Gastas</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.25"
                        className="input"
                        value={prod.horasGastas}
                        onChange={(e) =>
                          handleInlineProductChange(prod.id, 'horasGastas', e.target.value)
                        }
                      />
                    </div>

                    <div className="field-group">
                      <label className="field-label" style={{ fontSize: '0.76rem' }}>
                        <span>Valor Hora (R$)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.50"
                        className="input"
                        value={prod.valorHora}
                        onChange={(e) =>
                          handleInlineProductChange(prod.id, 'valorHora', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="product-breakdown-grid">
                    <div className="breakdown-item">
                      <span>Linhas</span>
                      <strong>{formatCurrency(calc.custoMaterialTotal)}</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>Mão de Obra</span>
                      <strong>{formatCurrency(calc.custoMaoDeObra)}</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>Valor Final</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.08rem' }}>
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
