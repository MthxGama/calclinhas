'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  ShoppingBag,
  Clock,
  DollarSign,
  Trash2,
} from 'lucide-react';
import YarnManager from './components/YarnManager';
import ProductManager from './components/ProductManager';
import LaborCalculator from './components/LaborCalculator';
import {
  INITIAL_YARNS,
  INITIAL_PRODUCTS,
  INITIAL_LABOR_CONFIG,
} from './data/initialData';
import { calculateProductPricing, formatCurrency } from './utils/calculations';

const STORAGE_KEYS = {
  YARNS: 'calclinhas_yarns_v2',
  PRODUCTS: 'calclinhas_products_v2',
  LABOR: 'calclinhas_labor_v2',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('yarns');
  const [yarns, setYarns] = useState(INITIAL_YARNS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [laborConfig, setLaborConfig] = useState(INITIAL_LABOR_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega os dados salvos no navegador após montar no cliente (evita erro de hidratação no Next.js)
  useEffect(() => {
    try {
      // Remove chaves antigas de demonstração caso existam
      localStorage.removeItem('calclinhas_yarns_v1');
      localStorage.removeItem('calclinhas_products_v1');
      localStorage.removeItem('calclinhas_labor_v1');

      const savedYarns = localStorage.getItem(STORAGE_KEYS.YARNS);
      if (savedYarns) setYarns(JSON.parse(savedYarns));

      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedLabor = localStorage.getItem(STORAGE_KEYS.LABOR);
      if (savedLabor) setLaborConfig(JSON.parse(savedLabor));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.YARNS, JSON.stringify(yarns));
    } catch (e) {
      console.error(e);
    }
  }, [yarns, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error(e);
    }
  }, [products, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(laborConfig));
    } catch (e) {
      console.error(e);
    }
  }, [laborConfig, isLoaded]);

  // Indicadores Gerais
  const stats = useMemo(() => {
    const totalYarnsValue = yarns.reduce((acc, y) => acc + (Number(y.valor) || 0), 0);
    const totalYarnsWeight = yarns.reduce((acc, y) => acc + (Number(y.pesoRolo) || 0), 0);

    const yarnsMap = {};
    yarns.forEach((y) => {
      yarnsMap[y.id] = y;
    });

    const totalCatalogSaleValue = products.reduce((acc, p) => {
      const calc = calculateProductPricing(p, yarnsMap, laborConfig.valorHoraPadrao);
      return acc + calc.valorFinalSugerido;
    }, 0);

    return {
      totalYarnsValue,
      totalYarnsWeight,
      totalCatalogSaleValue,
    };
  }, [yarns, products, laborConfig.valorHoraPadrao]);

  function handleClearAll() {
    if (
      window.confirm(
        'Tem certeza que deseja zerar todos os cadastros do sistema?'
      )
    ) {
      setYarns([]);
      setProducts([]);
      setLaborConfig(INITIAL_LABOR_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.YARNS);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LABOR);
    }
  }

  return (
    <div className="app-shell">
      {/* Cabeçalho Principal */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="brand-title">Ateliê CalcLinhas Crochê</div>
              <div className="brand-subtitle">
                Gestão de Rolos de Linha, Produtos e Cálculo de Valor Final
              </div>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Módulos do Sistema">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'yarns' ? 'active' : ''}`}
              onClick={() => setActiveTab('yarns')}
            >
              <Layers size={17} />
              1. Rolos de Linha
              <span className="badge-count">{yarns.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <ShoppingBag size={17} />
              2. Produtos & Precificação
              <span className="badge-count">{products.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'labor' ? 'active' : ''}`}
              onClick={() => setActiveTab('labor')}
            >
              <Clock size={17} />
              3. Horas & Valor da Hora
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="hourly-pill"
              onClick={() => setActiveTab('labor')}
              title="Clique para ajustar quanto vale a sua hora"
            >
              <Clock size={15} />
              Hora atual: {formatCurrency(laborConfig.valorHoraPadrao)}/h
            </button>

            {(yarns.length > 0 || products.length > 0) && (
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={handleClearAll}
                title="Zerar todos os dados"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="main-container">
        {/* Resumo Rápido no Topo */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon terracotta">
              <Layers size={22} />
            </div>
            <div>
              <div className="kpi-label">Rolos Cadastrados</div>
              <div className="kpi-value">{yarns.length} rolos</div>
              <div className="kpi-sub">Total: {stats.totalYarnsWeight}g em catálogo</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon gold">
              <DollarSign size={22} />
            </div>
            <div>
              <div className="kpi-label">Soma dos Rolos</div>
              <div className="kpi-value">{formatCurrency(stats.totalYarnsValue)}</div>
              <div className="kpi-sub">Base para o cálculo por grama</div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon purple">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="kpi-label">Peças Confeccionadas</div>
              <div className="kpi-value">{products.length} peça(s)</div>
              <div className="kpi-sub">
                Valor somado: {formatCurrency(stats.totalCatalogSaleValue)}
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon sage">
              <Clock size={22} />
            </div>
            <div>
              <div className="kpi-label">Valor da Mão de Obra</div>
              <div className="kpi-value">
                {formatCurrency(laborConfig.valorHoraPadrao)}/h
              </div>
              <div className="kpi-sub">Configurável no módulo 3</div>
            </div>
          </div>
        </section>

        {/* Renderização do Módulo Ativo */}
        {activeTab === 'yarns' && (
          <YarnManager
            yarns={yarns}
            setYarns={setYarns}
            products={products}
          />
        )}

        {activeTab === 'products' && (
          <ProductManager
            products={products}
            setProducts={setProducts}
            yarns={yarns}
            laborConfig={laborConfig}
            onNavigateToYarns={() => setActiveTab('yarns')}
            onNavigateToLabor={() => setActiveTab('labor')}
          />
        )}

        {activeTab === 'labor' && (
          <LaborCalculator
            laborConfig={laborConfig}
            setLaborConfig={setLaborConfig}
            products={products}
            setProducts={setProducts}
            yarns={yarns}
          />
        )}
      </main>
    </div>
  );
}
