import JSZip from "jszip";

interface Parcela {
  descricao: string;
  valor: number | null;
  data_vencimento: string;
}

export interface ProposalPptxData {
  proposal_number: string;
  title: string;
  client_name: string;
  client_razao_social: string | null;
  client_cnpj: string | null;
  client_contato: string | null;
  about_company: string | null;
  description: string | null;
  scope: string | null;
  value: number | null;
  parcelas: Parcela[];
  payment_type: string | null;
  data_envio: string | null;
  empresa: string | null;
  tipo_projeto: string | null;
  etapas: { descricao: string; valor: number | null }[];
}

function formatCurrency(v: number | null): string {
  if (v == null) return "#N/A#";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(d: string | null): string {
  if (!d) return "#N/A#";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function numberToWords(n: number): string {
  const units = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove"];
  const teens = ["dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const tens = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const hundreds = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

  if (n === 0) return "zero";
  if (n === 100) return "cem";

  const parts: string[] = [];

  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    parts.push(m === 1 ? "um milhão" : `${numberToWords(m)} milhões`);
    n %= 1000000;
    if (n > 0) parts.push("e");
  }

  if (n >= 1000) {
    const t = Math.floor(n / 1000);
    parts.push(t === 1 ? "mil" : `${numberToWords(t)} mil`);
    n %= 1000;
    if (n > 0) parts.push("e");
  }

  if (n >= 100) {
    if (n === 100) { parts.push("cem"); return parts.join(" "); }
    parts.push(hundreds[Math.floor(n / 100)]);
    n %= 100;
    if (n > 0) parts.push("e");
  }

  if (n >= 10 && n < 20) {
    parts.push(teens[n - 10]);
  } else {
    if (n >= 20) {
      parts.push(tens[Math.floor(n / 10)]);
      n %= 10;
      if (n > 0) parts.push("e");
    }
    if (n > 0) parts.push(units[n]);
  }

  return parts.join(" ");
}

function valorPorExtenso(v: number): string {
  const intPart = Math.floor(v);
  const decPart = Math.round((v - intPart) * 100);
  let result = `${numberToWords(intPart)} reais`;
  if (decPart > 0) result += ` e ${numberToWords(decPart)} centavos`;
  return result;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatEtapaLabel(val: number | null, mode: "percent" | "value", total: number | null): string {
  if (val == null) return "#N/A#";
  if (mode === "percent") {
    const monetary = total ? (val / 100) * total : null;
    const base = `${val}%`;
    if (monetary != null) return `${base} - ${formatCurrency(monetary)} (${valorPorExtenso(monetary)})`;
    return base;
  }
  return `${formatCurrency(val)} (${valorPorExtenso(val)})`;
}

export async function generateProposalPptx(data: ProposalPptxData) {
  // Fetch the template
  const resp = await fetch("/templates/proposta_modelo.pptx");
  const templateBuffer = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(templateBuffer);

  // Build replacement map
  const etapaInicio = data.etapas.find(e => e.descricao === "inicio");
  const etapaMinuta = data.etapas.find(e => e.descricao === "minuta");
  const etapaAssinatura = data.etapas.find(e => e.descricao === "assinatura");

  // Detect if etapas are percentages or values
  const totalEtapas = data.etapas.reduce((s, e) => s + (e.valor || 0), 0);
  const isPercent = totalEtapas > 0 && totalEtapas <= 100;

  const replacements: Record<string, string> = {
    "{{NUMERO_PROPOSTA}}": data.proposal_number || "#N/A#",
    "{{NOME_CONTATO}}": data.client_contato || "#N/A#",
    "{{RAZAO_SOCIAL}}": data.client_razao_social || "#N/A#",
    "{{NOME_CLIENTE}}": data.client_name || "#N/A#",
    "{{CNPJ_CLIENTE}}": data.client_cnpj || "#N/A#",
    "{{DATA_PROPOSTA}}": formatDateBR(data.data_envio),
    "{{TEXTO_CONTEXTO}}": data.about_company || "#N/A#",
    "{{TEXTO_SITUACAO}}": data.description || "#N/A#",
    "{{TEXTO_ESCOPO}}": data.scope || "#N/A#",
    "{{VALOR_PROPOSTA}}": formatCurrency(data.value),
    "{{VALOR_PROPOSTA_EXTENSO}}": data.value ? valorPorExtenso(data.value) : "#N/A#",
    "{{CONDIÇÃO DE PAGAMENTO 1}}": formatEtapaLabel(etapaInicio?.valor ?? null, isPercent ? "percent" : "value", data.value),
    "{{CONDIÇÃO DE PAGAMENTO 2}}": formatEtapaLabel(etapaMinuta?.valor ?? null, isPercent ? "percent" : "value", data.value),
    "{{CONDIÇÃO DE PAGAMENTO 3}}": formatEtapaLabel(etapaAssinatura?.valor ?? null, isPercent ? "percent" : "value", data.value),
  };

  // Process each slide XML
  const slideFiles = Object.keys(zip.files).filter(
    f => f.startsWith("ppt/slides/slide") && f.endsWith(".xml")
  );

  for (const slideFile of slideFiles) {
    let content = await zip.file(slideFile)!.async("string");
    let changed = false;

    for (const [placeholder, value] of Object.entries(replacements)) {
      const escaped = escapeXml(placeholder);
      // Try both raw and XML-escaped versions of the placeholder
      if (content.includes(placeholder)) {
        content = content.split(placeholder).join(escapeXml(value));
        changed = true;
      }
      if (content.includes(escaped)) {
        content = content.split(escaped).join(escapeXml(value));
        changed = true;
      }
    }

    if (changed) {
      zip.file(slideFile, content);
    }
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  const filename = `Proposta_${(data.proposal_number || "").replace(/\//g, "_")}_-_${data.client_name.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
