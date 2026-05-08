import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Smartphone, Apple, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array, shouldEnablePWA } from "@/lib/pwa";

export default function Instalar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Verifica estado das push
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushEnabled(!!sub))
        .catch(() => {});
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  const enablePush = async () => {
    if (!user) {
      toast({ title: "Faça login primeiro", variant: "destructive" });
      return;
    }
    if (!shouldEnablePWA()) {
      toast({
        title: "Disponível apenas no app publicado",
        description: "Notificações só funcionam fora do editor de preview.",
        variant: "destructive",
      });
      return;
    }
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permissão negada", variant: "destructive" });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setPushEnabled(true);
      toast({ title: "Notificações ativadas!" });
    } catch (err: any) {
      toast({ title: "Erro", description: String(err.message || err), variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setPushEnabled(false);
      toast({ title: "Notificações desativadas" });
    } finally {
      setPushLoading(false);
    }
  };

  const sendTestPush = async () => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_id: user.id,
        title: "Compass",
        body: "Notificação de teste recebida com sucesso! 🎉",
        url: "/",
      },
    });
    if (error) {
      toast({ title: "Erro no envio", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Teste enviado", description: `${data?.sent || 0} dispositivo(s)` });
  };

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Instalar no celular</h1>
        <p className="text-muted-foreground mt-2">
          Use o Compass como um app nativo no seu telefone, com ícone na tela inicial e
          notificações push.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Instalação
          </CardTitle>
          <CardDescription>
            {isInstalled
              ? "App já instalado neste dispositivo."
              : "Adicione o Compass à tela inicial do seu celular."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <span>Instalação concluída</span>
            </div>
          ) : installPrompt ? (
            <Button onClick={handleInstall} size="lg">
              <Download className="mr-2 h-4 w-4" /> Instalar agora
            </Button>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Apple className="h-4 w-4" /> iPhone / iPad (Safari)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Toque no botão Compartilhar (ícone de seta para cima)</li>
                  <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <Smartphone className="h-4 w-4" /> Android (Chrome)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Toque no menu (três pontos no canto superior)</li>
                  <li>Toque em "Instalar app" ou "Adicionar à tela inicial"</li>
                  <li>Confirme tocando em "Instalar"</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações push
          </CardTitle>
          <CardDescription>
            Receba alertas mesmo com o app fechado. No iPhone, é necessário instalar o app
            primeiro (iOS 16.4+).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pushEnabled ? (
            <>
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span>Notificações ativadas neste dispositivo</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={disablePush} disabled={pushLoading}>
                  <BellOff className="mr-2 h-4 w-4" /> Desativar
                </Button>
                <Button variant="secondary" onClick={sendTestPush}>
                  Enviar teste
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={enablePush} disabled={pushLoading}>
              <Bell className="mr-2 h-4 w-4" /> Ativar notificações
            </Button>
          )}
        </CardContent>
      </Card>

      {!shouldEnablePWA() && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <strong>Atenção:</strong> A instalação e as notificações push só funcionam na
          versão publicada do app (URL <code>.lovable.app</code>), não dentro do editor.
          Clique em <strong>Publish</strong> e abra a URL pública no celular.
        </div>
      )}
    </div>
  );
}
