import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";

export default function AguardandoAcesso() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold">Aguardando liberação de acesso</h1>
        <p className="text-muted-foreground">
          Sua conta foi criada com sucesso, mas ainda não tem um perfil de acesso atribuído.
          Solicite ao Sócio administrador que libere seu acesso.
        </p>
        {user?.email && (
          <p className="text-sm text-muted-foreground">
            Logado como <strong>{user.email}</strong>
          </p>
        )}
        <Button variant="outline" onClick={signOut} className="w-full">
          Sair
        </Button>
      </Card>
    </div>
  );
}
