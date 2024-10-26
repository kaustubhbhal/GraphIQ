'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ZoomIn, ZoomOut, Send, Eraser, Mic, MicOff, VolumeX, Volume2 } from 'lucide-react'
import Mermaid from 'mermaid'
import html2canvas from 'html2canvas'

export default function Component() {
  const [mermaidSvg, setMermaidSvg] = useState('')
  const [zoomLevel, setZoomLevel] = useState(1.2)
  const canvasRef = useRef(null)
  const playgroundRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { text: "Welcome to GraphIQ! How can I assist you with the learning playground?", isUser: false },
  ])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const speechSynthesisRef = useRef(null)
  const voiceRef = useRef(null)

  useEffect(() => {
    const mermaidDiagram = `
      graph TD
        8((8)) --> 3((3))
        8 --> 10((10))
        3 --> 1((1))
        3 --> 6((6))
        6 --> 4((4))
        6 --> 7((7))
        10 --> 14((14))
        14 --> 13((13))
    `

    Mermaid.render('mermaid-diagram', mermaidDiagram).then((result) => {
      setMermaidSvg(result.svg)
    })

    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis

    // Set up voice
    const setVoice = () => {
      const voices = speechSynthesisRef.current.getVoices()
      // Try to find an Indian English male voice
      const indianMaleVoice = voices.find(voice => 
        voice.lang.startsWith('en-IN') && voice.name.toLowerCase().includes('male')
      )
      if (indianMaleVoice) {
        voiceRef.current = indianMaleVoice
      } else {
        // If no Indian male voice is found, try to find any Indian English voice
        const indianVoice = voices.find(voice => voice.lang.startsWith('en-IN'))
        if (indianVoice) {
          voiceRef.current = indianVoice
        } else {
          // If no Indian voice is found, use the first available English voice
          const englishVoice = voices.find(voice => voice.lang.startsWith('en-'))
          if (englishVoice) {
            voiceRef.current = englishVoice
          } else if (voices.length > 0) {
            // If no English voice is found, use the first available voice
            voiceRef.current = voices[0]
          }
        }
      }
    }

    if (speechSynthesisRef.current.onvoiceschanged !== undefined) {
      speechSynthesisRef.current.onvoiceschanged = setVoice
    }

    setVoice() // Call it once in case voices are already loaded

    return () => {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'  // Semi-transparent blue
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
  }, [])

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
      } else {
        throw new Error('Failed to save image')
      }
    } catch (error) {
      console.error('Error saving image:', error)
      setSubmissionStatus('Failed to save the screenshot. Please try again.')
    }

    // Clear the status message after 5 seconds
    setTimeout(() => setSubmissionStatus(''), 5000)
  }

  const handleSend = async (messageToSend = input) => {
    if (!messageToSend.trim()) return

    setMessages((prev) => [...prev, { text: messageToSend, isUser: true }])

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: messageToSend }),
      })

      const data = await response.json()

      if (response.ok) {
        const botMessage = { text: data.output, isUser: false }
        setMessages((prev) => [...prev, botMessage])
        speakMessage(botMessage.text)
      } else {
        setMessages((prev) => [...prev, { text: "Error: " + data.error, isUser: false }])
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [...prev, { text: "An error occurred.", isUser: false }])
    }

    setInput('')
  }

  const speakMessage = (text) => {
    if (speechSynthesisRef.current && voiceRef.current) {
      setIsSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voiceRef.current
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 md:mb-0">
            GraphIQ
          </h1>
          <nav className="space-x-2 md:space-x-4">
            <Button variant="ghost" className="text-blue-600 hover:text-blue-800 transition-colors">Home</Button>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-800 transition-colors">About</Button>
            <Button variant="ghost" className="text-blue-600 hover:text-blue-800 transition-colors">Contact</Button>
          </nav>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white shadow-lg">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-2xl font-semibold text-gray-800">Learning Playground</CardTitle>
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
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-between items-center bg-gray-100 bg-opacity-90 p-2 rounded-lg">
                <div className="flex items-center space-x-2 mb-2 md:mb-0">
                  <Button onClick={zoomOut} variant="outline" size="icon" className="text-blue-600 border-blue-300">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button onClick={zoomIn} variant="outline" size="icon" className="text-blue-600 border-blue-300">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Zoom: {Math.round(zoomLevel * 100)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={clearCanvas} variant="outline" className="text-blue-600 border-blue-300">
                    <Eraser className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button onClick={handleSubmit} variant="outline" className="text-blue-600 border-blue-300">
                    Submit
                  </Button>
                </div>
              </div>
              {submissionStatus && (
                <div className="absolute top-4 left-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                  {submissionStatus}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-2xl font-semibold text-gray-800">Chat with Gemini</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages.map((msg, index) => 
                    <div
                      key={index}
                      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t border-gray-200 p-4">
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
                  className="flex-grow bg-white border-gray-300 text-gray-800 placeholder-gray-400"
                />
                <Button
                  type="button"
                  onClick={toggleListening}
                  className={`${
                    isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  onClick={isSpeaking ? stopSpeaking : () => {}}
                  className={`${
                    isSpeaking ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300'
                  } text-white`}
                  aria-label={isSpeaking ? 'Stop speaking' : 'Not speaking'}
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}