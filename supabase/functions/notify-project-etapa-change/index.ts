// Edge Function: notify-project-etapa-change
// Disparada por trigger pg_net quando projects.etapa muda.
// Envia push (e email via Gmail connector) para o mais sênior alocado e o mais sênior do administrativo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");

const ETAPA_LABELS: Record<string, string> = {
  iniciado: "Iniciado",
  minuta: "Minuta",
  assinado: "Assinado",
};

function seniorityRank(role: string | null | undefined): number {
  if (!role) return 0;
  const r = role.toLowerCase();
  if (r.includes("sócio") || r.includes("socio")) return 100;
  if (r.includes("diretor")) {
    if (r.includes("sênior") || r.includes("senior") || r.includes("sr")) return 90;
    if (r.includes("pleno")) return 85;
    if (r.includes("júnior") || r.includes("junior") || r.includes("jr")) return 80;
    return 88;
  }
  if (r.includes("gerente")) return 70;
  if (r.includes("coordenador")) return 60;
  if (r.includes("executivo")) return 55;
  if (r.includes("analista")) {
    if (r.includes("sênior") || r.includes("senior") || r.includes("sr")) return 50;
    if (r.includes("pleno")) return 40;
    if (r.includes("júnior") || r.includes("junior") || r.includes("jr")) return 30;
    return 35;
  }
  if (r.includes("estagi")) {
    if (r.includes("ii") || r.includes("2")) return 15;
    return 10;
  }
  return 0;
}

function pickMostSenior<T extends { role?: string | null }>(members: T[]): T | null {
  if (!members.length) return null;
  return members.reduce((best, m) => (seniorityRank(m.role) > seniorityRank(best.role) ? m : best));
}

function renderTemplate(tpl: string, data: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? "");
}

function base64UrlEncode(str: string): string {
  // Encode UTF-8 -> base64 -> base64url
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail(to: string, subject: string, html: string): string {
  // RFC 2822 — subject precisa estar UTF-8 encoded para acentos
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const msg = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ].join("\r\n");
  return base64UrlEncode(msg);
}

async function sendGmail(to: string, subject: string, html: string): Promise<void> {
  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
    console.warn("Gmail not configured — skipping email to", to);
    return;
  }
  const raw = buildRawEmail(to, subject, html);
  const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`Gmail send failed (${res.status}) to ${to}:`, txt);
  } else {
    console.log("Gmail sent to", to);
  }
}

async function sendPush(user_id: string, title: string, body: string, url: string) {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: { user_id, title, body, url },
    });
  } catch (e) {
    console.error("push fail", user_id, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { project_id, etapa_anterior, etapa_nova } = await req.json();
    if (!project_id || !etapa_nova) {
      return new Response(JSON.stringify({ error: "project_id e etapa_nova obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select(
        "id, title, clients(name), project_allocations(team_members(id, name, role, user_id, corporate_email, is_active))"
      )
      .eq("id", project_id)
      .maybeSingle();
    if (projErr || !project) throw projErr || new Error("projeto não encontrado");

    const allocated = ((project as any).project_allocations || [])
      .map((a: any) => a.team_members)
      .filter((m: any) => m && m.is_active);
    const seniorProject = pickMostSenior(allocated);

    const { data: adminMembers } = await supabase
      .from("team_members")
      .select("id, name, role, user_id, corporate_email")
      .eq("is_active", true)
      .eq("area", "Administrativo");
    const seniorAdmin = pickMostSenior(adminMembers || []);

    const recipients = new Map<string, any>();
    if (seniorProject) recipients.set(seniorProject.id, seniorProject);
    if (seniorAdmin) recipients.set(seniorAdmin.id, seniorAdmin);

    // Carrega template do banco
    const { data: tpl } = await supabase
      .from("notification_email_templates")
      .select("assunto, corpo_html, ativo")
      .eq("key", "project-etapa-change")
      .maybeSingle();

    const projectTitle = (project as any).title;
    const clientName = (project as any).clients?.name || "—";
    const etapaAntLabel = ETAPA_LABELS[etapa_anterior] || etapa_anterior || "—";
    const etapaNovaLabel = ETAPA_LABELS[etapa_nova] || etapa_nova;

    // Push
    const pushTitle = `Projeto mudou de etapa: ${projectTitle}`;
    const pushBody = `${clientName} · ${etapaAntLabel} → ${etapaNovaLabel}`;

    // Resolve emails
    const userIds = [...recipients.values()].map((r) => r.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, email").in("user_id", userIds)
      : { data: [] as any[] };
    const profileEmailByUser = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));

    await Promise.all(
      [...recipients.values()].map(async (m) => {
        if (m.user_id) await sendPush(m.user_id, pushTitle, pushBody, "/projetos");
        const email = m.corporate_email || (m.user_id ? profileEmailByUser.get(m.user_id) : null);
        if (email && tpl && tpl.ativo !== false) {
          const data = {
            destinatario: m.name || "",
            projeto: projectTitle,
            cliente: clientName,
            etapa_anterior: etapaAntLabel,
            etapa_nova: etapaNovaLabel,
          };
          const subject = renderTemplate(tpl.assunto, data);
          const html = renderTemplate(tpl.corpo_html, data);
          await sendGmail(email, subject, html);
        }
      })
    );

    return new Response(
      JSON.stringify({ ok: true, recipients: [...recipients.values()].map((r) => r.name) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
