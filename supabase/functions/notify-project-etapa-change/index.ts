// Edge Function: notify-project-etapa-change
// Disparada por trigger pg_net quando projects.etapa muda.
// Envia push (e tentativa de email) para o mais sênior alocado e o mais sênior do administrativo.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ETAPA_LABELS: Record<string, string> = {
  iniciado: "Iniciado",
  minuta: "Minuta",
  assinado: "Assinado",
};

// Ranking de senioridade por substring (case-insensitive). Maior = mais sênior.
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
  if (r.includes("coordenador") || r.includes("coordenadora")) return 60;
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
  return members.reduce((best, m) =>
    seniorityRank(m.role) > seniorityRank(best.role) ? m : best
  );
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

async function sendEmail(email: string, projectTitle: string, clientName: string, etapaAnterior: string, etapaNova: string, projectId: string) {
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "project-etapa-change",
        recipientEmail: email,
        idempotencyKey: `etapa-${projectId}-${etapaNova}-${email}`,
        templateData: {
          projectTitle,
          clientName,
          etapaAnterior: ETAPA_LABELS[etapaAnterior] || etapaAnterior || "—",
          etapaNova: ETAPA_LABELS[etapaNova] || etapaNova,
        },
      },
    });
  } catch (e) {
    // email infra pode ainda não estar configurada — silenciar
    console.warn("email skipped", e?.message || e);
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

    // Carrega projeto + cliente + alocações
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, title, clients(name), project_allocations(team_members(id, name, role, user_id, corporate_email, is_active))")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr || !project) throw projErr || new Error("projeto não encontrado");

    const allocated = ((project as any).project_allocations || [])
      .map((a: any) => a.team_members)
      .filter((m: any) => m && m.is_active);

    const seniorProject = pickMostSenior(allocated);

    // Mais sênior do administrativo
    const { data: adminMembers } = await supabase
      .from("team_members")
      .select("id, name, role, user_id, corporate_email")
      .eq("is_active", true)
      .eq("area", "Administrativo");

    const seniorAdmin = pickMostSenior(adminMembers || []);

    const recipients = new Map<string, any>();
    if (seniorProject) recipients.set(seniorProject.id, seniorProject);
    if (seniorAdmin) recipients.set(seniorAdmin.id, seniorAdmin);

    const projectTitle = (project as any).title;
    const clientName = (project as any).clients?.name || "—";
    const title = `Projeto mudou de etapa: ${projectTitle}`;
    const body = `${clientName} · ${ETAPA_LABELS[etapa_anterior] || etapa_anterior || "—"} → ${ETAPA_LABELS[etapa_nova] || etapa_nova}`;
    const url = `/projetos`;

    // Resolve emails: corporate_email com fallback para profiles.email
    const userIds = [...recipients.values()].map((r) => r.user_id).filter(Boolean);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("user_id, email").in("user_id", userIds)
      : { data: [] as any[] };
    const profileEmailByUser = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));

    await Promise.all(
      [...recipients.values()].map(async (m) => {
        if (m.user_id) await sendPush(m.user_id, title, body, url);
        const email = m.corporate_email || (m.user_id ? profileEmailByUser.get(m.user_id) : null);
        if (email) await sendEmail(email, projectTitle, clientName, etapa_anterior, etapa_nova, project_id);
      })
    );

    return new Response(JSON.stringify({ ok: true, recipients: [...recipients.values()].map((r) => r.name) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
