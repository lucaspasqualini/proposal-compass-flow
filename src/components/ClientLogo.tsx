import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getClientInitials, getClientLogoUrl, type ClientLogoSource } from "@/lib/clientLogo";

interface ClientLogoProps {
  client: ClientLogoSource & { name: string };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses: Record<NonNullable<ClientLogoProps["size"]>, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-2xl",
};

export function ClientLogo({ client, size = "sm", className }: ClientLogoProps) {
  const url = getClientLogoUrl(client);
  const initials = getClientInitials(client.name);
  return (
    <Avatar className={cn(sizeClasses[size], "rounded-md bg-background border", className)}>
      {url && <AvatarImage src={url} alt={client.name} className="object-contain p-1" />}
      <AvatarFallback className="rounded-md bg-primary/10 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
