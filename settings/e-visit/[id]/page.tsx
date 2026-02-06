"use client"

import { useState, use } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  ImageIcon,
  Clock,
  Shield,
  X,
} from "lucide-react"

export default function EVisitRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { language, dir } = useLanguage()
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    { id: 1, sender: "doctor", text: "مرحباً، كيف يمكنني مساعدتك اليوم؟", time: "14:00" },
    { id: 2, sender: "patient", text: "أعاني من صداع شديد منذ يومين", time: "14:01" },
  ])

  const labels = {
    ar: {
      eVisit: "استشارة عن بعد",
      doctor: "د. أحمد بن علي",
      specialty: "طب القلب",
      duration: "مدة الاستشارة",
      minutes: "دقيقة",
      endCall: "إنهاء المكالمة",
      chat: "المحادثة",
      typeMessage: "اكتب رسالتك...",
      send: "إرسال",
      attachFile: "إرفاق ملف",
      encryptedCall: "المكالمة مشفرة ومحمية",
      waitingRoom: "غرفة الانتظار",
      doctorJoining: "الطبيب سينضم قريباً",
      you: "أنت",
      uploadedImages: "الصور المرفقة",
      sharedFiles: "الملفات المشتركة",
    },
    fr: {
      eVisit: "Téléconsultation",
      doctor: "Dr. Ahmed Benali",
      specialty: "Cardiologie",
      duration: "Durée de consultation",
      minutes: "minutes",
      endCall: "Terminer l'appel",
      chat: "Chat",
      typeMessage: "Écrivez votre message...",
      send: "Envoyer",
      attachFile: "Joindre un fichier",
      encryptedCall: "Appel crypté et sécurisé",
      waitingRoom: "Salle d'attente",
      doctorJoining: "Le médecin va bientôt rejoindre",
      you: "Vous",
      uploadedImages: "Images jointes",
      sharedFiles: "Fichiers partagés",
    },
    en: {
      eVisit: "E-Visit",
      doctor: "Dr. Ahmed Benali",
      specialty: "Cardiology",
      duration: "Consultation Duration",
      minutes: "minutes",
      endCall: "End Call",
      chat: "Chat",
      typeMessage: "Type your message...",
      send: "Send",
      attachFile: "Attach file",
      encryptedCall: "Call is encrypted and secure",
      waitingRoom: "Waiting Room",
      doctorJoining: "Doctor will join shortly",
      you: "You",
      uploadedImages: "Attached Images",
      sharedFiles: "Shared Files",
    },
  }

  const l = labels[language]

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { id: messages.length + 1, sender: "patient", text: message, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) },
      ])
      setMessage("")
    }
  }

  return (
    <div className="h-screen bg-foreground flex" dir={dir}>
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 bg-foreground/90">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-500 text-white animate-pulse">
              <span className="h-2 w-2 rounded-full bg-white me-2" />
              LIVE
            </Badge>
            <div className="flex items-center gap-2 text-background">
              <Clock className="h-4 w-4" />
              <span>15:32</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-background/70 text-sm">
            <Shield className="h-4 w-4" />
            <span>{l.encryptedCall}</span>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 gap-4 relative">
          {/* Doctor Video (Large) */}
          <div className="relative bg-muted rounded-2xl overflow-hidden flex items-center justify-center">
            <Avatar className="h-32 w-32">
              <AvatarFallback className="text-4xl bg-primary/20 text-primary">أ</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-4 start-4 bg-foreground/80 text-background px-3 py-1 rounded-lg text-sm">
              {l.doctor}
            </div>
          </div>

          {/* Patient Video (Small - Picture in Picture) */}
          <div className="absolute bottom-8 end-8 w-48 h-36 bg-muted rounded-xl overflow-hidden flex items-center justify-center border-2 border-background shadow-lg">
            {isVideoOn ? (
              <>
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-secondary/20 text-secondary">م</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 start-2 bg-foreground/80 text-background px-2 py-0.5 rounded text-xs">
                  {l.you}
                </div>
              </>
            ) : (
              <VideoOff className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Control Bar */}
        <div className="p-6 flex items-center justify-center gap-4">
          <Button
            variant={isMicOn ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => setIsMicOn(!isMicOn)}
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          <Button
            variant={isVideoOn ? "secondary" : "destructive"}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => setIsVideoOn(!isVideoOn)}
          >
            {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-14 px-8"
          >
            <Phone className="h-6 w-6 me-2 rotate-[135deg]" />
            {l.endCall}
          </Button>
          <Button
            variant={isChatOpen ? "default" : "secondary"}
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {isChatOpen && (
        <div className="w-96 bg-background border-s flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">{l.chat}</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Shared Files Section */}
          <div className="p-4 border-b">
            <h4 className="text-sm font-medium mb-2">{l.uploadedImages}</h4>
            <div className="flex gap-2">
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender === "patient"
                        ? "bg-primary text-primary-foreground rounded-ee-sm"
                        : "bg-muted rounded-es-sm"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "patient" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="h-5 w-5" />
              </Button>
              <Textarea
                placeholder={l.typeMessage}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button size="icon" onClick={handleSendMessage}>
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
