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
    fotos: Array.isArray(row.fotos) ? row.fotos : [],
    visivelCatalogo:
      row.visivel_catalogo === undefined || row.visivel_catalogo === null
        ? true
        : Boolean(row.visivel_catalogo),
    precoCatalogo: Number(row.preco_catalogo) || 0,
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
    fotos: Array.isArray(prod.fotos) ? prod.fotos : [],
    visivel_catalogo:
      prod.visivelCatalogo === undefined ? true : Boolean(prod.visivelCatalogo),
    preco_catalogo: Number(prod.precoCatalogo) || 0,
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
        whatsappAtelier: laborRes.data.whatsapp_atelier || '',
        bioAtelier:
          laborRes.data.bio_atelier || INITIAL_LABOR_CONFIG.bioAtelier,
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

/**
 * Busca os dados públicos para o Catálogo Virtual das clientes (sem exigir login)
 */
export async function fetchPublicCatalogData() {
  const [productsRes, yarnsRes, laborRes] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('visivel_catalogo', true)
      .order('created_at', { ascending: false }),
    supabase.from('yarns').select('*'),
    supabase.from('labor_settings').select('*').limit(1).maybeSingle(),
  ]);

  const products = (productsRes.data || []).map(mapProductFromDb);
  const yarns = (yarnsRes.data || []).map(mapYarnFromDb);
  const laborConfig = laborRes.data
    ? {
        valorHoraPadrao: Number(laborRes.data.valor_hora_padrao) || 0,
        whatsappAtelier: laborRes.data.whatsapp_atelier || '',
        bioAtelier:
          laborRes.data.bio_atelier || INITIAL_LABOR_CONFIG.bioAtelier,
      }
    : INITIAL_LABOR_CONFIG;

  return {
    products,
    yarns,
    laborConfig,
  };
}

export async function syncTableCollection(tableName, userId, items, mapToDbFn) {
  if (!userId) return;

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
      whatsapp_atelier: laborConfig.whatsappAtelier || '',
      bio_atelier:
        laborConfig.bioAtelier || INITIAL_LABOR_CONFIG.bioAtelier,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Redimensiona/comprime a foto no navegador (para ficar leve no celular) e envia ao Supabase Storage
 */
export async function compressAndUploadPhoto(file) {
  const compressedBlob = await compressImageFile(file, 1000, 0.82);
  const fileName = `peca-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from('product-photos')
    .upload(fileName, compressedBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    // Fallback para Data URL caso haja restrição de rede temporária
    return await blobToDataURL(compressedBlob);
  }

  const { data: pubData } = supabase.storage
    .from('product-photos')
    .getPublicUrl(fileName);

  return pubData?.publicUrl || (await blobToDataURL(compressedBlob));
}

function compressImageFile(file, maxDimension = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha ao comprimir imagem'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
