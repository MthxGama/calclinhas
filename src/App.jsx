'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Layers,
  ShoppingBag,
  Package,
  Clock,
  FileText,
  Trash2,
  KeyRound,
  LogOut,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import YarnManager from './components/YarnManager';
import ProductManager from './components/ProductManager';
import StockManager from './components/StockManager';
import LaborCalculator from './components/LaborCalculator';
import QuoteManager from './components/QuoteManager';
import {
  useAuth,
  LoginScreen,
  ChangePasswordModal,
} from './components/AuthGate';
import {
  INITIAL_YARNS,
  INITIAL_PRODUCTS,
  INITIAL_LABOR_CONFIG,
} from './data/initialData';
import { calculateProductPricing, formatCurrency } from './utils/calculations';
import {
  fetchAllUserData,
  syncTableCollection,
  syncLaborSettings,
  mapYarnToDb,
  mapProductToDb,
  mapQuoteToDb,
  mapStockHistoryToDb,
} from './lib/dbSync';

const STORAGE_KEYS = {
  YARNS: 'calclinhas_yarns_v2',
  PRODUCTS: 'calclinhas_products_v2',
  LABOR: 'calclinhas_labor_v2',
  QUOTES: 'calclinhas_quotes_v2',
  STOCK_HISTORY: 'calclinhas_stock_history_v2',
};

export default function App() {
  const {
    user,
    isAuthenticated,
    isCheckingAuth,
    login,
    logout,
    updateCredentials,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('yarns');
  const [yarns, setYarns] = useState(INITIAL_YARNS);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [laborConfig, setLaborConfig] = useState(INITIAL_LABOR_CONFIG);
  const [quotes, setQuotes] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const skipNextSyncRef = useRef(true);

  // Carrega os dados do Supabase assim que a usuária faz login (e migra dados locais se o banco estiver vazio)
  useEffect(() => {
    if (!user?.id) {
      setIsCloudReady(false);
      return;
    }

    let active = true;

    async function loadFromCloud() {
      setIsSyncing(true);
      try {
        const cloudData = await fetchAllUserData(user.id);
        if (!active) return;

        // Verifica se o banco na nuvem ainda está vazio mas há registros locais neste navegador para migrar
        const isCloudEmpty =
          cloudData.yarns.length === 0 &&
          cloudData.products.length === 0 &&
          cloudData.quotes.length === 0;

        if (isCloudEmpty) {
          const localYarns = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.YARNS) || '[]'
          );
          const localProducts = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'
          );
          const localQuotes = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.QUOTES) || '[]'
          );
          const localHistory = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.STOCK_HISTORY) || '[]'
          );
          const localLabor = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.LABOR) || 'null'
          );

          const hasLocalData =
            localYarns.length > 0 ||
            localProducts.length > 0 ||
            localQuotes.length > 0;

          if (hasLocalData) {
            skipNextSyncRef.current = true;
            setYarns(localYarns);
            setProducts(localProducts);
            setQuotes(localQuotes);
            setStockHistory(localHistory);
            if (localLabor) setLaborConfig(localLabor);

            await Promise.all([
              syncTableCollection('yarns', user.id, localYarns, mapYarnToDb),
              syncTableCollection(
                'products',
                user.id,
                localProducts,
                mapProductToDb
              ),
              syncTableCollection('quotes', user.id, localQuotes, mapQuoteToDb),
              syncTableCollection(
                'stock_history',
                user.id,
                localHistory,
                mapStockHistoryToDb
              ),
              syncLaborSettings(user.id, localLabor || INITIAL_LABOR_CONFIG),
            ]);

            setIsCloudReady(true);
            setTimeout(() => {
              skipNextSyncRef.current = false;
            }, 200);
            return;
          }
        }

        skipNextSyncRef.current = true;
        setYarns(cloudData.yarns);
        setProducts(cloudData.products);
        setQuotes(cloudData.quotes);
        setStockHistory(cloudData.stockHistory);
        setLaborConfig(cloudData.laborConfig);
        setIsCloudReady(true);
        setTimeout(() => {
          skipNextSyncRef.current = false;
        }, 200);
      } catch (e) {
        console.error('Erro ao carregar dados do Supabase:', e);
      } finally {
        if (active) setIsSyncing(false);
      }
    }

    loadFromCloud();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Sincroniza Rolos de Linha com Supabase + Cache Local
  useEffect(() => {
    if (!isCloudReady || !user?.id || skipNextSyncRef.current) return;
    localStorage.setItem(STORAGE_KEYS.YARNS, JSON.stringify(yarns));
    setIsSyncing(true);
    syncTableCollection('yarns', user.id, yarns, mapYarnToDb).finally(() =>
      setIsSyncing(false)
    );
  }, [yarns, isCloudReady, user?.id]);

  // Sincroniza Peças e Estoque com Supabase + Cache Local
  useEffect(() => {
    if (!isCloudReady || !user?.id || skipNextSyncRef.current) return;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    setIsSyncing(true);
    syncTableCollection('products', user.id, products, mapProductToDb).finally(
      () => setIsSyncing(false)
    );
  }, [products, isCloudReady, user?.id]);

  // Sincroniza Valor da Hora com Supabase + Cache Local
  useEffect(() => {
    if (!isCloudReady || !user?.id || skipNextSyncRef.current) return;
    localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(laborConfig));
    setIsSyncing(true);
    syncLaborSettings(user.id, laborConfig).finally(() => setIsSyncing(false));
  }, [laborConfig, isCloudReady, user?.id]);

  // Sincroniza Orçamentos com Supabase + Cache Local
  useEffect(() => {
    if (!isCloudReady || !user?.id || skipNextSyncRef.current) return;
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(quotes));
    setIsSyncing(true);
    syncTableCollection('quotes', user.id, quotes, mapQuoteToDb).finally(() =>
      setIsSyncing(false)
    );
  }, [quotes, isCloudReady, user?.id]);

  // Sincroniza Histórico de Estoque com Supabase + Cache Local
  useEffect(() => {
    if (!isCloudReady || !user?.id || skipNextSyncRef.current) return;
    localStorage.setItem(
      STORAGE_KEYS.STOCK_HISTORY,
      JSON.stringify(stockHistory)
    );
    setIsSyncing(true);
    syncTableCollection(
      'stock_history',
      user.id,
      stockHistory,
      mapStockHistoryToDb
    ).finally(() => setIsSyncing(false));
  }, [stockHistory, isCloudReady, user?.id]);

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

    const totalStockUnits = products.reduce(
      (acc, p) => acc + Math.max(0, Number(p.estoqueAtual) || 0),
      0
    );

    return {
      totalYarnsValue,
      totalYarnsWeight,
      totalCatalogSaleValue,
      totalStockUnits,
    };
  }, [yarns, products, laborConfig.valorHoraPadrao]);

  function handleClearAll() {
    if (
      window.confirm(
        'Tem certeza que deseja zerar todos os cadastros do sistema (inclusive no banco de dados)?'
      )
    ) {
      setYarns([]);
      setProducts([]);
      setQuotes([]);
      setStockHistory([]);
      setLaborConfig(INITIAL_LABOR_CONFIG);
      localStorage.removeItem(STORAGE_KEYS.YARNS);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LABOR);
      localStorage.removeItem(STORAGE_KEYS.QUOTES);
      localStorage.removeItem(STORAGE_KEYS.STOCK_HISTORY);
    }
  }

  if (isCheckingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div className="brand-title">Atelier da Adri</div>
                <span
                  className="tag"
                  style={{
                    fontSize: '0.68rem',
                    padding: '0.12rem 0.45rem',
                    background: 'var(--bg-sage-soft)',
                    color: 'var(--secondary)',
                    borderColor: '#C6E0D4',
                  }}
                  title="Banco de dados Supabase conectado"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={11} /> Salvando...
                    </>
                  ) : (
                    <>
                      <Cloud size={11} /> Nuvem OK
                    </>
                  )}
                </span>
              </div>
              <div className="brand-subtitle">
                Gestão de Linhas, Peças, Estoque, Horas e Orçamentos
              </div>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Módulos do Sistema">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'yarns' ? 'active' : ''}`}
              onClick={() => setActiveTab('yarns')}
            >
              <Layers size={16} />
              1. Linhas
              <span className="badge-count">{yarns.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <ShoppingBag size={16} />
              2. Peças
              <span className="badge-count">{products.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'stock' ? 'active' : ''}`}
              onClick={() => setActiveTab('stock')}
            >
              <Package size={16} />
              3. Estoque
              <span className="badge-count">{stats.totalStockUnits}</span>
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'labor' ? 'active' : ''}`}
              onClick={() => setActiveTab('labor')}
            >
              <Clock size={16} />
              4. Valor da Hora
            </button>

            <button
              type="button"
              className={`nav-tab ${activeTab === 'quotes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quotes')}
            >
              <FileText size={16} />
              5. Orçamentos
              <span className="badge-count">{quotes.length}</span>
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="hourly-pill"
              onClick={() => setActiveTab('labor')}
              title="Clique para ajustar quanto vale a sua hora"
            >
              <Clock size={14} />
              Hora: {formatCurrency(laborConfig.valorHoraPadrao)}/h
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPasswordModal(true)}
              title="Alterar Senha"
            >
              <KeyRound size={16} />
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

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={logout}
              title="Sair / Bloquear acesso"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Modal para Alterar Senha no Supabase */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSaveCredentials={updateCredentials}
        />
      )}

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
            onClick={() => setActiveTab('stock')}
            style={{ cursor: 'pointer' }}
          >
            <div className="kpi-icon sage">
              <Package size={20} />
            </div>
            <div>
              <div className="kpi-label">Em Estoque</div>
              <div className="kpi-value">{stats.totalStockUnits} un.</div>
              <div className="kpi-sub">Pronta entrega</div>
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

        {activeTab === 'stock' && (
          <StockManager
            products={products}
            setProducts={setProducts}
            stockHistory={stockHistory}
            setStockHistory={setStockHistory}
            yarns={yarns}
            laborConfig={laborConfig}
            onNavigateToProducts={() => setActiveTab('products')}
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
            setProducts={setProducts}
            setStockHistory={setStockHistory}
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
          <Layers size={18} />
          <span>Linhas</span>
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
          <ShoppingBag size={18} />
          <span>Peças</span>
          {products.length > 0 && (
            <span className="mobile-nav-badge">{products.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('stock');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Package size={18} />
          <span>Estoque</span>
          {stats.totalStockUnits > 0 && (
            <span className="mobile-nav-badge">{stats.totalStockUnits}</span>
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
          <Clock size={18} />
          <span>Hora</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'quotes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quotes');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <FileText size={18} />
          <span>Orçar</span>
          {quotes.length > 0 && (
            <span className="mobile-nav-badge">{quotes.length}</span>
          )}
        </button>
      </nav>
    </div>
  );
}
