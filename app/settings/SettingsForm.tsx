"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSettings } from "./actions";

// Les valeurs possibles pour le rôle, comme dans ton schéma Prisma
const ROLES = ["UNIT_MANAGER", "ENGAGEMENT_MANAGER", "CONSULTANT"];

// Type simple pour représenter l'utilisateur affiché dans le formulaire
type SettingsUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function SettingsForm({ user }: { user: SettingsUser }) {
  // On garde une copie locale des valeurs, modifiable pendant que l'utilisateur tape
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);

  // Nouveaux états : pour savoir si ça sauvegarde, et afficher un message
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleCancel() {
    // On remet les valeurs d'origine, on annule les changements non sauvegardés
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setMessage(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    const result = await updateSettings({ name, email, role });

    setIsSaving(false);

    if (result.success) {
      setMessage("✅ Enregistré avec succès !");
    } else {
      setMessage("❌ Erreur : " + result.error);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Personal info</h1>
          <p className="text-sm text-muted-foreground">
            Update your photo and personal details here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {message && <div className="mb-4 text-sm">{message}</div>}

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Your photo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" alt={name} />
              <AvatarFallback>
                {name?.charAt(0)?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" disabled>
              Upload photo (bientôt)
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}