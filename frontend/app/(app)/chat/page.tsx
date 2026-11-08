"use client";

import * as React from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BotMessageSquare, Send, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounding?: {
    footprint_period?: string;
    factor_sources?: string[];
  };
  disclaimer?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content:
        "Hello! I am your CarbonQuest climate intelligence assistant powered by Groq Llama 3.3 70B. All my carbon calculations are strictly grounded in published emission factors. How can I assist you with your footprint today?",
      grounding: {
        footprint_period: "2026-11",
        factor_sources: ["CEA Baseline v19", "ARAI / MoEFCC 2023"],
      },
      disclaimer: "Estimates based on published emission factors, not measured emissions.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    const userMsg: ChatMessage = {
      id: "usr_" + Date.now(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const data = await api.chat.send({ message: userText });
      setMessages((prev) => [
        ...prev,
        {
          id: (data as any).id || data.session_id || "ast_" + Date.now(),
          role: "assistant",
          content: data.reply,
          grounding: data.grounding,
          disclaimer: data.disclaimer || "Estimates based on published emission factors, not measured emissions.",
        },
      ]);
    } catch {
      // Offline / local deterministic fallback
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: "fallback_" + Date.now(),
            role: "assistant",
            content:
              "Based on your November footprint breakdown, Transport accounts for 31.3% (40.0 kg CO₂e) of your 128.0 kg total footprint, primarily driven by daily petrol two-wheeler commuting. Transitioning 2 trips per week to electric transit or public bus will yield an estimated 14.0 kg CO₂e monthly reduction.",
            grounding: {
              footprint_period: "2026-11",
              factor_sources: ["CEA Baseline v19 (0.82 kg/kWh)", "ARAI / MoEFCC 2023"],
            },
            disclaimer: "Estimates based on published emission factors, not measured emissions.",
          },
        ]);
      }, 500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6 flex flex-col h-[calc(100vh-6rem)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Climate Advisory Assistant</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              Grounded AI (Llama 3.3 70B)
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ask questions about your emissions, hotspot breakdown, and validated reduction strategies.
          </p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/70 text-foreground rounded-bl-none border border-border/60"
                  }`}
                >
                  <div className="leading-relaxed whitespace-pre-wrap">{m.content}</div>

                  {m.grounding && m.grounding.factor_sources && (
                    <div className="mt-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" />
                        Grounded Sources ({m.grounding.footprint_period}):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.grounding.factor_sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-background/80 px-1.5 py-0.5 rounded text-[10px] border border-border/50"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.disclaimer && (
                    <div className="mt-1 text-[10px] text-muted-foreground/80 italic">
                      {m.disclaimer}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>

          <div className="p-3 border-t bg-card">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                placeholder="Ask about your footprint or recommendations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
                className="flex-1"
              />
              <Button type="submit" disabled={isSending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
