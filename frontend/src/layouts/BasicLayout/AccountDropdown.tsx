import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Meine Daten</DropdownMenuItem>
        <DropdownMenuItem>Meine Bestellungen</DropdownMenuItem>
        <DropdownMenuItem>Meine Rechnungen</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HostDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Meine Daten</DropdownMenuItem>
        <DropdownMenuItem>Statistik</DropdownMenuItem>
        <DropdownMenuItem>Organizer Tools</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
