'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  AlertTriangle,
  CheckCircle2,
  History,
  ShoppingBag,
  Palette,
  Trash2,
} from 'lucide-react';
import { calculateProductPricing, formatCurrency } from '../utils/calculations';

export default function StockManager({
  products,
  setProducts,
  stockHistory,
  setStockHistory,
  yarns,
  laborConfig,
  onNavigateToProducts,
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [selectedProductId, setSelectedProductId] = useState(
    products.length > 0 ? products[0].id : ''
  );
  const [movTipo, setMovTipo] = useState('ENTRADA');
  const [movQtd, setMovQtd] = useState(1);
  const [movObs, setMovObs] = useState('');

  const yarnsMap = useMemo(() => {
    const map = {};
    yarns.forEach((y) => {
      map[y.id] = y;
    });
    return map;
  }, [yarns]);

  const enrichedProducts = useMemo(() => {
    return products.map((p) => {
      const calc = calculateProductPricing(
        p,
        yarnsMap,
        laborConfig.valorHoraPadrao
      );
      const qtdEstoque = Math.max(0, Number(p.estoqueAtual) || 0);
      const estoqueMin = Math.max(0, Number(p.estoqueMinimo) || 0);
      const valorUnitario = calc.valorFinalSugerido;
      const valorTotalEstoque = qtdEstoque * valorUnitario;
      const custoTotalMaterialEstoque = qtdEstoque * calc.custoMaterialTotal;

      return {
        ...p,
        qtdEstoque,
        estoqueMin,
        valorUnitario,
        valorTotalEstoque,
        custoTotalMaterialEstoque,
        calc,
      };
    });
  }, [products, yarnsMap, laborConfig.valorHoraPadrao]);

  const stockStats = useMemo(() => {
    const totalUnidades = enrichedProducts.reduce((acc, p) => acc + p.qtdEstoque, 0);
    const valorTotalVenda = enrichedProducts.reduce(
      (acc, p) => acc + p.valorTotalEstoque,
      0
    );
    const custoTotalMaterial = enrichedProducts.reduce(
      (acc, p) => acc + p.custoTotalMaterialEstoque,
      0
    );
    const pecasEmFalta = enrichedProducts.filter((p) => p.qtdEstoque === 0).length;

    return {
      totalUnidades,
      valorTotalVenda,
      custoTotalMaterial,
      pecasEmFalta,
    };
  }, [enrichedProducts]);

  function registerMovement(product, tipo, quantidade, observacao) {
    const qtdNum = Math.max(1, Number(quantidade) || 1);
    const atual = Math.max(0, Number(product.estoqueAtual) || 0);
    const novoSaldo =
      tipo === 'ENTRADA' ? atual + qtdNum : Math.max(0, atual - qtdNum);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, estoqueAtual: novoSaldo } : p
      )
    );

    const record = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      produtoNome: product.nome,
      tipo, // 'ENTRADA' ou 'SAIDA'
      quantidade: qtdNum,
      saldoAnterior: atual,
      saldoNovo: novoSaldo,
      observacao: observacao || (tipo === 'ENTRADA' ? 'Produção concluída' : 'Venda pronta entrega'),
      data: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setStockHistory((prev) => [record, ...prev.slice(0, 49)]);
  }

  function handleQuickAdjust(prod, delta) {
    if (delta < 0 && (Number(prod.estoqueAtual) || 0) <= 0) return;
    const tipo = delta > 0 ? 'ENTRADA' : 'SAIDA';
    registerMovement(
      prod,
      tipo,
      Math.abs(delta),
      delta > 0 ? 'Entrada rápida (+1 peça produzida)' : 'Saída rápida (-1 peça vendida)'
    );
  }

  function handleDirectStockInput(productId, field, value) {
    const num = Math.max(0, Number(value) || 0);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: num } : p))
    );
  }

  function handleFormMovement(e) {
    e.preventDefault();
    const targetId = selectedProductId || (products[0] && products[0].id);
    const prod = products.find((p) => p.id === targetId);
    if (!prod) {
      alert('Selecione uma peça cadastrada.');
      return;
    }
    const qtd = Number(movQtd);
    if (!qtd || qtd <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    registerMovement(prod, movTipo, qtd, movObs.trim());
    setMovQtd(1);
    setMovObs('');
  }

  const filteredProducts = useMemo(() => {
    return enrichedProducts.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.nome.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        (p.cores || []).some((c) => c.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterStatus === 'PRONTA_ENTREGA') return p.qtdEstoque > 0;
      if (filterStatus === 'SEM_ESTOQUE') return p.qtdEstoque === 0;
      if (filterStatus === 'ESTOQUE_BAIXO')
        return p.estoqueMin > 0 && p.qtdEstoque <= p.estoqueMin;
      return true;
    });
  }, [enrichedProducts, search, filterStatus]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Resumo do Estoque de Pronta Entrega */}
      <div className="kpi-grid" style={{ marginBottom: 0 }}>
        <div className="kpi-card">
          <div className="kpi-icon sage">
            <Package size={20} />
          </div>
          <div>
            <div className="kpi-label">Peças Prontas</div>
            <div className="kpi-value">{stockStats.totalUnidades} un.</div>
            <div className="kpi-sub">Total em pronta entrega</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon terracotta">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="kpi-label">Valor em Estoque</div>
            <div className="kpi-value">{formatCurrency(stockStats.valorTotalVenda)}</div>
            <div className="kpi-sub">Preço de venda somado</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="kpi-label">Custo Material</div>
            <div className="kpi-value">{formatCurrency(stockStats.custoTotalMaterial)}</div>
            <div className="kpi-sub">Investido nas peças prontas</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon gold">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="kpi-label">Zeradas</div>
            <div className="kpi-value">{stockStats.pecasEmFalta}</div>
            <div className="kpi-sub">Apenas sob encomenda</div>
          </div>
        </div>
      </div>

      <div className="workspace-grid">
        {/* Coluna Esquerda: Registrar Entrada (Produção) ou Saída (Venda) */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <Package size={20} color="var(--primary)" />
                Movimentar Estoque de Produtos
              </h2>
              <p className="panel-subtitle">
                Registre novas peças que ficaram prontas ou dê baixa nas vendas a pronta entrega.
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="calc-preview-box">
              <span style={{ fontSize: '0.85rem' }}>
                Cadastre suas peças na aba <strong>2. Peças</strong> para controlar a quantidade delas em estoque.
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onNavigateToProducts}
              >
                Ir para Cadastro de Peças
              </button>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleFormMovement}>
              <div className="field-group">
                <label className="field-label">
                  <span>Tipo de Movimentação *</span>
                </label>
                <div className="form-row-2">
                  <button
                    type="button"
                    className={`btn ${
                      movTipo === 'ENTRADA' ? 'btn-secondary' : 'btn-outline'
                    }`}
                    onClick={() => setMovTipo('ENTRADA')}
                  >
                    <ArrowUpCircle size={18} /> + Entrada (Produzi)
                  </button>

                  <button
                    type="button"
                    className={`btn ${
                      movTipo === 'SAIDA' ? 'btn-primary' : 'btn-outline'
                    }`}
                    onClick={() => setMovTipo('SAIDA')}
                  >
                    <ArrowDownCircle size={18} /> - Saída (Vendi)
                  </button>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">
                  <span>Peça Confeccionada *</span>
                </label>
                <select
                  className="select"
                  value={selectedProductId || (products[0] && products[0].id) || ''}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  {enrichedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.tipo}) — Estoque atual: {p.qtdEstoque} un.
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="field-group">
                  <label className="field-label">
                    <span>Quantidade (unidades) *</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    className="input"
                    value={movQtd}
                    onChange={(e) => setMovQtd(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <span>Observação / Motivo</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder={
                      movTipo === 'ENTRADA'
                        ? 'Ex: Pronta entrega feira...'
                        : 'Ex: Vendido para cliente Ana...'
                    }
                    value={movObs}
                    onChange={(e) => setMovObs(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`btn ${
                  movTipo === 'ENTRADA' ? 'btn-secondary' : 'btn-primary'
                }`}
                style={{ width: '100%' }}
              >
                {movTipo === 'ENTRADA' ? (
                  <>
                    <Plus size={18} /> Adicionar ao Estoque de Pronta Entrega
                  </>
                ) : (
                  <>
                    <Minus size={18} /> Dar Baixa no Estoque
                  </>
                )}
              </button>
            </form>
          )}

          {/* Histórico Recente de Movimentações */}
          {stockHistory.length > 0 && (
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.15rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  <History size={16} color="var(--primary)" /> Últimas Movimentações
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (window.confirm('Deseja limpar o histórico de movimentações?')) {
                      setStockHistory([]);
                    }
                  }}
                >
                  <Trash2 size={14} /> Limpar
                </button>
              </div>

              <div className="product-yarns-mini-list" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {stockHistory.slice(0, 12).map((mov) => (
                  <div key={mov.id} className="product-yarn-mini-item">
                    <div>
                      <strong>{mov.produtoNome}</strong>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {mov.observacao} • {mov.data}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <strong
                        style={{
                          color: mov.tipo === 'ENTRADA' ? 'var(--secondary)' : 'var(--primary)',
                        }}
                      >
                        {mov.tipo === 'ENTRADA' ? `+${mov.quantidade}` : `-${mov.quantidade}`} un.
                      </strong>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Saldo: {mov.saldoNovo} un.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Lista de Produtos em Estoque com Botões Rápidos +1 / -1 */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <ShoppingBag size={20} color="var(--secondary)" />
                Estoque Atual por Peça ({filteredProducts.length})
              </h2>
              <p className="panel-subtitle">
                Use os botões <strong>+1</strong> e <strong>-1</strong> para ajustar rapidamente a quantidade pronta pelo celular.
              </p>
            </div>
          </div>

          <div className="search-bar">
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
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
                placeholder="Buscar peça no estoque..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="select"
              style={{ width: 'auto', minWidth: '175px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="TODOS">Todas as Peças</option>
              <option value="PRONTA_ENTREGA">✅ Com Pronta Entrega (&gt; 0)</option>
              <option value="SEM_ESTOQUE">⏳ Sem Estoque (0 un.)</option>
              <option value="ESTOQUE_BAIXO">⚠️ Estoque Mínimo Atingido</option>
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma peça encontrada com este filtro.</p>
            </div>
          ) : (
            <div className="labor-pieces-grid">
              {filteredProducts.map((prod) => {
                const isLowStock =
                  prod.estoqueMin > 0 && prod.qtdEstoque <= prod.estoqueMin;

                return (
                  <div key={prod.id} className="labor-piece-card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1.02rem', fontWeight: 700 }}>
                          {prod.nome}
                        </h3>
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.15rem',
                          }}
                        >
                          {prod.tipo} • Preço: <strong>{formatCurrency(prod.valorUnitario)}</strong>
                        </div>
                      </div>

                      <span
                        className="tag"
                        style={{
                          background:
                            prod.qtdEstoque > 0 ? 'var(--bg-sage-soft)' : '#FEF3C7',
                          color: prod.qtdEstoque > 0 ? 'var(--secondary)' : '#92400E',
                          borderColor: prod.qtdEstoque > 0 ? '#C6E0D4' : '#FDE68A',
                        }}
                      >
                        {prod.qtdEstoque > 0
                          ? `${prod.qtdEstoque} pronta(s)`
                          : 'Sob encomenda'}
                      </span>
                    </div>

                    <div className="color-chips-wrap" style={{ marginTop: '-0.2rem' }}>
                      {(prod.cores || []).map((cor) => (
                        <span key={cor} className="tag" style={{ background: '#FFF' }}>
                          <Palette size={11} color="var(--primary)" /> {cor}
                        </span>
                      ))}
                    </div>

                    {isLowStock && (
                      <div
                        style={{
                          fontSize: '0.76rem',
                          color: '#B45309',
                          background: '#FEF3C7',
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={14} /> Estoque atingiu o mínimo ({prod.estoqueMin} un.)
                      </div>
                    )}

                    {/* Controles Rápidos de Quantidade em Estoque */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 110px',
                        gap: '0.65rem',
                        alignItems: 'end',
                        background: '#FFF',
                        padding: '0.7rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '0.3rem',
                          }}
                        >
                          Quantidade Pronta Entrega
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleQuickAdjust(prod, -1)}
                            disabled={prod.qtdEstoque <= 0}
                            title="Diminuir 1 unidade"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            className="input"
                            style={{
                              textAlign: 'center',
                              fontWeight: 700,
                              padding: '0.4rem',
                              minHeight: '38px',
                            }}
                            value={prod.qtdEstoque}
                            onChange={(e) =>
                              handleDirectStockInput(
                                prod.id,
                                'estoqueAtual',
                                e.target.value
                              )
                            }
                          />

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleQuickAdjust(prod, 1)}
                            title="Adicionar 1 unidade pronta"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            display: 'block',
                            marginBottom: '0.3rem',
                          }}
                        >
                          Estoque Mín.
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          className="input"
                          style={{
                            textAlign: 'center',
                            padding: '0.4rem',
                            minHeight: '38px',
                          }}
                          value={prod.estoqueMin}
                          onChange={(e) =>
                            handleDirectStockInput(
                              prod.id,
                              'estoqueMinimo',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Valor total em estoque desta peça:</span>
                      <strong style={{ color: 'var(--primary)' }}>
                        {formatCurrency(prod.valorTotalEstoque)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
