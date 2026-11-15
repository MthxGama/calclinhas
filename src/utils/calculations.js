/**
 * Calcula o valor por grama de um rolo de linha
 */
export function getCostPerGram(yarn) {
  if (!yarn || !yarn.pesoRolo || yarn.pesoRolo <= 0) return 0;
  return Number(yarn.valor) / Number(yarn.pesoRolo);
}

/**
 * Calcula o detalhamento de custos de um produto com base nas linhas usadas e nas horas trabalhadas
 */
export function calculateProductPricing(product, yarnsMap, fallbackHourlyRate = 15) {
  const itensLinhas = (product.linhasUsadas || []).map((item) => {
    const yarn = yarnsMap[item.yarnId];
    const pesoUsado = Number(item.pesoUsado) || 0;
    if (!yarn) {
      return {
        ...item,
        yarn: null,
        pesoUsado,
        custoPorGrama: 0,
        custoSubtotal: 0,
      };
    }
    const custoPorGrama = getCostPerGram(yarn);
    const custoSubtotal = custoPorGrama * pesoUsado;
    return {
      ...item,
      yarn,
      pesoUsado,
      custoPorGrama,
      custoSubtotal,
    };
  });

  const pesoTotalLinhas = itensLinhas.reduce((acc, cur) => acc + cur.pesoUsado, 0);
  const custoLinhas = itensLinhas.reduce((acc, cur) => acc + cur.custoSubtotal, 0);
  const custoExtra = Number(product.custoExtra) || 0;
  const custoMaterialTotal = custoLinhas + custoExtra;

  const horasGastas = Number(product.horasGastas) || 0;
  const valorHora =
    product.valorHora !== undefined && product.valorHora !== ''
      ? Number(product.valorHora)
      : Number(fallbackHourlyRate) || 0;

  const custoMaoDeObra = horasGastas * valorHora;
  const valorBasePeca = custoMaterialTotal + custoMaoDeObra;

  const margemLucro = Number(product.margemLucro) || 0;
  const valorLucro = valorBasePeca * (margemLucro / 100);
  const valorFinalSugerido = valorBasePeca + valorLucro;

  return {
    itensLinhas,
    pesoTotalLinhas,
    custoLinhas,
    custoExtra,
    custoMaterialTotal,
    horasGastas,
    valorHora,
    custoMaoDeObra,
    valorBasePeca,
    margemLucro,
    valorLucro,
    valorFinalSugerido,
  };
}

export function formatCurrency(value) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatNumber(value, decimals = 2) {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
