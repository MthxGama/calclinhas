'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Send,
  Copy,
  Check,
  User,
  Phone,
  ShoppingBag,
  Calendar,
  Edit3,
  X,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { calculateProductPricing, formatCurrency } from '../utils/calculations';

function formatPhoneBR(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getWhatsAppDigits(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

export default function QuoteManager({
  quotes,
  setQuotes,
  products,
  yarns,
  laborConfig,
  onNavigateToProducts,
}) {
  const yarnsMap = useMemo(() => {
    const map = {};
    yarns.forEach((y) => {
      map[y.id] = y;
    });
    return map;
  }, [yarns]);

  // Mapa de produtos com seus respectivos preços finais calculados
  const productsWithPrice = useMemo(() => {
    return products.map((p) => {
      const calc = calculateProductPricing(
        p,
        yarnsMap,
        laborConfig.valorHoraPadrao
      );
      return {
        ...p,
        precoUnitario: calc.valorFinalSugerido,
        calc,
      };
    });
  }, [products, yarnsMap, laborConfig.valorHoraPadrao]);

  const productsPriceMap = useMemo(() => {
    const map = {};
    productsWithPrice.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [productsWithPrice]);

  const createEmptyForm = () => ({
    clienteNome: '',
    clienteTelefone: '',
    itens:
      products.length > 0
        ? [{ productId: products[0].id, quantidade: 1 }]
        : [],
    desconto: 0,
    frete: 0,
    prazoEntrega: '10 dias úteis',
    formaPagamento: '50% de sinal no pedido (PIX) e 50% na entrega',
    observacoes: '',
    status: 'Pendente',
  });

  const [form, setForm] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Se o usuário cadastrar a primeira peça e abrir a aba de orçamento, pré-seleciona a peça
  useEffect(() => {
    if (!editingId && form.itens.length === 0 && products.length > 0) {
      setForm((prev) => ({
        ...prev,
        itens: [{ productId: products[0].id, quantidade: 1 }],
      }));
    }
  }, [products, editingId, form.itens.length]);

  // Cálculo detalhado do orçamento atual
  const quoteSummary = useMemo(() => {
    const detailedItems = (form.itens || []).map((item) => {
      const prod = productsPriceMap[item.productId];
      const qtd = Math.max(1, Number(item.quantidade) || 1);
      const unitario = prod ? prod.precoUnitario : 0;
      const subtotal = unitario * qtd;
      return {
        ...item,
        prod,
        quantidade: qtd,
        unitario,
        subtotal,
      };
    });

    const subtotalPecas = detailedItems.reduce((acc, cur) => acc + cur.subtotal, 0);
    const totalPecasQtd = detailedItems.reduce((acc, cur) => acc + cur.quantidade, 0);
    const desconto = Number(form.desconto) || 0;
    const frete = Number(form.frete) || 0;
    const valorTotal = Math.max(0, subtotalPecas - desconto + frete);

    return {
      detailedItems,
      subtotalPecas,
      totalPecasQtd,
      desconto,
      frete,
      valorTotal,
    };
  }, [form.itens, form.desconto, form.frete, productsPriceMap]);

  function buildWhatsAppMessage(quoteData, summaryData) {
    const nome = (quoteData.clienteNome || '').trim();
    const saudacao = nome ? `Olá, *${nome}*! Tudo bem? 🥰` : `Olá! Tudo bem? 🥰`;

    const linhasItens = summaryData.detailedItems
      .map((item) => {
        if (!item.prod) return null;
        const coresStr =
          item.prod.cores && item.prod.cores.length > 0
            ? ` (Cores: ${item.prod.cores.join(', ')})`
            : '';
        return `🧶 *${item.quantidade}x ${item.prod.nome}*${coresStr}\n   Valor unitário: ${formatCurrency(item.unitario)} | Subtotal: *${formatCurrency(item.subtotal)}*`;
      })
      .filter(Boolean)
      .join('\n\n');

    const partes = [
      saudacao,
      `Aqui está o seu orçamento personalizado de crochê feito à mão:`,
      ``,
      `📋 *ITENS DO ORÇAMENTO:*`,
      linhasItens || '• Nenhuma peça selecionada',
      `────────────────────`,
      summaryData.desconto > 0 || summaryData.frete > 0
        ? `Subtotal das peças: ${formatCurrency(summaryData.subtotalPecas)}`
        : null,
      summaryData.desconto > 0
        ? `🎁 Desconto especial: - ${formatCurrency(summaryData.desconto)}`
        : null,
      summaryData.frete > 0
        ? `🚚 Taxa de entrega / Frete: + ${formatCurrency(summaryData.frete)}`
        : null,
      `✨ *VALOR TOTAL: ${formatCurrency(summaryData.valorTotal)}*`,
      ``,
      quoteData.prazoEntrega
        ? `🗓️ *Prazo de confecção:* ${quoteData.prazoEntrega}`
        : null,
      quoteData.formaPagamento
        ? `💳 *Forma de pagamento:* ${quoteData.formaPagamento}`
        : null,
      quoteData.observacoes
        ? `📝 *Observações:* ${quoteData.observacoes}`
        : null,
      ``,
      `Qualquer dúvida ou se desejar confirmar a sua encomenda, é só me responder por aqui! 💕`,
    ];

    return partes.filter((line) => line !== null).join('\n');
  }

  const liveMessageText = useMemo(() => {
    return buildWhatsAppMessage(form, quoteSummary);
  }, [form, quoteSummary]);

  function handleAddItem() {
    if (products.length === 0) return;
    setForm((prev) => ({
      ...prev,
      itens: [...prev.itens, { productId: products[0].id, quantidade: 1 }],
    }));
  }

  function handleUpdateItem(index, field, value) {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  function handleRemoveItem(index) {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, idx) => idx !== index),
    }));
  }

  function saveQuoteRecord() {
    const payload = {
      id: editingId || `quote-${Date.now()}`,
      clienteNome: form.clienteNome.trim() || 'Cliente',
      clienteTelefone: form.clienteTelefone.trim(),
      itens: form.itens.map((i) => ({
        productId: i.productId,
        quantidade: Math.max(1, Number(i.quantidade) || 1),
      })),
      desconto: Number(form.desconto) || 0,
      frete: Number(form.frete) || 0,
      prazoEntrega: form.prazoEntrega.trim(),
      formaPagamento: form.formaPagamento.trim(),
      observacoes: form.observacoes.trim(),
      status: form.status || 'Pendente',
      criadoEm: new Date().toLocaleDateString('pt-BR'),
    };

    if (editingId) {
      setQuotes((prev) => prev.map((q) => (q.id === editingId ? payload : q)));
      setEditingId(null);
    } else {
      setQuotes((prev) => [payload, ...prev]);
    }

    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (form.itens.length === 0) {
      alert('Adicione pelo menos uma peça ao orçamento.');
      return;
    }
    saveQuoteRecord();
    setForm(createEmptyForm());
  }

  function handleSendWhatsAppCurrent() {
    if (form.itens.length === 0) {
      alert('Adicione pelo menos uma peça ao orçamento antes de enviar.');
      return;
    }
    const phoneDigits = getWhatsAppDigits(form.clienteTelefone);
    if (!phoneDigits || phoneDigits.length < 12) {
      alert('Informe o número de WhatsApp da cliente com DDD (ex: 11 99999-9999).');
      return;
    }

    // Salva automaticamente o orçamento no histórico ao enviar
    saveQuoteRecord();

    const encodedMsg = encodeURIComponent(liveMessageText);
    const url = `https://wa.me/${phoneDigits}?text=${encodedMsg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function handleSendSavedQuoteWhatsApp(quote) {
    const calcSummary = computeSavedQuoteSummary(quote);
    const msg = buildWhatsAppMessage(quote, calcSummary);
    const phoneDigits = getWhatsAppDigits(quote.clienteTelefone);

    if (!phoneDigits || phoneDigits.length < 12) {
      alert('Este orçamento não possui um número de telefone válido com DDD. Edite o orçamento para informar o número.');
      return;
    }

    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function computeSavedQuoteSummary(quote) {
    const detailedItems = (quote.itens || []).map((item) => {
      const prod = productsPriceMap[item.productId];
      const qtd = Math.max(1, Number(item.quantidade) || 1);
      const unitario = prod ? prod.precoUnitario : 0;
      const subtotal = unitario * qtd;
      return {
        ...item,
        prod,
        quantidade: qtd,
        unitario,
        subtotal,
      };
    });
    const subtotalPecas = detailedItems.reduce((acc, cur) => acc + cur.subtotal, 0);
    const desconto = Number(quote.desconto) || 0;
    const frete = Number(quote.frete) || 0;
    const valorTotal = Math.max(0, subtotalPecas - desconto + frete);
    return {
      detailedItems,
      subtotalPecas,
      desconto,
      frete,
      valorTotal,
    };
  }

  function handleCopySavedQuote(quote) {
    const calcSummary = computeSavedQuoteSummary(quote);
    const msg = buildWhatsAppMessage(quote, calcSummary);
    navigator.clipboard.writeText(msg);
    setCopiedId(quote.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function handleEdit(quote) {
    setEditingId(quote.id);
    setForm({
      clienteNome: quote.clienteNome || '',
      clienteTelefone: quote.clienteTelefone || '',
      itens: quote.itens || [],
      desconto: quote.desconto || 0,
      frete: quote.frete || 0,
      prazoEntrega: quote.prazoEntrega || '',
      formaPagamento: quote.formaPagamento || '',
      observacoes: quote.observacoes || '',
      status: quote.status || 'Pendente',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    if (window.confirm('Deseja excluir este orçamento do histórico?')) {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setForm(createEmptyForm());
      }
    }
  }

  function handleStatusChange(id, newStatus) {
    setQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
  }

  return (
    <div className="workspace-grid-wide">
      {/* Coluna Esquerda: Montar Orçamento e Enviar para a Cliente */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <FileText size={20} color="var(--primary)" />
              {editingId ? 'Editar Orçamento da Cliente' : 'Novo Orçamento para Cliente'}
            </h2>
            <p className="panel-subtitle">
              Selecione as peças cadastradas, quantidades e o WhatsApp da cliente para enviar tudo certinho.
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
          {/* Dados da Cliente */}
          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Nome da Cliente *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
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
                  placeholder="Ex: Maria Silva"
                  value={form.clienteNome}
                  onChange={(e) => setForm({ ...form, clienteNome: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>WhatsApp da Cliente (c/ DDD) *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone
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
                  type="tel"
                  inputMode="tel"
                  className="input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="(11) 99999-9999"
                  value={form.clienteTelefone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      clienteTelefone: formatPhoneBR(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Peças do Orçamento e Quantidades */}
          <div className="field-group">
            <div className="field-label">
              <span>Peças do Orçamento & Quantidades *</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddItem}
              >
                <Plus size={14} /> + Adicionar Peça
              </button>
            </div>

            {products.length === 0 ? (
              <div className="calc-preview-box">
                <span style={{ fontSize: '0.85rem' }}>
                  Você ainda não tem peças cadastradas na aba <strong>2. Peças</strong>.
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateToProducts}
                >
                  Cadastrar Peça Primeiro
                </button>
              </div>
            ) : (
              <div className="yarn-usage-list">
                {form.itens.map((item, idx) => {
                  const selectedProd = productsPriceMap[item.productId];
                  const unitario = selectedProd ? selectedProd.precoUnitario : 0;
                  const qtd = Math.max(1, Number(item.quantidade) || 1);
                  const subtotal = unitario * qtd;

                  return (
                    <div key={idx} className="yarn-usage-row">
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
                          Peça #{idx + 1}
                        </label>
                        <select
                          className="select"
                          value={item.productId}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'productId', e.target.value)
                          }
                        >
                          {productsWithPrice.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.tipo}) — {formatCurrency(p.precoUnitario)} un.
                            </option>
                          ))}
                        </select>
                        <div className="yarn-usage-cost">
                          Unitário: {formatCurrency(unitario)} • Subtotal ({qtd}x):{' '}
                          <strong>{formatCurrency(subtotal)}</strong>
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
                          Quantidade
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          className="input"
                          value={item.quantidade}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'quantidade', e.target.value)
                          }
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={form.itens.length === 1}
                          title="Remover peça do orçamento"
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

          {/* Desconto, Frete e Condições */}
          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Desconto Especial (R$)</span>
                <span className="field-hint">Opcional</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                className="input"
                placeholder="0.00"
                value={form.desconto}
                onChange={(e) => setForm({ ...form, desconto: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Frete / Entrega (R$)</span>
                <span className="field-hint">Opcional</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                className="input"
                placeholder="0.00"
                value={form.frete}
                onChange={(e) => setForm({ ...form, frete: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="field-group">
              <label className="field-label">
                <span>Prazo de Confecção / Entrega</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: 10 dias úteis, Pronta entrega..."
                value={form.prazoEntrega}
                onChange={(e) => setForm({ ...form, prazoEntrega: e.target.value })}
              />
            </div>

            <div className="field-group">
              <label className="field-label">
                <span>Forma de Pagamento</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ex: 50% de entrada no PIX e 50% na entrega"
                value={form.formaPagamento}
                onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}
              />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              <span>Observações para a Cliente</span>
              <span className="field-hint">Opcional</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Cores podem ser personalizadas conforme sua preferência!"
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          {/* Prévia da Mensagem e Valor Total */}
          <div className="pricing-receipt">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '0.92rem' }}>
                Prévia da Mensagem para a Cliente:
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(liveMessageText);
                  setCopiedPreview(true);
                  setTimeout(() => setCopiedPreview(false), 2500);
                }}
              >
                {copiedPreview ? (
                  <>
                    <Check size={14} color="var(--secondary)" /> Texto Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copiar Mensagem
                  </>
                )}
              </button>
            </div>

            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem',
                color: 'var(--text-main)',
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {liveMessageText}
            </pre>

            <div className="receipt-total">
              <div>
                <div className="total-label">TOTAL DO ORÇAMENTO</div>
                <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                  {quoteSummary.totalPecasQtd} peça(s) incluída(s)
                </div>
              </div>
              <div className="total-amount">{formatCurrency(quoteSummary.valorTotal)}</div>
            </div>
          </div>

          {/* Botões de Ação: Enviar direto no WhatsApp ou Apenas Salvar */}
          <div className="form-row-2">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', background: '#16A34A' }}
              onClick={handleSendWhatsAppCurrent}
            >
              <MessageCircle size={19} /> Enviar no WhatsApp da Cliente
            </button>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Check size={18} />
              {editingId ? 'Salvar Alterações' : 'Salvar Orçamento'}
            </button>
          </div>
        </form>
      </div>

      {/* Coluna Direita: Histórico de Orçamentos Criados */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Sparkles size={20} color="var(--secondary)" />
              Orçamentos Salvos ({quotes.length})
            </h2>
            <p className="panel-subtitle">
              Acompanhe os orçamentos enviados, status do pedido e reenvie no WhatsApp quando precisar.
            </p>
          </div>
        </div>

        {quotes.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum orçamento salvo ainda. Monte o primeiro orçamento no formulário!</p>
          </div>
        ) : (
          <div className="form-stack">
            {quotes.map((quote) => {
              const summary = computeSavedQuoteSummary(quote);

              return (
                <div key={quote.id} className="product-card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                          {quote.clienteNome}
                        </h3>
                        <span className="tag">
                          <Phone size={12} /> {quote.clienteTelefone || 'Sem telefone'}
                        </span>
                        <span className="tag">
                          <Calendar size={12} /> {quote.criadoEm}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <select
                        className="select"
                        style={{
                          minHeight: '34px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.78rem',
                          width: 'auto',
                          fontWeight: 700,
                        }}
                        value={quote.status || 'Pendente'}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                      >
                        <option value="Pendente">⏳ Pendente</option>
                        <option value="Aprovado">✅ Encomenda Fechada</option>
                        <option value="Entregue">🎉 Entregue</option>
                      </select>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEdit(quote)}
                        title="Editar orçamento"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => handleDelete(quote.id)}
                        title="Excluir orçamento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Itens do Orçamento */}
                  <div className="product-yarns-mini-list">
                    {summary.detailedItems.map((item, idx) => (
                      <div key={idx} className="product-yarn-mini-item">
                        <div>
                          <strong>
                            {item.quantidade}x{' '}
                            {item.prod ? item.prod.nome : 'Peça removida'}
                          </strong>
                          {item.prod && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              {item.prod.tipo} • Cores: {(item.prod.cores || []).join(', ')}
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              display: 'block',
                            }}
                          >
                            {formatCurrency(item.unitario)} un.
                          </span>
                          <strong style={{ color: 'var(--secondary)' }}>
                            {formatCurrency(item.subtotal)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rodapé do Card do Orçamento: Total + Botão de Enviar WhatsApp */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      background: 'var(--bg-subtle)',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          display: 'block',
                        }}
                      >
                        Valor Total do Orçamento
                      </span>
                      <strong
                        style={{
                          fontSize: '1.15rem',
                          color: 'var(--primary)',
                        }}
                      >
                        {formatCurrency(summary.valorTotal)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleCopySavedQuote(quote)}
                      >
                        {copiedId === quote.id ? (
                          <>
                            <Check size={14} color="var(--secondary)" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Copiar Texto
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ background: '#16A34A' }}
                        onClick={() => handleSendSavedQuoteWhatsApp(quote)}
                      >
                        <Send size={14} /> Enviar no WhatsApp
                      </button>
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
