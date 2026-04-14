import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ExternalLink, Check, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CnpjRow {
  id: string;
  nome_cliente: string;
  cnpj_encontrado: string;
  fonte: string;
}

const CSV_DATA: CnpjRow[] = [
  { id: "c3f7039c-6390-4174-97fb-92f2d3f55412", nome_cliente: "30E", cnpj_encontrado: "27.659.347/0001-05", fonte: "https://www.situacaocadastral.info/cnpj/30e-participacoes-e-producoes-artisticas-sa-27659347000105" },
  { id: "95aae6d1-c6d1-4b33-9a67-738065f2cc5a", nome_cliente: "77 Engetec", cnpj_encontrado: "39.858.955/0001-10", fonte: "https://cnpj.biz/39858955000110" },
  { id: "254ac35a-ff6e-491b-8303-38d1de611a89", nome_cliente: "A&M", cnpj_encontrado: "33.857.726/0001-02", fonte: "https://en.wikipedia.org/wiki/AMC_Pacer" },
  { id: "6fa19f04-d71c-4942-b43c-f35d55159955", nome_cliente: "ABE", cnpj_encontrado: "07.416.976/0001-99", fonte: "https://en.wikipedia.org/wiki/Abena_Joan_Brown" },
  { id: "15494b0f-a52f-4286-ad3f-e2ab21fa8be9", nome_cliente: "AC Lobato", cnpj_encontrado: "30.018.089/0001-84", fonte: "https://www.consultasocio.com/q/sa/ac-lobato-ltda" },
  { id: "6b2eb665-e9c9-4169-ab6c-8de20d2c0f68", nome_cliente: "ACP", cnpj_encontrado: "65.018.154/0001-56", fonte: "https://cnpj.biz/65018154000156" },
  { id: "e35fe060-8fd4-44b5-8283-3d85a078ec0c", nome_cliente: "AG", cnpj_encontrado: "46.438.442/0001-15", fonte: "https://en.wikipedia.org/wiki/Mohamed_Ag_Najem" },
  { id: "30233ed9-5312-4124-a26a-d9b43e224898", nome_cliente: "AL Empreendimentos", cnpj_encontrado: "53.262.132/0001-58", fonte: "https://www.econodata.com.br/consulta-empresa/53262132000158-al-empreendimentos-imobiliarios-ltda" },
  { id: "ec7c819a-ba4d-42fe-ab66-9e1f0320411d", nome_cliente: "ALBA", cnpj_encontrado: "14.674.337/0001-99", fonte: "https://en.wikipedia.org/wiki/Albania" },
  { id: "2d059177-aefe-4d5d-9928-6dda9472cbae", nome_cliente: "AMH", cnpj_encontrado: "09.209.051/0001-00", fonte: "https://en.wikipedia.org/wiki/Am_Harp_J" },
  { id: "effb48b9-8d33-44cf-b95c-b58381d7521e", nome_cliente: "ASP", cnpj_encontrado: "50.178.774/0001-85", fonte: "https://en.wikipedia.org/wiki/Aspen/Pitkin_County_Airport" },
  { id: "55564982-f71d-4605-96e8-b0618d1f597f", nome_cliente: "ATTO", cnpj_encontrado: "54.238.619/0001-68", fonte: "https://en.wikipedia.org/wiki/Attock_Petroleum_Limited" },
  { id: "190dbe4d-bbb7-423c-80b6-6667b6d914cb", nome_cliente: "AXS", cnpj_encontrado: "21.363.777/0001-90", fonte: "https://www.nacionalconsultas.com.br/cnpj/axs-tecnologia-da-informacao-ltda-21363777000190" },
  { id: "eb26d672-0b6d-41d7-b7a4-7047edc9f5fb", nome_cliente: "AZ Quest", cnpj_encontrado: "47.155.842/0001-86", fonte: "https://www.econodata.com.br/consulta-empresa/36499625000197-az-quest-bayes-long-biased-sistematico-fundo-de-investimento-multimercado" },
  { id: "920438ae-ad3e-4fdd-a370-b8b65f07117c", nome_cliente: "AZUL", cnpj_encontrado: "09.305.994/0001-29", fonte: "https://www.informecadastral.com.br/cnpj/azul-linhas-aereas-brasileiras-sa-09296295003509" },
  { id: "04ec8887-71b8-4cb4-ab28-2d0ce677d572", nome_cliente: "Abril", cnpj_encontrado: "02.183.757/0001-93", fonte: "https://cnpj.biz/02183757000193" },
  { id: "ae824b55-3074-4046-a311-7ee2cd8dffcb", nome_cliente: "Accioly", cnpj_encontrado: "60.892.858/0001-30", fonte: "https://cnpj.today/60892858000130" },
  { id: "079b0634-7784-4bd7-852b-a3b224b25e4c", nome_cliente: "Acosta ADV", cnpj_encontrado: "31.618.719/0001-14", fonte: "https://cnpja.com/office/31618719000114" },
  { id: "1b5f4d3f-fd3f-4dbb-8c57-2b9d88ab35fc", nome_cliente: "Acrisure", cnpj_encontrado: "55.904.612/0001-09", fonte: "https://advdinamico.com.br/empresas/55904612000109" },
  { id: "68424c35-2e61-48d3-88db-213c78716bdd", nome_cliente: "Adsum", cnpj_encontrado: "27.397.040/0001-75", fonte: "https://cnpj.biz/27397040000175" },
  { id: "7da93983-0d57-45f2-ac53-cdf2fa2c1a1e", nome_cliente: "Adufort", cnpj_encontrado: "17.720.975/0003-59", fonte: "https://brasilapifacil.com.br/cnpj/17720975000359-minerofertil-industria-e-comercio-de-fertilizantes-ltda" },
  { id: "5adf753c-b5de-4edf-a96a-f09aeaaa0a11", nome_cliente: "Advent", cnpj_encontrado: "07.073.048/0001-79", fonte: "https://www.situacaocadastral.info/cnpj/advent-do-brasil-consultoria-e-participacoes-ltda-07073048000179" },
  { id: "478c56e9-99de-4230-8470-bc3b73127c76", nome_cliente: "Advising", cnpj_encontrado: "37.886.988/0001-48", fonte: "https://cnpj.biz/37886988000148" },
  { id: "677aa403-29dc-4541-b5cd-e659b965deaa", nome_cliente: "Agilitá", cnpj_encontrado: "00.974.843/0001-99", fonte: "https://imobisec.com.br/imobiliarias/4ffd201b/imobiliaria-agilita-ltda" },
  { id: "9192d8a1-49b8-4565-8a3e-aa619271af92", nome_cliente: "AgroGalaxy", cnpj_encontrado: "21.240.146/0001-84", fonte: "https://api.mziq.com/mzfilemanager/v2/d/4594750a-94b7-4fcb-bbbc-514e4d1295e3/5b160723-0795-3be7-7347-a285248f4d9b" },
  { id: "4ab42ca8-c115-4767-a317-16f822edf9aa", nome_cliente: "Agrotech", cnpj_encontrado: "43.677.347/0001-86", fonte: "https://dataluz.com.br/empresa/43677347000186" },
  { id: "72e94a62-8dab-4b36-8531-cd0b2bcad702", nome_cliente: "Aguila Capital", cnpj_encontrado: "53.036.046/0001-27", fonte: "https://www.anbima.com.br/pt_br/institucional/perfil-da-instituicao/instituicao/178effd8-3e5f-427b-e053-ca42e10a0dd1/perfil/aguila-capital-administracao-e-gestao-de-capitais-ltda.htm" },
  { id: "887ee2c3-7aca-4758-9e2e-fa37f228b05f", nome_cliente: "Alares", cnpj_encontrado: "07.054.341/0001-99", fonte: "https://www.econodata.com.br/consulta-empresa/63356042003448-videomar-rede-nordeste-sa" },
  { id: "1d271a22-17c1-4a1c-afc0-13f6718b0e4a", nome_cliente: "Alfama", cnpj_encontrado: "74.386.731/0001-53", fonte: "https://consultacnpj.com/cnpj/alfama-construtora-ltda-alfama-74386731000153" },
  { id: "d8fc53ca-e624-4c1d-a2f2-9f2f2d0fe649", nome_cliente: "Aliance", cnpj_encontrado: "66.829.581/0001-87", fonte: "https://www.consultascnpj.com/aliance-viagens-e-turismo-ltda/66829581000187" },
  { id: "38ed307f-680a-4158-babe-631e403f5cd5", nome_cliente: "Alliança", cnpj_encontrado: "21.180.163/0001-73", fonte: "https://api.mziq.com/mzfilemanager/v2/d/4e857772-7615-4690-987f-a5c66ff7dee4/6ad100ae-09dd-25f0-7fa9-dd9082b29afd?origin=1" },
  { id: "1a106cf0-e6d8-419a-90c2-5016ca05accb", nome_cliente: "Alliar", cnpj_encontrado: "42.771.949/0001-35", fonte: "https://www.infomoney.com.br/cotacoes/b3/acao/alliar-aalr3/" },
  { id: "3e7655d4-1880-409d-a1aa-3db24665d7fb", nome_cliente: "Allos", cnpj_encontrado: "40.454.635/0001-83", fonte: "https://www.econodata.com.br/consulta-empresa/40454635000183-allos-embalagens-ltda" },
  { id: "da57f768-53fe-40c4-9cbb-eb0a85d49b5b", nome_cliente: "Alumni", cnpj_encontrado: "07.397.838/0001-00", fonte: "https://dataluz.com.br/empresa/07397838000100" },
  { id: "21924f2b-c23a-4cdf-8d1b-f943fa58b878", nome_cliente: "Alupar", cnpj_encontrado: "08.364.948/0001-38", fonte: "https://monitorcnpj.com.br/cnpj/08364948000138/" },
  { id: "5ee7641a-0cf4-4f29-b98f-58c2074741fd", nome_cliente: "Amandio Rocha", cnpj_encontrado: "92.791.292/0001-46", fonte: "https://cnpja.com/office/92791292000146" },
  { id: "8975a999-190e-4762-97e6-44364206307f", nome_cliente: "Amaril Franklin", cnpj_encontrado: "25.324.591/0001-83", fonte: "https://www.amarilfranklin.com.br/" },
  { id: "487fea72-9393-4002-b143-19f92ba173ed", nome_cliente: "Ambio", cnpj_encontrado: "34.516.120/0001-68", fonte: "https://cnpj.today/34516120000168" },
  { id: "a07748b9-69ea-42f7-a268-2502bb518da9", nome_cliente: "Ambipar", cnpj_encontrado: "12.648.266/0001-24", fonte: "https://monitorcnpj.com.br/cnpj/12648266000124/" },
  { id: "46886fc4-6545-4bdf-865d-e859f81cc756", nome_cliente: "Amcor", cnpj_encontrado: "43.497.661/0001-87", fonte: "https://consultacnpj.com/cnpj/amcor-participacoes-sa-amcor-43497661000187" },
  { id: "e7dec76c-3030-42d7-8e23-b899b7a7861a", nome_cliente: "Americanas", cnpj_encontrado: "33.014.556/0001-96", fonte: "https://en.wikipedia.org/wiki/American_Assn_for_Justice" },
  { id: "dc8d589f-a7be-4b46-a8d0-796dc2e81751", nome_cliente: "Ana Flavia Cunha", cnpj_encontrado: "21.382.458/0001-22", fonte: "https://br.linkedin.com/in/ana-flávia-cunha-b49710235" },
  { id: "fdf481aa-cc43-444d-9bc1-a355c7abe1be", nome_cliente: "Andre Ventura", cnpj_encontrado: "65.026.641/0001-60", fonte: "https://mestregeo.com.br/cnpj/sc/blumenau/tainan-andre-ventura-65026641000160" },
  { id: "02df3515-c132-463b-9047-7e599ce37f84", nome_cliente: "Angra Partners", cnpj_encontrado: "18.159.115/0001-99", fonte: "https://www.angrapartners.com.br/" },
  { id: "afbe5ca8-a0cf-40a3-87cd-6cd39574be4d", nome_cliente: "Anima", cnpj_encontrado: "04.088.709/0001-41", fonte: "https://en.wikipedia.org/wiki/Animal_NPCs" },
  { id: "053a2fdd-0a06-4e9a-a077-0e9c14ee083b", nome_cliente: "Aprigio", cnpj_encontrado: "47.550.166/0001-45", fonte: "https://www.efirma.com.br/empresas/pr/nova-londrina/aprigio-transporte-e-servicos-de-movimentacao-de-cargas" },
  { id: "b93bcd52-440b-4f7c-a9a6-d8230d6f9c1a", nome_cliente: "Arado", cnpj_encontrado: "62.318.453/0001-18", fonte: "https://consultacnpj.com/cnpj/arado-ltda-arado-40875693000776" },
  { id: "9039de30-262d-4af7-8ae3-e2700af36ac8", nome_cliente: "Arendt", cnpj_encontrado: "18.623.834/0001-19", fonte: "https://www.consultascnpj.com/marcos-alberto-arendt/18623834000119" },
  { id: "adbbc74a-f46c-4751-a673-5f2d71e394a0", nome_cliente: "Argucia", cnpj_encontrado: "07.670.115/0001-32", fonte: "https://gorila.com.br/produtos-de-investimento/fundos/argucia-income-fia-bdr-nivel-i" },
  { id: "433fa8f7-0d93-4116-a7fe-7cb5a9d18f5c", nome_cliente: "Asmigo", cnpj_encontrado: "25.132.972/0001-60", fonte: "https://www.sneps.com.br/empresa/centro-dico-hospitalar-asmigo-santa-genoveva-goiania-go-25132972000160" },
  { id: "c6831fd5-a269-4533-a420-a34e2260da99", nome_cliente: "Atelier dos Sabores", cnpj_encontrado: "23.825.625/0001-98", fonte: "https://cnpj.today/23825625000198" },
  { id: "eee43d29-c529-4bbb-a92a-fb2cc16117d1", nome_cliente: "Atrium", cnpj_encontrado: "42.147.172/0001-32", fonte: "https://www.econodata.com.br/consulta-empresa/42147172000132-atrium-centro-de-condicionamento-fisico-ltda" },
  { id: "0508d9df-caaa-4821-869e-8fe85783fb36", nome_cliente: "Austral", cnpj_encontrado: "41.665.665/0001-00", fonte: "https://www.econodata.com.br/consulta-empresa/41665665000100-austral" },
  { id: "1d948e7d-71a0-4272-a9ed-b0d7fe225bc3", nome_cliente: "Aço Cearense", cnpj_encontrado: "00.990.842/0001-38", fonte: "https://www.econodata.com.br/consulta-empresa/00990842000138-aco-cearense-industrial-ltda" },
  { id: "1c14fb64-6152-4a2a-adf0-57d6f81c074b", nome_cliente: "B&F", cnpj_encontrado: "55.944.415/0001-05", fonte: "https://en.wikipedia.org/wiki/BFC_Preussen" },
  { id: "964b7a01-3e89-46cd-a5d1-061689d7ce38", nome_cliente: "BAIT", cnpj_encontrado: "26.587.440/0001-80", fonte: "https://casadosdados.com.br/solucao/cnpj/bait-administracao-de-bens-ltda-58131399000120" },
  { id: "75c2d8fd-870a-41f4-a025-7a151d9e9c66", nome_cliente: "BAP", cnpj_encontrado: "24.463.200/0001-49", fonte: "https://en.wikipedia.org/wiki/BAP_Capitán_Quiñones" },
  { id: "bdc316e8-756e-4a0f-bb7e-4c08b904a551", nome_cliente: "BDF", cnpj_encontrado: "58.059.555/0001-99", fonte: "https://www.econodata.com.br/consulta-empresa/58059555000199-brazil-drilling-fluids-ltda" },
  { id: "6b71df65-1757-4b05-8dc4-c9ec5b0fb704", nome_cliente: "BFFC", cnpj_encontrado: "26.315.037/0001-00", fonte: "https://consultacnpj.com/cnpj/bffc-franchising-e-participacoes-ltda-26315037000100" },
  { id: "5a5e9da4-095b-44e4-9617-3a93a4781ac0", nome_cliente: "BFR", cnpj_encontrado: "60.116.368/0001-41", fonte: "https://mestregeo.com.br/cnpj/mg/itaobim/bfr-60116368000141" },
  { id: "b76dc10e-73bf-441c-8a0a-813f9f7b9cf3", nome_cliente: "BHAN", cnpj_encontrado: "74.230.988/0001-11", fonte: "https://brazilguide.net/c/lemos-da-costa-hidraulica-e-acabamentos-ltda-74230988000111" },
  { id: "79210aed-a235-43fc-9722-83babb3063de", nome_cliente: "BMA", cnpj_encontrado: "10.434.089/0001-58", fonte: "https://en.wikipedia.org/wiki/BMA_Cup" },
  { id: "bc99aa3a-cbca-4509-94ce-88539d2ead3b", nome_cliente: "BR Malls", cnpj_encontrado: "06.977.745/0001-91", fonte: "https://www.consultascnpj.com/br-malls-participacoes-sa/06977745000191" },
  { id: "29bb91bc-6083-4ce0-be60-062afa3c894c", nome_cliente: "BR Marinas", cnpj_encontrado: "14.841.323/0001-12", fonte: "https://www.consultascnpj.com/br-marinas-sa/14841323000112" },
  { id: "6847d6b4-790e-448c-a8c3-6cc92fb5cd15", nome_cliente: "BRDU", cnpj_encontrado: "58.365.767/0001-02", fonte: "https://en.wikipedia.org/wiki/Bruce_P._Jackson" },
  { id: "41ebcdd1-d635-497a-8f30-9094abf33612", nome_cliente: "BTG", cnpj_encontrado: "19.384.408/0001-32", fonte: "https://www.nacionalconsultas.com.br/cnpj/btg-pactual-propertyco-ii-llc-banco-btg-pactual-sa-19384408000132" },
  { id: "b5441b76-02cd-4a88-9dc5-d2fa0bacf982", nome_cliente: "Baerlocher", cnpj_encontrado: "43.821.164/0002-73", fonte: "https://empresadois.com.br/cnpj/baerlocher-do-brasil-sa-43821164000273" },
  { id: "af01d980-f163-4883-961d-902212659b97", nome_cliente: "Bagaggio", cnpj_encontrado: "41.775.139/0001-94", fonte: "https://dataluz.com.br/empresa/41775139000194" },
  { id: "a5719eab-18e6-44d5-ace8-4cbc34b7e0cc", nome_cliente: "Banco Inter", cnpj_encontrado: "22.177.858/0001-69", fonte: "https://inter.co/politica-de-privacidade/privacidade/" },
  { id: "be9b0f3c-54de-4646-ba8f-a8ec3f55b20b", nome_cliente: "Banco Pan", cnpj_encontrado: "59.285.411/0001-13", fonte: "https://monitorcnpj.com.br/cnpj/59285411000113/" },
  { id: "e032bbe4-8a0d-4625-9429-809da872bf93", nome_cliente: "Bem Promotora", cnpj_encontrado: "10.397.031/0066-27", fonte: "https://www.bemconsignado.com.br/" },
  { id: "71c3ab78-cc1a-4563-9641-0b865dda8322", nome_cliente: "Bemisa", cnpj_encontrado: "08.720.614/0001-50", fonte: "https://www.sneps.com.br/empresa/bemisa-holding-s-a-centro-rio-de-janeiro-rj-08720614000150" },
  { id: "773126f0-2236-453d-90c7-cd17564f7e17", nome_cliente: "Beontag", cnpj_encontrado: "44.589.553/0001-05", fonte: "https://www.sneps.com.br/empresa/beontag-georgetown-exterior-ex-44589553000105" },
  { id: "cdeca148-11d8-4bc2-a8bb-4240a90a416b", nome_cliente: "Betunel", cnpj_encontrado: "43.998.509/0001-88", fonte: "https://www.econodata.com.br/consulta-empresa/43998509002636-agae-transportes-e-comercio-sa" },
  { id: "aee2335b-12c1-40a1-83d7-a458b21682ed", nome_cliente: "Biomerieux", cnpj_encontrado: "33.040.635/0001-71", fonte: "https://brasilapifacil.com.br/cnpj/33040635000171-biomerieux-brasil-industria-e-comercio-de-produtos-laboratoriais-ltda" },
  { id: "9004edcb-82f5-468d-bac7-6d51612784fb", nome_cliente: "Blaspint", cnpj_encontrado: "02.460.761/0001-51", fonte: "https://www.blaspint.com.br/" },
  { id: "84ce365e-0e2f-4441-a05a-d157404cdeca", nome_cliente: "Blue Ocean", cnpj_encontrado: "58.459.867/0001-90", fonte: "https://www.econodata.com.br/consulta-empresa/58459867000190-blue-ocean-ltda" },
  { id: "107cd144-72c2-4c7e-81ca-f98533086b12", nome_cliente: "Boavista", cnpj_encontrado: "03.735.449/0001-96", fonte: "https://en.wikipedia.org/wiki/Boa_Vista,_Cape_Verde" },
  { id: "cd3026e3-ca3d-40d3-a3cb-b3b22abcec60", nome_cliente: "Botelho Arruda", cnpj_encontrado: "23.392.518/0001-13", fonte: "https://mestregeo.com.br/cnpj/sp/jau/arruda-botelho-52170602000190" },
  { id: "06cb4c3b-76d2-407e-9041-3569b092b030", nome_cliente: "Bourbon", cnpj_encontrado: "48.040.036/0001-25", fonte: "https://en.wikipedia.org/wiki/Bourbon-Anjou" },
  { id: "b3efec8b-612b-42a2-abdf-6fe1691537b6", nome_cliente: "Brasilseg", cnpj_encontrado: "28.196.889/0001-43", fonte: "https://cnpj.biz/28196889000143" },
  { id: "c91547c4-2e0f-49f4-932b-ee5a74cd01f6", nome_cliente: "Brinox", cnpj_encontrado: "54.039.569/0001-90", fonte: "https://www.brinox.com.br/institucional/brinox" },
  { id: "3c805292-d22e-4bd7-9d66-a04955072d85", nome_cliente: "Brookfield", cnpj_encontrado: "24.880.299/0001-84", fonte: "https://en.wikipedia.org/wiki/Brookfield_(CDP),_Massachusetts" },
  { id: "80eb0ca9-bfb2-4cb4-b956-11293eddf4d7", nome_cliente: "C&V", cnpj_encontrado: "92.815.141/0001-80", fonte: "https://en.wikipedia.org/wiki/Cven,_Ljutomer" },
  { id: "0b2c38b0-3fa3-455b-bcfb-5dad40f5b314", nome_cliente: "C2rio", cnpj_encontrado: "05.873.416/0001-38", fonte: "https://c2rio.travel/en/" },
  { id: "e80f4aff-414e-41a5-a7c4-73bc0f7e23d4", nome_cliente: "CAV", cnpj_encontrado: "56.507.148/0001-71", fonte: "https://en.wikipedia.org/wiki/Jeff_Cavins" },
  { id: "1b33091d-ae1a-4120-ab1d-c3039161333d", nome_cliente: "CBA", cnpj_encontrado: "16.458.881/0001-29", fonte: "https://en.wikipedia.org/wiki/A._C._Baantjer" },
  { id: "b974795f-c20d-4380-a2af-eca182467121", nome_cliente: "CBC", cnpj_encontrado: "00.021.532/0001-05", fonte: "https://www.gov.br/esporte/pt-br/servicos/editais/arquivos/arquivos-certificacoes-18-e-18-a/certificacoes/confederacao-brasileira-de-ciclismo-cbc.pdf" },
  { id: "91d4d304-cbd1-4e8d-9e5f-c8c9a1558ebf", nome_cliente: "CBCA", cnpj_encontrado: "02.533.902/0001-19", fonte: "https://cnpj.today/92893155002751" },
  { id: "ae0d7ebf-159a-4e50-a212-cc46b290568b", nome_cliente: "CCAB", cnpj_encontrado: "24.128.852/0001-27", fonte: "https://www.econodata.com.br/consulta-empresa/24128852000127-centro-de-cultura-afro-brasileira" },
  { id: "f00a1127-4802-4b8d-aa52-f61d8833fa64", nome_cliente: "CDI", cnpj_encontrado: "03.665.793/0001-56", fonte: "https://en.wikipedia.org/wiki/CD_Injerto" },
  { id: "48086fc3-59ed-46d1-a7c7-bf6a77d15a74", nome_cliente: "CFL", cnpj_encontrado: "06.258.298/0001-10", fonte: "https://www.econodata.com.br/consulta-empresa/06258298000110-centro-de-formacao-de-lideres" },
  { id: "e382f2b3-63f4-46ab-9495-95a698ecc349", nome_cliente: "CIEM", cnpj_encontrado: "15.231.006/0001-47", fonte: "https://www.consultascnpj.com/centro-integrado-de-educacao-e-missoes-ciem/34051839000251" },
  { id: "093f3348-cb53-4b26-a5cf-6d7aa3e51dda", nome_cliente: "CMA", cnpj_encontrado: "01.111.971/0001-71", fonte: "https://en.wikipedia.org/wiki/CMA_CGM_Jacques_Saadé" },
  { id: "21f88650-d78a-4bb4-87f6-4c4ce2b68716", nome_cliente: "CMBA", cnpj_encontrado: "03.438.341/0001-31", fonte: "https://cmba.ead.guru/contato/" },
  { id: "441cdbfa-d2fa-4a15-b898-97961d55c5ef", nome_cliente: "CMMM", cnpj_encontrado: "11.999.642/0001-62", fonte: "https://cnpj.today/11999642000162" },
  { id: "63947726-a4d2-4573-b449-8998fd708a85", nome_cliente: "Cacique", cnpj_encontrado: "26.513.668/0001-26", fonte: "https://www.econodata.com.br/consulta-empresa/12166963000572-cacique-sa-comercio-importacao-e-exportacao" },
  { id: "8d1eb910-6e44-4847-897f-8f7ebfaf18ea", nome_cliente: "Calper", cnpj_encontrado: "01.744.834/0001-74", fonte: "https://cnpj.today/01744834000174" },
  { id: "fd5a4598-b0ce-4326-b256-06ed780add29", nome_cliente: "Capital Semente", cnpj_encontrado: "18.313.996/0001-50", fonte: "https://pt.wikipedia.org/wiki/Capital_semente" },
  { id: "f2bf4832-27a5-445a-bcf3-0cc386286f68", nome_cliente: "Capuri", cnpj_encontrado: "16.407.892/0008-56", fonte: "https://consultacnpj.com/cnpj/capuri-sa-16407892000856" },
  { id: "426710c4-f69d-4db3-ad7a-2b22c452f253", nome_cliente: "Caraiba Sementes", cnpj_encontrado: "07.842.947/0001-99", fonte: "https://cnpj.today/07842947000199" },
  { id: "8a5fa439-b6ac-4944-b71b-e6db5390da9f", nome_cliente: "Cargill", cnpj_encontrado: "65.074.841/0001-99", fonte: "https://cnpjcheck.com.br/empresa/cargill-agricola-s-a-cargill-60498706019508" },
  { id: "8259e252-861c-41bc-b3a6-2c8bda890e7e", nome_cliente: "Carmel", cnpj_encontrado: "59.387.026/0001-87", fonte: "https://en.wikipedia.org/wiki/Carmel_(CDP),_New_York" },
  { id: "0c2dcada-25ff-452b-8bde-dde86ecda4c9", nome_cliente: "Casas Pedro", cnpj_encontrado: "13.594.751/0075-61", fonte: "https://cnpj.today/13594751007561" },
  { id: "12aa7921-9fd1-47cf-ad89-4e36895f679e", nome_cliente: "Cencosud", cnpj_encontrado: "39.346.861/0001-61", fonte: "https://casadosdados.com.br/solucao/cnpj/cencosud-brasil-comercial-sa-39346861000161" },
  { id: "8911782b-b0e7-430f-bfbc-7033db5b2b2d", nome_cliente: "Cenof", cnpj_encontrado: "11.454.014/0001-00", fonte: "https://www.sneps.com.br/empresa/cenof-boa-viagem-recife-pe-11454014000100" },
  { id: "e5deca09-9411-47e3-99b2-3abda00125a1", nome_cliente: "Cenze", cnpj_encontrado: "15.447.568/0001-22", fonte: "https://cnpja.com/office/15447568000122" },
  { id: "e2e7dd43-6c73-4bfc-a893-8e5cfc09b86e", nome_cliente: "Certisign", cnpj_encontrado: "01.554.285/0001-75", fonte: "https://certisign.com.br/certificados/e-cnpj" },
  { id: "82a30517-4e03-4217-9a08-0d1ecc7bff12", nome_cliente: "Chemica", cnpj_encontrado: "34.237.043/0001-07", fonte: "https://www.youtube.com/watch?v=B7mx5khj3wA" },
  { id: "e09d399b-35e2-4f4c-9929-e219d6b7abd2", nome_cliente: "Cia do Jeans", cnpj_encontrado: "01.792.629/0001-84", fonte: "https://www.econodata.com.br/consulta-empresa/01792629000184-s-a-s-confeccoes-ltda" },
  { id: "a8400324-0b0a-4135-8723-3556bd1f906c", nome_cliente: "Cinque", cnpj_encontrado: "22.914.319/0001-65", fonte: "https://www.econodata.com.br/consulta-empresa/22914319000165-cinque-terre-ltda" },
  { id: "1bef3463-71fa-447c-8f16-df11ff8fa505", nome_cliente: "Claro", cnpj_encontrado: "40.432.544/0001-47", fonte: "https://cnpjcheck.com.br/empresa/claro-s-a-claro-40432544000147" },
  { id: "612c2339-4c4f-428d-a1f1-1006198f1928", nome_cliente: "Clear Sale", cnpj_encontrado: "03.802.115/0001-98", fonte: "https://monitorcnpj.com.br/cnpj/03802115000279/" },
  { id: "cb116a9a-7141-4390-bdac-9e0e38b5609d", nome_cliente: "Clinica Viver", cnpj_encontrado: "14.405.735/0001-00", fonte: "https://clinicaviver.com/contato/?convenio=Exames+de+Imagem+HFA&exame=US+APARELHO+URINÁRIO+(RINS,URETERES+E+BEXIGA)&codigo=40901769" },
  { id: "a0485615-54c9-4872-8ad8-348051ed3a26", nome_cliente: "Colombo", cnpj_encontrado: "51.253.181/0001-07", fonte: "https://en.wikipedia.org/wiki/Colombo_Cup_1953" },
  { id: "4837dedd-e7c3-45bc-9ad1-e5b929f89067", nome_cliente: "Compacta", cnpj_encontrado: "49.740.087/0001-22", fonte: "https://en.wikipedia.org/wiki/Compacta_capitalis" },
  { id: "ceb1936b-3eb7-4672-a535-2fb7eaaec076", nome_cliente: "Comrades", cnpj_encontrado: "43.688.354/0001-83", fonte: "https://cnpj.biz/43688354000183" },
  { id: "995379bd-25ae-45ab-a698-df394252d3b4", nome_cliente: "Conag", cnpj_encontrado: "04.627.824/0001-47", fonte: "https://linktr.ee/conag" },
  { id: "48e757cc-f9f8-4b4d-a985-3ad62cd93c9f", nome_cliente: "Concer", cnpj_encontrado: "18.840.767/0001-94", fonte: "https://en.wikipedia.org/wiki/Concern_Podolsk" },
  { id: "cb34c3b4-702d-4cef-8aff-14820d6ba80b", nome_cliente: "Condor", cnpj_encontrado: "86.046.448/0001-61", fonte: "https://en.wikipedia.org/wiki/Condorcet\'s_jury_theorem" },
  { id: "7c07db49-965f-4d8e-b460-f519b4040e15", nome_cliente: "Conexa", cnpj_encontrado: "10.801.537/0001-04", fonte: "https://cnpj.today/10801537000104" },
  { id: "8be6196a-9def-4791-8397-bf8a1bc38db7", nome_cliente: "Confiança", cnpj_encontrado: "22.175.369/0001-78", fonte: "https://fidcs.com.br/fundo/22175369000178" },
  { id: "0b3fc633-2f07-4dcd-baeb-0cfd392ba91b", nome_cliente: "Conforto", cnpj_encontrado: "27.285.639/0001-17", fonte: "https://cnpj.today/27285639000117" },
  { id: "0cc5ccc6-abff-4fa4-abe9-b2787d648ca1", nome_cliente: "Consentini", cnpj_encontrado: "71.433.874/0001-80", fonte: "https://www.econodata.com.br/consulta-empresa/57417748000292-fortaleza-consentini-investimentos-e-participacoes-ltda" },
  { id: "ba7652d9-2645-4fc0-81fc-ce688c533937", nome_cliente: "Contek", cnpj_encontrado: "27.183.425/0001-30", fonte: "https://www.informecadastral.com.br/cnpj/contek-engenharia-sa-27183425000130" }
];

const CnpjReview = () => {
  const { toast } = useToast();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const filtered = useMemo(() => {
    let items: CnpjRow[] = CSV_DATA;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => r.nome_cliente.toLowerCase().includes(q) || r.cnpj_encontrado.includes(q));
    }
    if (filter === "approved") items = items.filter(r => approved.has(r.id));
    if (filter === "rejected") items = items.filter(r => rejected.has(r.id));
    if (filter === "pending") items = items.filter(r => !approved.has(r.id) && !rejected.has(r.id));
    return items;
  }, [search, filter, approved, rejected]);

  const toggleApprove = (id: string) => {
    setApproved(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else {
        next.add(id);
        setRejected(r => { const nr = new Set(r); nr.delete(id); return nr; });
      }
      return next;
    });
  };

  const toggleReject = (id: string) => {
    setRejected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else {
        next.add(id);
        setApproved(a => { const na = new Set(a); na.delete(id); return na; });
      }
      return next;
    });
  };

  const approveAllVisible = () => {
    setApproved(prev => {
      const next = new Set(prev);
      filtered.forEach(r => next.add(r.id));
      return next;
    });
    setRejected(prev => {
      const next = new Set(prev);
      filtered.forEach(r => next.delete(r.id));
      return next;
    });
  };

  const rejectAllVisible = () => {
    setRejected(prev => {
      const next = new Set(prev);
      filtered.forEach(r => next.add(r.id));
      return next;
    });
    setApproved(prev => {
      const next = new Set(prev);
      filtered.forEach(r => next.delete(r.id));
      return next;
    });
  };

  const handleSave = async () => {
    if (approved.size === 0) {
      toast({ title: "Nenhum CNPJ aprovado", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const approvedRows = CSV_DATA.filter(r => approved.has(r.id));
      let success = 0;
      for (const row of approvedRows) {
        const { error } = await supabase
          .from("clients")
          .update({ cnpj: row.cnpj_encontrado.replace(/\D/g, "") })
          .eq("id", row.id);
        if (!error) success++;
      }
      toast({ title: `${success} CNPJs gravados com sucesso` });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isWikipedia = (url: string) => url.includes("wikipedia.org");

  const getSafeDomain = (url: string) => {
    try { return new URL(url).hostname; } catch { return url.slice(0, 40); }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Revisão de CNPJs</h1>
          <p className="text-muted-foreground text-sm">
            {CSV_DATA.length} encontrados · <span className="text-green-600">{approved.size} aprovados</span> · <span className="text-red-500">{rejected.size} rejeitados</span> · {CSV_DATA.length - approved.size - rejected.size} pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={approveAllVisible}>
            <Check className="h-4 w-4 mr-1" /> Aprovar visíveis
          </Button>
          <Button variant="outline" size="sm" onClick={rejectAllVisible}>
            <X className="h-4 w-4 mr-1" /> Rejeitar visíveis
          </Button>
          <Button onClick={handleSave} disabled={saving || approved.size === 0} size="sm">
            {saving ? "Salvando..." : `Gravar ${approved.size} aprovados`}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {{all: "Todos", pending: "Pendentes", approved: "Aprovados", rejected: "Rejeitados"}[f]}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium w-10">✓</th>
                  <th className="p-3 text-left font-medium">Cliente</th>
                  <th className="p-3 text-left font-medium">CNPJ Encontrado</th>
                  <th className="p-3 text-left font-medium">Fonte</th>
                  <th className="p-3 text-center font-medium w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const isApproved = approved.has(row.id);
                  const isRejected = rejected.has(row.id);
                  const suspicious = isWikipedia(row.fonte);
                  return (
                    <tr key={row.id} className={`border-b transition-colors ${isApproved ? "bg-green-50 dark:bg-green-950/20" : isRejected ? "bg-red-50 dark:bg-red-950/20 opacity-60" : ""}`}>
                      <td className="p-3"><Checkbox checked={isApproved} onCheckedChange={() => toggleApprove(row.id)} /></td>
                      <td className="p-3 font-medium">{row.nome_cliente}</td>
                      <td className="p-3 font-mono text-xs">
                        {row.cnpj_encontrado}
                        {suspicious && <Badge variant="destructive" className="ml-2 text-[10px]">⚠ Wikipedia</Badge>}
                      </td>
                      <td className="p-3">
                        <a href={row.fonte} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 max-w-[300px] truncate">
                          {getSafeDomain(row.fonte)}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant={isApproved ? "default" : "ghost"} className="h-7 w-7" onClick={() => toggleApprove(row.id)}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant={isRejected ? "destructive" : "ghost"} className="h-7 w-7" onClick={() => toggleReject(row.id)}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CnpjReview;
