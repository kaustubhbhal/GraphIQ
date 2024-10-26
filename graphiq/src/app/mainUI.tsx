"use client"

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import mermaid from 'mermaid';
import * as multimodal from "@nlxai/multimodal";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Component() {
  const [isRecording, setIsRecording] = React.useState(false);
  const [audioData, setAudioData] = React.useState<number[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Hello! How can I assist you with your learning today?" }
  ]);
  const [inputMessage, setInputMessage] = React.useState("");

  // Initialize NLX multimodal client
  const nlxClient = React.useMemo(() => {
    return multimodal.create({
      apiKey: process.env.NEXT_PUBLIC_NLX_API_KEY!,
      workspaceId: "YOUR_WORKSPACE_ID",
      journeyId: "YOUR_JOURNEY_ID",
      conversationId: "UNIQUE_CONVERSATION_ID",
      languageCode: "en-US",
    });
  }, []);

  const sendMessage = (content: string) => {
    setMessages(prev => [...prev, { role: "user", content }]);

    // Send message to NLX
    nlxClient.sendStep("YOUR_STEP_ID");

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `I understand you're asking about "${content}". As an AI learning assistant, I can provide information on various topics. What specific aspect would you like to know more about?`
        }
      ]);
    }, 1000);
  };

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage("");
    }
  };

  React.useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
    mermaid.contentLoaded();
  }, []);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left side for Mermaid diagram */}
      <div className="w-3/5 h-full p-6 border-r overflow-hidden flex flex-col">
        <h2 className="text-2xl font-semibold mb-6">Concept Visualization</h2>
        <div className="flex-grow overflow-hidden">
          <Card className="w-full h-full">
            <CardContent className="p-6 h-full">
              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground">
                <div className="mermaid">
                  {`graph TD;
                    A(10) -->|left| B(5)
                    A -->|right| C(15)
                    B -->|left| D(3)
                    B -->|right| E(7)
                    C -->|left| F(12)
                    C -->|right| G(18)`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side for NLX-integrated assistant */}
      <div className="w-2/5 h-full flex flex-col p-4 overflow-hidden">
        <h2 className="text-2xl font-semibold mb-4">NLX-Powered Learning Assistant</h2>
        <Card className="flex-grow mb-4 overflow-hidden">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg max-w-[80%] ${
                      message.role === "assistant"
                        ? "bg-muted"
                        : "bg-primary text-primary-foreground ml-auto"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* NLX Input and Audio controls */}
        <Card>
          <CardContent className="p-3">
            <div className="mb-3 h-16 bg-muted rounded-lg overflow-hidden">
              <div className="h-full w-full flex items-end justify-around">
                {audioData.map((value, index) => (
                  <div
                    key={index}
                    className="w-1 bg-primary"
                    style={{ height: `${value * 100}%`, transition: 'height 0.1s ease-in-out' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                onClick={() => setIsRecording(!isRecording)}
                className="w-10 h-10 p-0 flex-shrink-0"
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span className="sr-only">{isRecording ? "Stop Recording" : "Start Recording"}</span>
              </Button>
              <Input
                placeholder="Type your message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-grow"
              />
              <Button onClick={handleSend} variant="outline" className="w-20 flex-shrink-0">
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}