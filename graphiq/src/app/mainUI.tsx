'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ZoomIn, ZoomOut, Send, Eraser, Mic, MicOff, VolumeX, Volume2, User, Moon, Sun, Download, Sparkles, MessageCircle, History, ChevronLeft, ChevronRight, FileText, Home, Info, Mail } from 'lucide-react'
import Mermaid from 'mermaid'
import html2canvas from 'html2canvas'
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { motion, AnimatePresence } from 'framer-motion'

interface DiagramVersion {
  svg: string;
  timestamp: Date;
}

const formatMessageText = (text: string) => {
  const paragraphs = text.split('\n\n');
  return paragraphs.map((paragraph, index) => {
    if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
      const code = paragraph.slice(3, -3);
      return (
        <pre key={index} className="bg-gray-100 p-2 rounded my-2 overflow-x-auto">
          <code>{code}</code>
        </pre>
      );
    }
    return <p key={index} className="mb-2">{paragraph}</p>;
  });
};

export default function Component() {
  const [mermaidSvg, setMermaidSvg] = useState('')
  const [diagramVersions, setDiagramVersions] = useState<DiagramVersion[]>([])
  const [zoomLevel, setZoomLevel] = useState(1.2)
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0)
  const canvasRef = useRef(null)
  const playgroundRef = useRef(null)
  const chatScrollRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { text: "Hello my name is GraphIQ, I am here to assist you with learning data structures and algorithms. You can ask to me to explain concepts, give you practice problems, check your work, or give you feedback.Lets start with a topic that I can help you with. I can help with:- Binary Search Trees\n- AVLs\n- Heaps\n- Arrays\n- Linked Lists\n- and more!\n\nWhich topic would you like help with", isUser: false, timestamp: new Date() },
  ])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const speechSynthesisRef = useRef(null)
  const voiceRef = useRef(null)
  const [chatQuality, setChatQuality] = useState('')
  const [chatSummary, setChatSummary] = useState('')
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    const initializeMermaid = () => {
      const theme = isDarkMode ? darkModeTheme : lightModeTheme
      Mermaid.initialize({ 
        startOnLoad: true,
        theme: 'base',
        themeVariables: theme
      })
    }

    initializeMermaid()

    speechSynthesisRef.current = window.speechSynthesis

    const setVoice = () => {
      const voices = speechSynthesisRef.current.getVoices()
      const indianMaleVoice = voices.find(voice => 
        voice.lang.startsWith('en-AU') && voice.name.toLowerCase().includes('female')
      )
      if (indianMaleVoice) {
        voiceRef.current = indianMaleVoice
      } else {
        const indianVoice = voices.find(voice => voice.lang.startsWith('en-AU'))
        if (indianVoice) {
          voiceRef.current = indianVoice
        } else {
          const englishVoice = voices.find(voice => voice.lang.startsWith('en-'))
          if (englishVoice) {
            voiceRef.current = englishVoice
          } else if (voices.length > 0) {
            voiceRef.current = voices[0]
          }
        }
      }
    }

    if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
      speechSynthesisRef.current.onvoiceschanged = setVoice
    }

    setVoice()

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
      }
    }
  }, [isDarkMode])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(59, 130, 246, 0.5)'
    ctx.lineWidth = 3

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [isDarkMode])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages])

  const lightModeTheme = {
    primaryColor: '#3b82f6',
    primaryTextColor: '#1e3a8a',
    primaryBorderColor: '#60a5fa',
    lineColor: '#93c5fd',
    secondaryColor: '#e0e7ff',
    tertiaryColor: '#bfdbfe',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
  }

  const darkModeTheme = {
    background: '#1f2937',
    primaryColor: '#60a5fa',
    primaryTextColor: '#e0e7ff',
    primaryBorderColor: '#3b82f6',
    lineColor: '#93c5fd',
    secondaryColor: '#374151',
    tertiaryColor: '#4b5563',
    textColor: '#e0e7ff',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
  }

  const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getMousePos(canvas, e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getMousePos(canvas, e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleSubmit = async () => {
    if (!playgroundRef.current) return

    try {
      const canvas = await html2canvas(playgroundRef.current)
      const image = canvas.toDataURL('image/png')

      const response = await fetch('/api/save-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image }),
      })

      if (response.ok) {
        const { fileName } = await response.json()
        setSubmissionStatus(`Screenshot saved successfully as ${fileName}`)
        saveDiagramVersion()
      } else {
        throw new Error('Failed to save image')
      }
    } catch (error) {
      console.error('Error saving image:', error)
      setSubmissionStatus('Failed to save the screenshot. Please try again.')
    }

    setTimeout(() => setSubmissionStatus(''), 5000)
  }

  const handleSend = async (messageToSend = input) => {
    if (!messageToSend.trim()) return

    setMessages((prev) => [...prev, { text: messageToSend, isUser: true, timestamp: new Date() }])
    setInput('')
    setIsThinking(true)

    try {
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
        mode: 'cors',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Response from server:', data)

        if (data && data.text) {
          const botMessage = { text: data.text, isUser: false, timestamp: new Date() }
          setMessages((prev) => [...prev, botMessage])
          speakMessage(botMessage.text)

          if (data.diagram) {
            try {
              const result = await Mermaid.render('mermaid-diagram-' + Date.now(), data.diagram)
              setMermaidSvg(result.svg)
              saveDiagramVersion()
            } catch (error) {
              console.error('Error rendering Mermaid diagram:', error)
              setMessages((prev) => [...prev, { text: "Error rendering diagram. Please try again.", isUser: false, timestamp: new Date() }])
            }
          }
        } else {
          throw new Error('Invalid response format from server')
        }
      } else {
        throw new Error('Failed to get response from LLM')
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [...prev, { text: "An error occurred while processing your request.", isUser: false, timestamp: new Date() }])
    } finally {
      setIsThinking(false)
    }
  }

  const speakMessage = (text) => {
    if (speechSynthesisRef.current && voiceRef.current) {
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voiceRef.current
      utterance.rate = 1.2
      utterance.onend = () => setIsSpeaking(false)
      speechSynthesisRef.current.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  const zoomIn = () => {
    setZoomLevel(prevZoom => Math.min(prevZoom + 0.1, 2))
  }

  const zoomOut = () => {
    setZoomLevel(prevZoom => Math.max(prevZoom - 0.1, 0.5))
  }

  const toggleListening = async () => {
    if (isListening) {
      stopRecording()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorderRef.current = new MediaRecorder(stream)
        audioChunksRef.current = []

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data)
        }

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
          await sendAudioToWhisper(audioBlob)
        }

        mediaRecorderRef.current.start()
        setIsListening(true)
      } catch (error) {
        console.error("Error accessing microphone:", error)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsListening(false)
    }
  }

  const sendAudioToWhisper = async (audioBlob) => {
    try {
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audioFile: base64Audio }),
        })

        if (response.ok) {
          const { transcription } = await response.json()
          await handleSend(transcription)
        } else {
          console.error("Error transcribing audio")
        }
      }
    } catch (error) {
      console.error("Error sending audio to Whisper API:", error)
    }
  }

  const formatTimestamp = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const toggleDarkMode = () =>   {
    setIsDarkMode(prev => !prev)
  }

  const exportDiagram = () => {
    if (mermaidSvg) {
      const svgBlob = new Blob([mermaidSvg], {type: 'image/svg+xml;charset=utf-8'})
      const svgUrl = URL.createObjectURL(svgBlob)
      const downloadLink = document.createElement('a')
      
      downloadLink.href = svgUrl
      downloadLink.download = 'mermaid_diagram.svg'
      
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }
  }

  const saveDiagramVersion = () => {
    if (mermaidSvg) {
      setDiagramVersions(prev => [...prev, { svg: mermaidSvg, timestamp: new Date() }])
      setCurrentVersionIndex(prev => prev + 1)
    }
  }

  const revertToDiagramVersion = (index: number) => {
    setMermaidSvg(diagramVersions[index].svg)
    setCurrentVersionIndex(index)
    setIsVersionHistoryOpen(false)
  }

  const navigateVersion = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentVersionIndex > 0) {
      setCurrentVersionIndex(prev => prev - 1)
      setMermaidSvg(diagramVersions[currentVersionIndex - 1].svg)
    } else if (direction === 'next' && currentVersionIndex < diagramVersions.length - 1) {
      setCurrentVersionIndex(prev => prev + 1)
      setMermaidSvg(diagramVersions[currentVersionIndex + 1].svg)
    }
  }

  const generateSummary = async () => {
    setIsSummaryLoading(true)
    try {
      const chatHistory = messages.map(msg => `${msg.isUser ? 'User' : 'AI'}: ${msg.text}`).join('\n')
      const qualityPrompt = `Analyze the following chat conversation and provide feedback on the quality of the interaction, including areas of strength and potential improvements:\n\n${chatHistory}`
      const summaryPrompt = `Summarize the following chat conversation and provide key takeaways and tips for the user:\n\n${chatHistory}`

      const [qualityResponse, summaryResponse] = await Promise.all([
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: qualityPrompt }),
        }),
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: summaryPrompt }),
        })
      ])

      if (qualityResponse.ok && summaryResponse.ok) {
        const qualityData = await qualityResponse.json()
        const summaryData = await summaryResponse.json()
        setChatQuality(qualityData.output)
        setChatSummary(summaryData.output)
        setIsSummaryOpen(true)
      } else {
        throw new Error('Failed to generate summary')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      setChatQuality('Failed to analyze chat quality. Please try again.')
      setChatSummary('Failed to generate summary. Please try again.')
    } finally {
      setIsSummaryLoading(false)
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(24)
    doc.setTextColor(0, 0, 255)
    doc.text('Chat Summary and Study Guide', 105, 15, { align: 'center' })
    
    // Add creation date
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Created on ${new Date().toLocaleString()}`, 195, 22, { align: 'right' })
    
    // Add chat quality section
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('Chat Quality Analysis', 14, 30)
    
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    const qualityLines = doc.splitTextToSize(chatQuality, 180)
    doc.text(qualityLines, 14, 40)
    
    // Add chat summary section
    const summaryYPosition = 50 + (qualityLines.length * 5)
    doc.setFontSize(16)
    doc.setTextColor(0, 0, 0)
    doc.text('Chat Summary', 14, summaryYPosition)
    
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    const summaryLines = doc.splitTextToSize(chatSummary, 180)
    doc.text(summaryLines, 14, summaryYPosition + 10)
    
    // Add key takeaways table
    const takeaways = [
      'Understand the core concepts discussed',
      'Practice implementing the ideas in real-world scenarios',
      'Refer back to the chat for detailed explanations',
      'Explore related topics to deepen your understanding'
    ]
    
    const takeawaysYPosition = summaryYPosition + 20 + (summaryLines.length * 5)
    autoTable(doc, {
      startY: takeawaysYPosition,
      head: [['Key Takeaways']],
      body: takeaways.map(item => [item]),
      headStyles: { fillColor: [0, 0, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 255] },
      margin: { top: 10 },
    })
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages()
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.text(`Page ${i} of ${pageCount}`, 195, 285, { align: 'right' })
    }
    
    doc.save('chat_summary_study_guide.pdf')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'about':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-4 md:p-8 transition-colors duration-200`}
          >
            <div className="max-w-7xl mx-auto">
              <header className="flex justify-between items-center mb-8">
                <h1 className={`text-4xl font-bold flex items-center`}>
                  <Sparkles className={`w-8 h-8 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={isDarkMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'}>
                    GraphIQ
                  </span>
                </h1>
                <nav className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    className={isDarkMode ? 'text-white hover:text-gray-300' : 'text-blue-600 hover:text-blue-800'}
                    onClick={() => setCurrentPage('home')}
                  >
                    <Home className="h-4 w-4" />
                    <span className="sr-only">Home</span>
                  </Button>
                </nav>
              </header>
              <AboutPage isDarkMode={isDarkMode} />
            </div>
          </motion.div>
        )
      case 'contact':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-4 md:p-8 transition-colors duration-200`}
          >
            <div className="max-w-7xl mx-auto">
              <header className="flex justify-between items-center mb-8">
                <h1 className={`text-4xl font-bold flex items-center`}>
                  <Sparkles className={`w-8 h-8 mr-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={isDarkMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'}>
                    GraphIQ
                  </span>
                </h1>
                <nav className="flex items-center space-x-4">
                  <Button 
                    variant="ghost" 
                    className={isDarkMode ? 'text-white hover:text-gray-300' : 'text-blue-600 hover:text-blue-800'}
                    onClick={() => setCurrentPage('home')}
                  >
                    <Home className="h-4 w-4" />
                    <span className="sr-only">Home</span>
                  </Button>
                </nav>
              </header>
              <ContactPage isDarkMode={isDarkMode} />
            </div>
          </motion.div>
        )
      default:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} p-4 md:p-8 transition-colors duration-500`}
          >
            <div className="max-w-7xl mx-auto">
              <header className="flex flex-col md:flex-row justify-between items-center mb-6 py-2">
                <h1 className={`text-4xl font-bold mb-4 md:mb-0 flex items-center`}>
                  <Sparkles className={`w-10 h-10 mr-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={isDarkMode ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600'}>
                    GraphIQ
                  </span>
                </h1>
                <nav className="flex items-center space-x-4 py-2">
                  <Button 
                    variant="ghost" 
                    className={`text-base px-3 py-1.5 ${isDarkMode ? 'text-white hover:text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={() => setCurrentPage('home')}
                  >
                    <Home className="h-5 w-5 mr-1.5" />
                    <span className="hidden md:inline">Home</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`text-base px-3 py-1.5 ${isDarkMode ? 'text-white hover:text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={() => setCurrentPage('about')}
                  >
                    <Info className="h-5 w-5 mr-1.5" />
                    <span className="hidden md:inline">About</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`text-base px-3 py-1.5 ${isDarkMode ? 'text-white hover:text-gray-300' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={() => setCurrentPage('contact')}
                  >
                    <Mail className="h-5 w-5 mr-1.5" />
                    <span className="hidden md:inline">Contact</span>
                  </Button>
                  <div className="flex items-center space-x-1.5 ml-3">
                    <Switch
                      id="dark-mode"
                      checked={isDarkMode}
                      onCheckedChange={toggleDarkMode}
                      className="scale-125"
                    />
                    <Label htmlFor="dark-mode" className="sr-only">
                      Dark Mode
                    </Label>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={isDarkMode ? 'dark' : 'light'}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </nav>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden`}>
                  <CardHeader className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <CardTitle className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center justify-between`}>
                      <div className="flex items-center">
                        <ZoomIn className="w-6 h-6 mr-2" />
                        Workspace
                      </div>
                      <Dialog open={isVersionHistoryOpen} onOpenChange={setIsVersionHistoryOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`ml-2 ${
                              isDarkMode 
                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600' 
                                : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
                            }`}
                          >
                            <History className="w-4 h-4 mr-2" />
                            Version History
                          </Button>
                        </DialogTrigger>
                        <DialogContent className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} sm:max-w-[600px]`}>
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold mb-4">Diagram Version History</DialogTitle>
                          </DialogHeader>
                          <div className="flex items-center justify-between mb-4">
                            <Button
                              onClick={() => navigateVersion('prev')}
                              disabled={currentVersionIndex === 0}
                              variant="outline"
                              size="sm"
                              className={`${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                            </Button>
                            <span className="text-sm font-medium">
                              Version {currentVersionIndex + 1} of {diagramVersions.length}
                            </span>
                            <Button
                              onClick={() => navigateVersion('next')}
                              disabled={currentVersionIndex === diagramVersions.length - 1}
                              variant="outline"
                              size="sm"
                              className={`${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                            >
                              Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                          <ScrollArea className="h-[400px] w-full pr-4">
                            {diagramVersions.map((version, index) => (
                              <div
                                key={index}
                                className={`mb-6 p-4 border rounded-lg transition-all duration-200 ${
                                  index === currentVersionIndex
                                    ? isDarkMode
                                      ? 'bg-blue-900 border-blue-700'
                                      : 'bg-blue-50 border-blue-200'
                                    : isDarkMode
                                      ? 'bg-gray-700 border-gray-600'
                                      : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h3 className="text-lg font-semibold">Version {index + 1}</h3>
                                  <p className="text-sm opacity-70">{formatTimestamp(version.timestamp)}</p>
                                </div>
                                <div
                                  dangerouslySetInnerHTML={{ __html: version.svg }}
                                  className="w-full h-48 bg-white rounded-md overflow-hidden shadow-inner"
                                />
                                <Button
                                  onClick={() => revertToDiagramVersion(index)}
                                  className={`mt-4 w-full ${
                                    isDarkMode
                                      ? index === currentVersionIndex
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                      : index === currentVersionIndex
                                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                  }`}
                                >
                                  {index === currentVersionIndex ? 'Current Version' : 'Revert to this version'}
                                </Button>
                              </div>
                            ))}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 relative min-h-[600px]" ref={playgroundRef}>
                    <div className="absolute inset-0 flex items-center justify-center overflow-auto">
                      <div 
                        dangerouslySetInnerHTML={{ __html: mermaidSvg }} 
                        className="max-w-full max-h-full transition-transform duration-300 ease-in-out"
                        style={{ transform: `scale(${zoomLevel})` }}
                      />
                    </div>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      className="absolute inset-0 w-full h-full cursor-crosshair"
                    />
                    <div className={`absolute bottom-4 left-4 right-4 flex flex-wrap justify-between items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} bg-opacity-90 p-4 rounded-lg shadow-lg`}>
                      <div className="flex items-center space-x-2 mb-2 md:mb-0">
                        <Button onClick={zoomOut} variant="outline" size="icon" className={`${isDarkMode ? 'text-blue-300 border-blue-300 hover:bg-blue-900 hover:text-blue-100' : 'text-blue-600 border-blue-300'} transition-colors duration-200`}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button onClick={zoomIn} variant="outline" size="icon" className={`${isDarkMode ? 'text-blue-300 border-blue-300 hover:bg-blue-900 hover:text-blue-100' : 'text-blue-600 border-blue-300'} transition-colors duration-200`}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Zoom: {Math.round(zoomLevel * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={clearCanvas} variant="outline" className={`${isDarkMode ? 'text-blue-300 border-blue-300 hover:bg-blue-900 hover:text-blue-100' : 'text-blue-600 border-blue-300'} transition-colors duration-200`}>
                          <Eraser className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                        <Button onClick={handleSubmit} variant="outline" className={`${isDarkMode ? 'text-blue-300 border-blue-300 hover:bg-blue-900 hover:text-blue-100' : 'text-blue-600 border-blue-300'} transition-colors duration-200`}>
                          Submit
                        </Button>
                        <Button onClick={exportDiagram} variant="outline" className={`${isDarkMode ? 'text-blue-300 border-blue-300 hover:bg-blue-900 hover:text-blue-100' : 'text-blue-600 border-blue-300'} transition-colors duration-200`}>
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    {submissionStatus && (
                      <div className={`absolute top-4 left-4 right-4 ${isDarkMode ? 'bg-blue-900 border-blue-700 text-blue-100' : 'bg-blue-100 border-blue-400 text-blue-700'} px-4 py-3 rounded shadow-md transition-all duration-300 ease-in-out`}>
                        {submissionStatus}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden`}>
                  <CardHeader className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <CardTitle className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center justify-between`}>
                      <div className="flex items-center">
                        <MessageCircle className="w-6 h-6 mr-2" />
                        GraphIQ Tutor
                      </div>
                      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                        <DialogTrigger asChild>
                          <Button
                            onClick={generateSummary}
                            variant="outline"
                            size="sm"
                            className={`${
                              isDarkMode
                                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600'
                                : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
                            }`}
                            disabled={isSummaryLoading}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {isSummaryLoading ? 'Generating...' : 'Generate Summary'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} sm:max-w-[600px]`}>
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-bold mb-4">Chat Analysis and Summary</DialogTitle>
                          </DialogHeader>
                          <Tabs defaultValue="quality" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="quality">Chat Quality</TabsTrigger>
                              <TabsTrigger value="summary">Chat Summary</TabsTrigger>
                            </TabsList>
                            <TabsContent value="quality">
                              <ScrollArea className="h-[400px] w-full pr-4">
                                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                  <ReactMarkdown>{chatQuality}</ReactMarkdown>
                                </div>
                              </ScrollArea>
                            </TabsContent>
                            <TabsContent value="summary">
                              <ScrollArea className="h-[400px] w-full pr-4">
                                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                  <ReactMarkdown>{chatSummary}</ReactMarkdown>
                                </div>
                              </ScrollArea>
                            </TabsContent>
                          </Tabs>
                          <Button
                            onClick={exportPDF}
                            className={`mt-4 w-full ${
                              isDarkMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF Study Guide
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ScrollArea className="h-[500px] pr-4" ref={chatScrollRef}>
                      <div className="space-y-4">
                        {messages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex items-start space-x-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                          >
                            {!msg.isUser && (
                              <Avatar className={`${isDarkMode ? 'bg-blue-600' : 'bg-blue-100'} text-blue-600`}>
                                <AvatarFallback><Sparkles className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                msg.isUser
                                  ? isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                                  : isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                              } shadow-md transition-all duration-200 ease-in-out`}
                            >
                              {formatMessageText(msg.text)}
                              <p className={`text-xs mt-1 ${isDarkMode ? 'opacity-50' : 'opacity-50'}`}>{formatTimestamp(msg.timestamp)}</p>
                            </div>
                            {msg.isUser && (
                              <Avatar className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} text-gray-800`}>
                                <AvatarImage src="/user-avatar.png" alt="User" />
                                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}
                        {isThinking && (
                          <div className="flex items-center space-x-2">
                            <Avatar className={`${isDarkMode ? 'bg-blue-600' : 'bg-blue-100'} text-blue-600`}>
                              <AvatarFallback><Sparkles className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg p-4 shadow-md`}>
                              <p className="text-sm">Thinking...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />
                  <CardFooter className={`p-4`}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                      }}
                      className="flex w-full items-center space-x-2"
                    >
                      <Input
                        type="text"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className={`flex-grow ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'} transition-colors duration-200`}
                        disabled={isThinking}
                      />
                      <Button
                        type="button"
                        onClick={toggleListening}
                        className={`${
                          isListening 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : isDarkMode 
                              ? 'bg-blue-700 hover:bg-blue-600 text-blue-100' 
                              : 'bg-blue-600 hover:bg-blue-700'
                        } text-white transition-colors duration-200`}
                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                        disabled={isThinking}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        onClick={isSpeaking ? stopSpeaking : () => {}}
                        className={`${
                          isSpeaking 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : isDarkMode
                              ? 'bg-gray-600 text-gray-300'
                              : 'bg-gray-300'
                        } text-white transition-colors duration-200`}
                        aria-label={isSpeaking ? 'Stop speaking' : 'Not speaking'}
                        disabled={!isSpeaking}
                      >
                        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="submit"
                        className={`${isDarkMode ? 'bg-blue-700 hover:bg-blue-600 text-blue-100' : 'bg-blue-600 hover:bg-blue-700 text-white'} transition-colors duration-200`}
                        disabled={isThinking || input.trim() === ''}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </motion.div>
        )
    }
  }

  return renderPage()
}

function AboutPage({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} overflow-hidden`}>
      <CardHeader>
        <CardTitle className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>About GraphIQ</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            GraphIQ is an innovative AI-powered learning platform that combines interactive diagramming with intelligent chat assistance. Our mission is to make complex concepts easier to understand and remember through visual learning and engaging conversations.
          </p>
          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Key Features:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Interactive Mermaid diagram creation and editing</li>
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>AI-powered chat assistant for explanations and guidance</li>
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Version history for tracking diagram changes</li>
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Voice input and text-to-speech capabilities</li>
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Dark mode for comfortable viewing in any environment</li>
            <li className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Export options for diagrams and chat summaries</li>
          </ul>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Whether you're a student, teacher, or professional, GraphIQ is designed to enhance your learning experience and boost your productivity. Start exploring and visualizing your ideas today!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ContactPage({ isDarkMode }: { isDarkMode: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', { name, email, message })
    setName('')
    setEmail('')
    setMessage('')
    setSubmitStatus('success')
    setTimeout(() => setSubmitStatus('idle'), 5000)
  }

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} overflow-hidden`}>
      <CardHeader>
        <CardTitle className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Contact Us</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}
            />
          </div>
          <div>
            <Label htmlFor="email" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'}
            />
          </div>
          <div>
            <Label htmlFor="message" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Message</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className={`w-full p-2 rounded-md ${
                isDarkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-800 border-gray-300'
              }`}
            ></textarea>
          </div>
          <Button 
            type="submit" 
            className={isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}
          >
            Send Message
          </Button>
          {submitStatus === 'success' && (
            <p className={isDarkMode ? 'text-green-400' : 'text-green-600'}>Thank you for your message. We will get back to you soon!</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}