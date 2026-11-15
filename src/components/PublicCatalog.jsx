'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Search,
  ShoppingBag,
  MessageCircle,
  Palette,
  Scale,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { fetchPublicCatalogData } from '../lib/dbSync';
import { calculateProductPricing, formatCurrency } from '../utils/calculations';

function getCleanWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

export default function PublicCatalog({ onOpenAdmin }) {
  const [products, setProducts] = useState([]);
  const [yarns, setYarns] = useState([]);
  const [atelierConfig, setAtelierConfig] = useState({
    valorHoraPadrao: 0,
    whatsappAtelier: '',
    bioAtelier:
      'Peças em crochê feitas à mão com amor e dedicação para decorar e aquecer o seu lar.',
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Modal de detalhes e galeria de fotos da peça
  const [activeProduct, setActiveProduct] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Sacola de compras / encomenda da cliente
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      setLoading(true);
      try {
        const data = await fetchPublicCatalogData();
        if (!mounted) return;
        setProducts(data.products || []);
        setYarns(data.yarns || []);
        if (data.laborConfig) {
          setAtelierConfig(data.laborConfig);
        }
      } catch (e) {
        console.error('Erro ao carregar catálogo público:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const yarnsMap = useMemo(() => {
    const map = {};
    yarns.forEach((y) => {
      map[y.id] = y;
    });
    return map;
  }, [yarns]);

  const catalogProducts = useMemo(() => {
    return products
      .filter((p) => p.visivelCatalogo !== false)
      .map((p) => {
        const calc = calculateProductPricing(
          p,
          yarnsMap,
          atelierConfig.valorHoraPadrao
        );
        const precoFinal =
          calc.valorFinalSugerido > 0
            ? calc.valorFinalSugerido
            : Number(p.precoCatalogo) || 0;
        return {
          ...p,
          precoFinal,
          qtdEstoque: Math.max(0, Number(p.estoqueAtual) || 0),
        };
      });
  }, [products, yarnsMap, atelierConfig.valorHoraPadrao]);

  const categories = useMemo(() => {
    const set = new Set(catalogProducts.map((p) => p.tipo).filter(Boolean));
    return ['TODAS', ...Array.from(set)];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.nome.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        (p.observacoes || '').toLowerCase().includes(q) ||
        (p.cores || []).some((c) => c.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (selectedCategory !== 'TODAS' && p.tipo !== selectedCategory) return false;
      if (onlyInStock && p.qtdEstoque <= 0) return false;
      return true;
    });
  }, [catalogProducts, search, selectedCategory, onlyInStock]);

  // Funções da Sacola da Cliente
  function addToCart(prod, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === prod.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { product: prod, quantity: qty }];
    });
  }

  function updateCartQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const cartSummary = useMemo(() => {
    const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
    const totalPrice = cart.reduce(
      (acc, i) => acc + i.quantity * i.product.precoFinal,
      0
    );
    return { totalItems, totalPrice };
  }, [cart]);

  function handleDirectWhatsAppProduct(prod) {
    const whatsDigits = getCleanWhatsAppNumber(atelierConfig.whatsappAtelier);
    const disponibilidade =
      prod.qtdEstoque > 0
        ? 'Pronta Entrega'
        : 'Sob Encomenda';
    const coresStr = (prod.cores || []).join(', ');

    const msg = [
      `Olá, Adri! 🥰 Vi o catálogo virtual do *Atelier da Adri* e tenho interesse nesta peça:`,
      ``,
      `🧶 *${prod.nome}* (${prod.tipo})`,
      coresStr ? `🎨 Cores: ${coresStr}` : null,
      `📦 Disponibilidade: ${disponibilidade}`,
      `✨ Valor: *${formatCurrency(prod.precoFinal)}*`,
      ``,
      `Poderia me passar mais informações para eu encomendar?`,
    ]
      .filter(Boolean)
      .join('\n');

    const url = whatsDigits
      ? `https://wa.me/${whatsDigits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleSendCartWhatsApp(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    const whatsDigits = getCleanWhatsAppNumber(atelierConfig.whatsappAtelier);
    const saudacao = clientName.trim()
      ? `Olá, Adri! Me chamo *${clientName.trim()}* 🥰`
      : `Olá, Adri! Tudo bem? 🥰`;

    const itensTexto = cart
      .map((item) => {
        const p = item.product;
        const sub = p.precoFinal * item.quantity;
        const disp = p.qtdEstoque > 0 ? 'Pronta entrega' : 'Sob encomenda';
        return `• *${item.quantity}x ${p.nome}* (Cores: ${(p.cores || []).join(', ')}) [${disp}]\n  Unitário: ${formatCurrency(p.precoFinal)} | Subtotal: *${formatCurrency(sub)}*`;
      })
      .join('\n\n');

    const msg = [
      saudacao,
      `Escolhi estas peças no Catálogo Virtual do *Atelier da Adri* e gostaria de fazer o pedido:`,
      ``,
      `🛍️ *MEU PEDIDO:*`,
      itensTexto,
      `────────────────────`,
      `✨ *VALOR TOTAL: ${formatCurrency(cartSummary.totalPrice)}*`,
      clientNotes.trim() ? `\n📝 *Observações:* ${clientNotes.trim()}` : null,
      ``,
      `Aguardo seu retorno para combinarmos o pagamento e a entrega! 💕`,
    ]
      .filter(Boolean)
      .join('\n');

    const url = whatsDigits
      ? `https://wa.me/${whatsDigits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="app-shell">
      {/* Cabeçalho do Catálogo Virtual */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="brand-title">Atelier da Adri</div>
              <div className="brand-subtitle">Catálogo Virtual de Crochê Artesanal</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag size={16} />
              Sacola ({cartSummary.totalItems})
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onOpenAdmin}
              title="Acesso restrito para administração do Atelier"
            >
              <Lock size={14} /> Área da Adri
            </button>
          </div>
        </div>
      </header>

      {/* Banner de Boas-Vindas do Catálogo */}
      <section className="catalog-hero">
        <div className="catalog-hero-inner">
          <span className="catalog-badge">🧶 Feito à Mão com Amor</span>
          <h1>Catálogo Virtual — Atelier da Adri</h1>
          <p>{atelierConfig.bioAtelier}</p>
        </div>
      </section>

      {/* Conteúdo Principal da Vitrine */}
      <main className="main-container" style={{ paddingTop: '1.25rem' }}>
        {/* Barra de Busca e Filtros */}
        <div className="catalog-filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '13px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-light)',
              }}
            />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: '2.35rem' }}
              placeholder="Buscar tapete, jogo de banheiro, amigurumi ou cor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`btn btn-sm ${onlyInStock ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setOnlyInStock(!onlyInStock)}
          >
            <CheckCircle2 size={15} />
            Apenas Pronta Entrega
          </button>
        </div>

        {/* Categorias em Pílulas Deslizantes */}
        {categories.length > 1 && (
          <div className="catalog-categories-scroll">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`catalog-category-pill ${
                  selectedCategory === cat ? 'active' : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'TODAS' ? '✨ Todas as Peças' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Grade de Produtos do Catálogo */}
        {loading ? (
          <div className="empty-state">Carregando peças do Atelier da Adri...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="panel empty-state">
            <p>Nenhuma peça encontrada no catálogo no momento.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filteredProducts.map((prod) => {
              const photos = Array.isArray(prod.fotos) ? prod.fotos : [];
              const coverPhoto = photos.length > 0 ? photos[0] : null;
              const inStock = prod.qtdEstoque > 0;

              return (
                <article key={prod.id} className="catalog-card">
                  {/* Área da Foto */}
                  <div
                    className="catalog-card-image-wrap"
                    onClick={() => {
                      setActiveProduct(prod);
                      setActivePhotoIndex(0);
                    }}
                  >
                    {coverPhoto ? (
                      <img
                        src={coverPhoto}
                        alt={prod.nome}
                        className="catalog-card-image"
                      />
                    ) : (
                      <div className="catalog-card-placeholder">
                        <ImageIcon size={36} />
                        <span>Atelier da Adri</span>
                      </div>
                    )}

                    {/* Selo Pronta Entrega ou Sob Encomenda */}
                    <span
                      className={`catalog-stock-badge ${
                        inStock ? 'in-stock' : 'on-order'
                      }`}
                    >
                      {inStock ? (
                        <>
                          <CheckCircle2 size={13} /> Pronta Entrega ({prod.qtdEstoque})
                        </>
                      ) : (
                        <>
                          <Clock size={13} /> Sob Encomenda
                        </>
                      )}
                    </span>

                    {photos.length > 1 && (
                      <span className="catalog-photo-count">
                        📷 {photos.length} fotos
                      </span>
                    )}
                  </div>

                  {/* Corpo do Card */}
                  <div className="catalog-card-body">
                    <div className="catalog-card-category">{prod.tipo}</div>
                    <h2
                      className="catalog-card-title"
                      onClick={() => {
                        setActiveProduct(prod);
                        setActivePhotoIndex(0);
                      }}
                    >
                      {prod.nome}
                    </h2>

                    <div className="color-chips-wrap" style={{ marginTop: '0.15rem' }}>
                      {(prod.cores || []).map((cor) => (
                        <span key={cor} className="tag" style={{ fontSize: '0.72rem' }}>
                          <Palette size={11} color="var(--primary)" /> {cor}
                        </span>
                      ))}
                      {prod.pesoTotal > 0 && (
                        <span className="tag" style={{ fontSize: '0.72rem' }}>
                          <Scale size={11} /> {prod.pesoTotal}g
                        </span>
                      )}
                    </div>

                    {prod.observacoes && (
                      <p className="catalog-card-desc">{prod.observacoes}</p>
                    )}

                    <div className="catalog-card-footer">
                      <div>
                        <span className="catalog-price-label">Valor da Peça</span>
                        <div className="catalog-price-value">
                          {formatCurrency(prod.precoFinal)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            addToCart(prod, 1);
                            setIsCartOpen(true);
                          }}
                          title="Adicionar à sacola para pedir mais de uma peça"
                        >
                          <Plus size={15} /> Sacola
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ background: '#16A34A' }}
                          onClick={() => handleDirectWhatsAppProduct(prod)}
                        >
                          <MessageCircle size={15} /> Pedir
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Botão Flutuante da Sacola no Celular */}
      {cartSummary.totalItems > 0 && !isCartOpen && (
        <button
          type="button"
          className="floating-cart-btn"
          onClick={() => setIsCartOpen(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingBag size={20} />
            <span>
              Ver Minha Sacola ({cartSummary.totalItems}{' '}
              {cartSummary.totalItems === 1 ? 'peça' : 'peças'})
            </span>
          </div>
          <strong>{formatCurrency(cartSummary.totalPrice)}</strong>
        </button>
      )}

      {/* Modal de Detalhes e Fotos Ampliadas da Peça */}
      {activeProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveProduct(null)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: '0.85rem' }}>
              <div>
                <span className="tag order-tag">{activeProduct.tipo}</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem' }}>
                  {activeProduct.nome}
                </h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveProduct(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Galeria de Fotos */}
            {Array.isArray(activeProduct.fotos) && activeProduct.fotos.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <img
                  src={activeProduct.fotos[activePhotoIndex] || activeProduct.fotos[0]}
                  alt={activeProduct.nome}
                  style={{
                    width: '100%',
                    maxHeight: '360px',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                  }}
                />

                {activeProduct.fotos.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev === 0 ? activeProduct.fotos.length - 1 : prev - 1
                        )
                      }
                    >
                      <ChevronLeft size={16} /> Anterior
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Foto {activePhotoIndex + 1} de {activeProduct.fotos.length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev === activeProduct.fotos.length - 1 ? 0 : prev + 1
                        )
                      }
                    >
                      Próxima <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-stack">
              <div className="color-chips-wrap">
                {(activeProduct.cores || []).map((cor) => (
                  <span key={cor} className="color-chip">
                    <Palette size={13} color="var(--primary)" /> {cor}
                  </span>
                ))}
                {activeProduct.pesoTotal > 0 && (
                  <span className="color-chip">
                    <Scale size={13} /> Peso aprox.: {activeProduct.pesoTotal}g
                  </span>
                )}
              </div>

              {activeProduct.observacoes && (
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                  }}
                >
                  {activeProduct.observacoes}
                </div>
              )}

              <div className="receipt-total">
                <div>
                  <div className="total-label">
                    {activeProduct.qtdEstoque > 0
                      ? `✅ PRONTA ENTREGA (${activeProduct.qtdEstoque} disp.)`
                      : '🧶 FEITO SOB ENCOMENDA'}
                  </div>
                </div>
                <div className="total-amount">
                  {formatCurrency(activeProduct.precoFinal)}
                </div>
              </div>

              <div className="form-row-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    addToCart(activeProduct, 1);
                    setActiveProduct(null);
                    setIsCartOpen(true);
                  }}
                >
                  <Plus size={18} /> Adicionar à Sacola
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ background: '#16A34A' }}
                  onClick={() => handleDirectWhatsAppProduct(activeProduct)}
                >
                  <MessageCircle size={18} /> Pedir pelo WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Sacola de Encomenda da Cliente */}
      {isCartOpen && (
        <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div className="panel-title">
                <ShoppingBag size={20} color="var(--primary)" />
                Minha Sacola de Encomenda
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsCartOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-state">
                <p>Sua sacola ainda está vazia. Escolha suas peças favoritas no catálogo!</p>
              </div>
            ) : (
              <form className="form-stack" onSubmit={handleSendCartWhatsApp}>
                <div className="product-yarns-mini-list">
                  {cart.map((item) => (
                    <div key={item.product.id} className="product-yarn-mini-item">
                      <div style={{ flex: 1 }}>
                        <strong>{item.product.nome}</strong>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {formatCurrency(item.product.precoFinal)} cada • Cores:{' '}
                          {(item.product.cores || []).join(', ')}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.5rem', minHeight: '30px' }}
                          onClick={() => updateCartQty(item.product.id, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <strong style={{ minWidth: '22px', textAlign: 'center' }}>
                          {item.quantity}
                        </strong>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.2rem 0.5rem', minHeight: '30px' }}
                          onClick={() => updateCartQty(item.product.id, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <span>Seu Nome *</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Digite seu nome..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">
                    <span>Alguma preferência de cor ou observação?</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Opcional: Ex: Quero na cor Rosa Bebê..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                  />
                </div>

                <div className="receipt-total">
                  <div>
                    <div className="total-label">TOTAL DO PEDIDO</div>
                    <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                      {cartSummary.totalItems} peça(s)
                    </div>
                  </div>
                  <div className="total-amount">
                    {formatCurrency(cartSummary.totalPrice)}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ width: '100%', background: '#16A34A' }}
                >
                  <Send size={18} /> Enviar Pedido no WhatsApp da Adri
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
