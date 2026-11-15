'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Layers,
  ShoppingBag,
  Clock,
  FileText,
  Trash2,
} from 'lucide-react';
import YarnManager from './components/YarnManager';
import ProductManager from './components/ProductManager';
import LaborCalculator from './components/LaborCalculator';
import QuoteManager from './components/QuoteManager';
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
  QUOTES: 'calclinhas_quotes_v2',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('yarns');
  const [yarns, setYarns] = useState(INITIAL_YARNS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [laborConfig, setLaborConfig] = useState(INITIAL_LABOR_CONFIG);
  const [quotes, setQuotes] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega os dados salvos no navegador após montar no cliente (evita erro de hidratação no Next.js)
  useEffect(() => {
    try {
      localStorage.removeItem('calclinhas_yarns_v1');
      localStorage.removeItem('calclinhas_products_v1');
      localStorage.removeItem('calclinhas_labor_v1');

      const savedYarns = localStorage.getItem(STORAGE_KEYS.YARNS);
      if (savedYarns) setYarns(JSON.parse(savedYarns));

      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (savedProducts) setProducts(JSON.parse(savedProducts));

      const savedLabor = localStorage.getItem(STORAGE_KEYS.LABOR);
      if (savedLabor) setLaborConfig(JSON.parse(savedLabor));

      const savedQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
      if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
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

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
    } catch (e) {
      console.error(e);
    }
  }, [quotes, isLoaded]);

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
      setQuotes([]);
      setLaborConfig(INITIAL_LABOR_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.YARNS);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LABOR);
      localStorage.removeItem(STORAGE_KEYS.QUOTES);
    }
  }

  return (
    <div className="app-shell">
      {/* Cabeçalho Principal */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="brand-title">Ateliê CalcLinhas</div>
              <div className="brand-subtitle">
                Gestão de Linhas, Peças, Horas e Orçamentos para Clientes
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
              2. Peças & Preço
              <span className="badge-count">{products.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'labor' ? 'active' : ''}`}
              onClick={() => setActiveTab('labor')}
            >
              <Clock size={17} />
              3. Valor da Hora
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'quotes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quotes')}
            >
              <FileText size={17} />
              4. Orçamentos
              <span className="badge-count">{quotes.length}</span>
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              className="hourly-pill"
              onClick={() => setActiveTab('labor')}
              title="Clique para ajustar quanto vale a sua hora"
            >
              <Clock size={14} />
              Hora: {formatCurrency(laborConfig.valorHoraPadrao)}/h
            </button>

            {(yarns.length > 0 || products.length > 0 || quotes.length > 0) && (
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
          <div
            className="kpi-card"
            onClick={() => setActiveTab('yarns')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon terracotta">
              <Layers size={20} />
            </div>
            <div>
              <div className="kpi-label">Rolos</div>
              <div className="kpi-value">{yarns.length}</div>
              <div className="kpi-sub">Total: {stats.totalYarnsWeight}g</div>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setActiveTab('products')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon purple">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="kpi-label">Peças</div>
              <div className="kpi-value">{products.length}</div>
              <div className="kpi-sub">
                Catálogo: {formatCurrency(stats.totalCatalogSaleValue)}
              </div>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setActiveTab('labor')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon sage">
              <Clock size={20} />
            </div>
            <div>
              <div className="kpi-label">Sua Hora</div>
              <div className="kpi-value">
                {formatCurrency(laborConfig.valorHoraPadrao)}/h
              </div>
              <div className="kpi-sub">Mão de obra</div>
            </div>
          </div>

          <div
            className="kpi-card"
            onClick={() => setActiveTab('quotes')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon gold">
              <FileText size={20} />
            </div>
            <div>
              <div className="kpi-label">Orçamentos</div>
              <div className="kpi-value">{quotes.length}</div>
              <div className="kpi-sub">Enviar no WhatsApp</div>
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

        {activeTab === 'quotes' && (
          <QuoteManager
            quotes={quotes}
            setQuotes={setQuotes}
            products={products}
            yarns={yarns}
            laborConfig={laborConfig}
            onNavigateToProducts={() => setActiveTab('products')}
          />
        )}
      </main>

      {/* Barra de Navegação Inferior Fixa para Celular */}
      <nav className="mobile-bottom-nav" aria-label="Navegação Mobile">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'yarns' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('yarns');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Layers size={19} />
          <span>1. Linhas</span>
          {yarns.length > 0 && (
            <span className="mobile-nav-badge">{yarns.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('products');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <ShoppingBag size={19} />
          <span>2. Peças</span>
          {products.length > 0 && (
            <span className="mobile-nav-badge">{products.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'labor' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('labor');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Clock size={19} />
          <span>3. Hora</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'quotes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quotes');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <FileText size={19} />
          <span>4. Orçamentos</span>
          {quotes.length > 0 && (
            <span className="mobile-nav-badge">{quotes.length}</span>
          )}
        </button>
      </nav>
    </div>
  );
}
