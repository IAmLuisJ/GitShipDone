import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bot, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/project";

type AiChatPanelProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: Project;
};

type ChatMessage = {
  content: string;
  role: "user" | "ai";
};

type AiChatResponse = {
  response: string;
};

export function AiChatPanel({ onOpenChange, open, project }: AiChatPanelProps) {
  const hasAiKey = useAuthStore((state) => state.user?.hasAiKey ?? false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setMessages([]);
      setInputText("");
      setIsLoading(false);
    }

    onOpenChange(nextOpen);
  }

  /** Sends the current message to the AI PM endpoint and appends the reply. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = inputText.trim();
    if (!message || isLoading) {
      return;
    }

    setInputText("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const response = await api.post<AiChatResponse>(
        `/projects/${project.id}/ai/chat`,
        { message },
      );
      setMessages((current) => [
        ...current,
        { role: "ai", content: response.data.response },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          content: "I couldn't reach the AI service. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            AI PM
          </SheetTitle>
          <SheetDescription>
            Ask for next steps, risk checks, or a sharper plan for {project.name}.
          </SheetDescription>
        </SheetHeader>

        {!hasAiKey ? (
          <div className="grid gap-3 px-4 text-sm">
            <p className="text-muted-foreground">
              Add an AI API key before chatting with the project assistant.
            </p>
            <Button asChild>
              <Link to="/settings">Open settings</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1 px-4">
              <div className="grid gap-3 pb-4">
                {messages.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    What is the next useful move for {project.name}?
                  </p>
                ) : null}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}-${message.content}`}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isLoading ? (
                  <div className="flex justify-start">
                    <div
                      data-testid="ai-typing-indicator"
                      className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2"
                    >
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                          style={{ animationDelay: `${dot * 120}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <SheetFooter>
              <form onSubmit={handleSubmit} className="grid gap-2">
                <label htmlFor="ai-chat-message" className="sr-only">
                  Message AI PM
                </label>
                <Textarea
                  id="ai-chat-message"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="Ask AI PM..."
                  rows={3}
                />
                <Button type="submit" disabled={!inputText.trim() || isLoading}>
                  <Send data-icon="inline-start" />
                  Send
                </Button>
              </form>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
