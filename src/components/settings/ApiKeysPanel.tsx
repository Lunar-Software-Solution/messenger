import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface ApiKeysPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeysPanel({ open, onClose }: ApiKeysPanelProps) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKeys = async () => {
    const db = supabase as any;
    const { data } = await db
      .from("api_keys")
      .select("*")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchKeys();
  }, [open]);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { label: label.trim() || null },
      });
      if (error) throw error;
      setNewKey(data.key);
      setLabel("");
      fetchKeys();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (id: string) => {
    const db = supabase as any;
    await db.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    fetchKeys();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Copied", description: "API key copied to clipboard" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setNewKey(null); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>Generate and manage API keys for the ingestion API.</DialogDescription>
        </DialogHeader>

        {/* Generate */}
        <div className="flex gap-2">
          <Input
            placeholder="Key label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 bg-secondary border-border text-sm"
          />
          <Button onClick={generateKey} disabled={generating} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Copy this key now — it won't be shown again.
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded font-mono break-all text-foreground">
                {newKey}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyKey(newKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Key list */}
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
            {!loading && keys.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No API keys yet</p>
            )}
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary text-sm">
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-foreground">{k.key_prefix}</code>
                  {k.label && (
                    <Badge variant="outline" className="ml-2 text-[10px]">{k.label}</Badge>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)} className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
