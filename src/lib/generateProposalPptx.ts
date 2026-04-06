import PptxGenJS from "pptxgenjs";

// Import images as base64-ready URLs (Vite handles this)
import medenLogo from "@/assets/pptx/meden-logo.jpg";
import coverBg1 from "@/assets/pptx/cover-bg-1.jpg";
import coverBg2 from "@/assets/pptx/cover-bg-2.jpg";
import page2Bg from "@/assets/pptx/page2-bg.jpg";
import signature from "@/assets/pptx/signature.jpg";
import sectionDividerBg from "@/assets/pptx/section-divider-bg.jpg";
import finalSlideBg from "@/assets/pptx/final-slide-bg.jpg";

interface Parcela {
  descricao: string;
  valor: number | null;
  data_vencimento: string;
}

export interface ProposalPptxData {
  proposal_number: string;
  title: string;
  client_name: string;
  description: string | null;
  scope: string | null;
  value: number | null;
  parcelas: Parcela[];
  payment_type: string | null;
  data_envio: string | null;
  empresa: string | null;
  tipo_projeto: string | null;
}

const TEAL = "0D7377";
const GOLD = "C4A265";
const DARK_BG = "2D2D2D";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "F5F5F5";

function formatCurrency(v: number | null): string {
  if (v == null) return "A definir";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
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

async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function addFooter(slide: PptxGenJS.Slide, pageNum: number, empresa: string) {
  slide.addShape("rect", { x: 7.8, y: 6.95, w: 2.2, h: 0.3, fill: { color: TEAL } });
  slide.addText(`${empresa.toUpperCase()} PROPOSTA COMERCIAL`, {
    x: 7.85, y: 6.95, w: 1.7, h: 0.3,
    fontSize: 6, color: WHITE, fontFace: "Arial", bold: true, align: "left", valign: "middle",
  });
  slide.addText(`${pageNum}`, {
    x: 9.55, y: 6.95, w: 0.35, h: 0.3,
    fontSize: 8, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle",
  });
}

export async function generateProposalPptx(data: ProposalPptxData) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = data.empresa || "Meden Consultoria";
  pptx.title = `Proposta ${data.proposal_number}`;

  const empresaLabel = data.empresa || "MEDEN";

  // Pre-fetch images as base64
  const [medenLogoB64, coverBg1B64, coverBg2B64, page2BgB64, signatureB64, sectionBgB64, finalBgB64] = await Promise.all([
    fetchImageAsBase64(medenLogo),
    fetchImageAsBase64(coverBg1),
    fetchImageAsBase64(coverBg2),
    fetchImageAsBase64(page2Bg),
    fetchImageAsBase64(signature),
    fetchImageAsBase64(sectionDividerBg),
    fetchImageAsBase64(finalSlideBg),
  ]);

  // ===== SLIDE 1: Cover =====
  const slide1 = pptx.addSlide();
  slide1.addImage({ data: coverBg1B64, x: 0, y: 0, w: 5.5, h: 5.5 });
  slide1.addImage({ data: coverBg2B64, x: 4, y: 0, w: 6, h: 5.5 });
  slide1.addImage({ data: medenLogoB64, x: 0.5, y: 2.5, w: 2.8, h: 1.2 });
  slide1.addShape("rect", { x: 0, y: 5.5, w: 10, h: 2, fill: { color: WHITE } });
  slide1.addText("Proposta Comercial", {
    x: 0.5, y: 5.6, w: 5, h: 0.7,
    fontSize: 28, color: TEAL, fontFace: "Arial",
  });
  slide1.addText(data.proposal_number, {
    x: 0.5, y: 6.2, w: 3, h: 0.4,
    fontSize: 14, color: GOLD, fontFace: "Arial",
  });

  // ===== SLIDE 2: Letter =====
  const slide2 = pptx.addSlide();
  slide2.addImage({ data: page2BgB64, x: 0, y: 0, w: 3.8, h: 7.5 });
  const sendDate = data.data_envio ? formatDate(data.data_envio) : formatDate(new Date().toISOString().split("T")[0]);
  slide2.addText(`${data.client_name}`, {
    x: 4, y: 0.3, w: 5.5, h: 0.5,
    fontSize: 14, color: "333333", fontFace: "Arial",
  });
  slide2.addText(sendDate, {
    x: 4, y: 0.7, w: 5.5, h: 0.4,
    fontSize: 12, color: "666666", fontFace: "Arial",
  });
  slide2.addText("Prezados Senhores,", {
    x: 4, y: 2, w: 5.5, h: 0.4,
    fontSize: 13, color: "333333", fontFace: "Arial",
  });
  slide2.addText(
    "Sentimo-nos honrados com a demonstração de confiança manifestada através do convite recebido de V.Sas. e apresentamos-lhes, com satisfação, nossa proposta para prestação de serviços de avaliação.",
    {
      x: 4, y: 2.5, w: 5.5, h: 1.2,
      fontSize: 12, color: "333333", fontFace: "Arial", lineSpacingMultiple: 1.3,
    }
  );
  slide2.addText("Antônio Luiz Feijó Nicolau - Diretor", {
    x: 4.8, y: 4.2, w: 4, h: 0.3,
    fontSize: 10, color: "333333", fontFace: "Arial", bold: true, align: "center",
  });
  slide2.addText("Meden Consultoria Empresarial Ltda", {
    x: 4.8, y: 4.5, w: 4, h: 0.3,
    fontSize: 10, color: "333333", fontFace: "Arial", align: "center",
  });
  slide2.addImage({ data: signatureB64, x: 5.5, y: 3.5, w: 2, h: 0.8 });
  slide2.addText("MEDEN CONSULTORIA\nRua 1º de Março, 23 – 22º Andar.\nRio de Janeiro CEP: 20010-000\nTel. +55 (21) 2507-3552", {
    x: 4, y: 5.5, w: 5, h: 1.2,
    fontSize: 10, color: "333333", fontFace: "Arial", lineSpacingMultiple: 1.3,
  });
  addFooter(slide2, 2, empresaLabel);

  // ===== SLIDE 3: Section Divider - Entendimento =====
  const slide3 = pptx.addSlide();
  slide3.addImage({ data: sectionBgB64, x: 0, y: 0, w: 13.33, h: 7.5 });
  slide3.addShape("rect", { x: 4.5, y: 2.8, w: 5.5, h: 1.8, fill: { color: "000000" }, rectRadius: 0 });
  slide3.addShape("rect", { x: 4.55, y: 2.85, w: 0.06, h: 1.0, fill: { color: GOLD } });
  slide3.addText("ENTENDIMENTO DA SITUAÇÃO", {
    x: 4.7, y: 2.8, w: 5.2, h: 1.0,
    fontSize: 22, color: WHITE, fontFace: "Arial", bold: true, valign: "middle",
  });
  slide3.addText("ALINHAMENTO DO CONTEXTO ORGANIZACIONAL, OBJETIVOS E DESAFIOS", {
    x: 4.7, y: 3.7, w: 5.2, h: 0.6,
    fontSize: 9, color: "CCCCCC", fontFace: "Arial", valign: "top",
  });

  // ===== SLIDE 4: Entendimento Content =====
  if (data.description) {
    const slide4 = pptx.addSlide();
    slide4.addShape("rect", { x: 0, y: 0, w: 0.08, h: 0.6, fill: { color: GOLD } });
    slide4.addText("ENTENDIMENTO DA SITUAÇÃO", {
      x: 0.15, y: 0.1, w: 5, h: 0.5,
      fontSize: 22, color: TEAL, fontFace: "Arial", bold: true,
    });
    slide4.addText(data.description, {
      x: 0.5, y: 1.0, w: 9, h: 5.5,
      fontSize: 12, color: "333333", fontFace: "Arial", lineSpacingMultiple: 1.5, align: "justify",
    });
    addFooter(slide4, 4, empresaLabel);
  }

  // ===== SLIDE 5: Section Divider - Escopo =====
  const slide5 = pptx.addSlide();
  slide5.addImage({ data: sectionBgB64, x: 0, y: 0, w: 13.33, h: 7.5 });
  slide5.addShape("rect", { x: 4.5, y: 2.8, w: 5.5, h: 1.5, fill: { color: "000000" } });
  slide5.addShape("rect", { x: 4.55, y: 2.85, w: 0.06, h: 0.9, fill: { color: GOLD } });
  slide5.addText("ESCOPO DO PROJETO", {
    x: 4.7, y: 2.8, w: 5.2, h: 1.0,
    fontSize: 22, color: WHITE, fontFace: "Arial", bold: true, valign: "middle",
  });

  // ===== SLIDE 6: Escopo Content =====
  if (data.scope) {
    const slide6 = pptx.addSlide();
    slide6.addShape("rect", { x: 0, y: 0, w: 0.08, h: 0.6, fill: { color: GOLD } });
    slide6.addText("ESCOPO DO PROJETO", {
      x: 0.15, y: 0.1, w: 5, h: 0.5,
      fontSize: 22, color: TEAL, fontFace: "Arial", bold: true,
    });
    slide6.addText(data.scope, {
      x: 0.5, y: 1.0, w: 9, h: 5.5,
      fontSize: 12, color: "333333", fontFace: "Arial", lineSpacingMultiple: 1.5, align: "justify",
    });
    addFooter(slide6, 6, empresaLabel);
  }

  // ===== SLIDE 7: Section Divider - Investimento =====
  const slide7 = pptx.addSlide();
  slide7.addImage({ data: sectionBgB64, x: 0, y: 0, w: 13.33, h: 7.5 });
  slide7.addShape("rect", { x: 4.5, y: 2.8, w: 5.5, h: 1.5, fill: { color: "000000" } });
  slide7.addShape("rect", { x: 4.55, y: 2.85, w: 0.06, h: 0.9, fill: { color: GOLD } });
  slide7.addText("INVESTIMENTO", {
    x: 4.7, y: 2.8, w: 5.2, h: 1.0,
    fontSize: 22, color: WHITE, fontFace: "Arial", bold: true, valign: "middle",
  });

  // ===== SLIDE 8: Investimento Content =====
  const slide8 = pptx.addSlide();
  slide8.addShape("rect", { x: 0, y: 0, w: 0.08, h: 0.6, fill: { color: GOLD } });
  slide8.addText("INVESTIMENTO", {
    x: 0.15, y: 0.1, w: 5, h: 0.5,
    fontSize: 22, color: TEAL, fontFace: "Arial", bold: true,
  });

  const valorStr = formatCurrency(data.value);
  const valorExtenso = data.value ? valorPorExtenso(data.value) : "";

  let investText = `Em função da abrangência dos serviços técnicos e considerando a complexidade do trabalho, o valor para atuação foi orçado em ${valorStr}`;
  if (valorExtenso) investText += ` (${valorExtenso})`;
  investText += " para todo o projeto";

  if (data.parcelas && data.parcelas.length > 0) {
    investText += ", a serem pagos da seguinte forma:";
  } else {
    investText += ".";
  }

  // Teal background block
  slide8.addShape("rect", { x: 0.3, y: 1.2, w: 9.3, h: 4.5, fill: { color: TEAL }, rectRadius: 0.05 });

  slide8.addText(investText, {
    x: 0.6, y: 1.4, w: 8.7, h: 1.2,
    fontSize: 12, color: WHITE, fontFace: "Arial", lineSpacingMultiple: 1.4,
  });

  if (data.parcelas && data.parcelas.length > 0) {
    const parcelaLines = data.parcelas.map((p, i) => {
      const desc = p.descricao || `Parcela ${i + 1}`;
      const val = p.valor ? formatCurrency(p.valor) : "";
      return `• ${desc}${val ? ` - ${val}` : ""}`;
    }).join("\n");

    slide8.addText(parcelaLines, {
      x: 0.6, y: 2.7, w: 8.7, h: 1.5,
      fontSize: 12, color: WHITE, fontFace: "Arial", bold: true, lineSpacingMultiple: 1.5,
    });
  }

  slide8.addText("O valor descrito já inclui os tributos aplicáveis.", {
    x: 0.6, y: 4.2, w: 8.7, h: 0.5,
    fontSize: 11, color: WHITE, fontFace: "Arial", bold: true,
  });

  slide8.addText(
    "As despesas com viagens e hospedagem, se necessárias, deverão ser reembolsadas pela contratante. " +
    "O vencimento da fatura será no 5° dia a partir de sua apresentação. Após o vencimento, serão cobrados " +
    "juros de 1% (um por cento) ao mês sobre o valor líquido da nota fiscal, mais 2% de multa sobre o valor da fatura pelo inadimplemento.",
    {
      x: 0.6, y: 4.6, w: 8.7, h: 1.0,
      fontSize: 10, color: WHITE, fontFace: "Arial", lineSpacingMultiple: 1.3,
    }
  );
  addFooter(slide8, 8, empresaLabel);

  // ===== SLIDE 9: Final =====
  const slideFinal = pptx.addSlide();
  slideFinal.addImage({ data: finalBgB64, x: 0, y: 0, w: 13.33, h: 7.5 });
  slideFinal.addImage({ data: medenLogoB64, x: 3.2, y: 2.2, w: 3.5, h: 1.5 });
  slideFinal.addText("comercial@medenconsultoria.com.br", {
    x: 2.5, y: 4.2, w: 5, h: 0.5,
    fontSize: 12, color: "CCCCCC", fontFace: "Arial", align: "center",
  });

  // Generate filename
  const filename = `Proposta_${data.proposal_number.replace(/\//g, "_")}_-_${data.client_name.replace(/[^a-zA-Z0-9]/g, "_")}`;
  await pptx.writeFile({ fileName: `${filename}.pptx` });
}
