import { supabase } from './supabaseClient';
import { INITIAL_LABOR_CONFIG } from '../data/initialData';

// Mapeadores: Banco (snake_case) <-> App (camelCase)
export function mapYarnFromDb(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    cor: row.cor,
    corHex: row.cor_hex || '#F5EFE6',
    ordem: row.ordem,
    pesoRolo: Number(row.peso_rolo) || 0,
    marca: row.marca,
    valor: Number(row.valor) || 0,
  };
}

export function mapYarnToDb(yarn, userId) {
  return {
    id: yarn.id,
    user_id: userId,
    descricao: yarn.descricao,
    cor: yarn.cor,
    cor_hex: yarn.corHex || '#F5EFE6',
    ordem: yarn.ordem,
    peso_rolo: Number(yarn.pesoRolo) || 0,
    marca: yarn.marca,
    valor: Number(yarn.valor) || 0,
  };
}

export function mapProductFromDb(row) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    cores: Array.isArray(row.cores) ? row.cores : ['Cru'],
    pesoTotal: Number(row.peso_total) || 0,
    linhasUsadas: Array.isArray(row.linhas_usadas) ? row.linhas_usadas : [],
    horasGastas: Number(row.horas_gastas) || 0,
    valorHora: Number(row.valor_hora) || 0,
    custoExtra: Number(row.custo_extra) || 0,
    margemLucro: Number(row.margem_lucro) || 0,
    estoqueAtual: Number(row.estoque_atual) || 0,
    estoqueMinimo: Number(row.estoque_minimo) || 0,
    observacoes: row.observacoes || '',
    criadoEm: row.criado_em || '',
  };
}

export function mapProductToDb(prod, userId) {
  return {
    id: prod.id,
    user_id: userId,
    nome: prod.nome,
    tipo: prod.tipo,
    cores: prod.cores || ['Cru'],
    peso_total: Number(prod.pesoTotal) || 0,
    linhas_usadas: prod.linhasUsadas || [],
    horas_gastas: Number(prod.horasGastas) || 0,
    valor_hora: Number(prod.valorHora) || 0,
    custo_extra: Number(prod.custoExtra) || 0,
    margem_lucro: Number(prod.margemLucro) || 0,
    estoque_atual: Math.max(0, Number(prod.estoqueAtual) || 0),
    estoque_minimo: Math.max(0, Number(prod.estoqueMinimo) || 0),
    observacoes: prod.observacoes || '',
    criado_em: prod.criadoEm || '',
  };
}

export function mapQuoteFromDb(row) {
  return {
    id: row.id,
    clienteNome: row.cliente_nome,
    clienteTelefone: row.cliente_telefone || '',
    itens: Array.isArray(row.itens) ? row.itens : [],
    desconto: Number(row.desconto) || 0,
    frete: Number(row.frete) || 0,
    prazoEntrega: row.prazo_entrega || '',
    formaPagamento: row.forma_pagamento || '',
    observacoes: row.observacoes || '',
    status: row.status || 'Pendente',
    baixaEstoqueRealizada: Boolean(row.baixa_estoque_realizada),
    criadoEm: row.criado_em || '',
  };
}

export function mapQuoteToDb(quote, userId) {
  return {
    id: quote.id,
    user_id: userId,
    cliente_nome: quote.clienteNome || 'Cliente',
    cliente_telefone: quote.clienteTelefone || '',
    itens: quote.itens || [],
    desconto: Number(quote.desconto) || 0,
    frete: Number(quote.frete) || 0,
    prazo_entrega: quote.prazoEntrega || '',
    forma_pagamento: quote.formaPagamento || '',
    observacoes: quote.observacoes || '',
    status: quote.status || 'Pendente',
    baixa_estoque_realizada: Boolean(quote.baixaEstoqueRealizada),
    criado_em: quote.criadoEm || '',
  };
}

export function mapStockHistoryFromDb(row) {
  return {
    id: row.id,
    productId: row.product_id,
    produtoNome: row.produto_nome,
    tipo: row.tipo,
    quantidade: Number(row.quantidade) || 0,
    saldoAnterior: Number(row.saldo_anterior) || 0,
    saldoNovo: Number(row.saldo_novo) || 0,
    observacao: row.observacao || '',
    data: row.data || '',
  };
}

export function mapStockHistoryToDb(mov, userId) {
  return {
    id: mov.id,
    user_id: userId,
    product_id: mov.productId || '',
    produto_nome: mov.produtoNome || '',
    tipo: mov.tipo || 'ENTRADA',
    quantidade: Number(mov.quantidade) || 0,
    saldo_anterior: Number(mov.saldoAnterior) || 0,
    saldo_novo: Number(mov.saldoNovo) || 0,
    observacao: mov.observacao || '',
    data: mov.data || '',
  };
}

export async function fetchAllUserData(userId) {
  const [yarnsRes, productsRes, quotesRes, historyRes, laborRes] =
    await Promise.all([
      supabase
        .from('yarns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('stock_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('labor_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  const yarns = (yarnsRes.data || []).map(mapYarnFromDb);
  const products = (productsRes.data || []).map(mapProductFromDb);
  const quotes = (quotesRes.data || []).map(mapQuoteFromDb);
  const stockHistory = (historyRes.data || []).map(mapStockHistoryFromDb);

  const laborConfig = laborRes.data
    ? {
        valorHoraPadrao: Number(laborRes.data.valor_hora_padrao) || 0,
        metaMensal: Number(laborRes.data.meta_mensal) || 0,
        diasPorSemana: Number(laborRes.data.dias_por_semana) || 5,
        horasPorDia: Number(laborRes.data.horas_por_dia) || 8,
        margemLucroPadrao: Number(laborRes.data.margem_lucro_padrao) || 0,
      }
    : INITIAL_LABOR_CONFIG;

  return {
    yarns,
    products,
    quotes,
    stockHistory,
    laborConfig,
    hasLaborRow: Boolean(laborRes.data),
  };
}

export async function syncTableCollection(tableName, userId, items, mapToDbFn) {
  if (!userId) return;

  // Busca IDs existentes no banco para remover os que foram excluídos na tela
  const { data: existingRows } = await supabase
    .from(tableName)
    .select('id')
    .eq('user_id', userId);

  const currentIds = new Set(items.map((i) => i.id));
  const idsToDelete = (existingRows || [])
    .map((r) => r.id)
    .filter((id) => !currentIds.has(id));

  if (idsToDelete.length > 0) {
    await supabase
      .from(tableName)
      .delete()
      .eq('user_id', userId)
      .in('id', idsToDelete);
  }

  if (items.length > 0) {
    const payload = items.map((item) => mapToDbFn(item, userId));
    await supabase.from(tableName).upsert(payload, { onConflict: 'id' });
  }
}

export async function syncLaborSettings(userId, laborConfig) {
  if (!userId) return;
  await supabase.from('labor_settings').upsert(
    {
      user_id: userId,
      valor_hora_padrao: Number(laborConfig.valorHoraPadrao) || 0,
      meta_mensal: Number(laborConfig.metaMensal) || 0,
      dias_por_semana: Number(laborConfig.diasPorSemana) || 5,
      horas_por_dia: Number(laborConfig.horasPorDia) || 8,
      margem_lucro_padrao: Number(laborConfig.margemLucroPadrao) || 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}
