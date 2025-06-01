"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileText, Copy, Download, Zap, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FileType = "html" | "css" | "json" | "js" | "jsx"

interface ValidationResult {
  isValid: boolean
  error?: string
}

interface MinificationResult {
  minified: string
  originalSize: number
  minifiedSize: number
  reductionPercentage: number
}

export default function SlimCodeApp() {
  const [inputMethod, setInputMethod] = useState<"upload" | "paste">("paste")
  const [selectedFileType, setSelectedFileType] = useState<FileType>("js")
  const [inputCode, setInputCode] = useState("")
  const [fileName, setFileName] = useState("")
  const [validation, setValidation] = useState<ValidationResult>({ isValid: false })
  const [minificationResult, setMinificationResult] = useState<MinificationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const fileTypeExtensions: Record<FileType, string[]> = {
    html: [".html", ".htm"],
    css: [".css"],
    json: [".json"],
    js: [".js"],
    jsx: [".jsx"],
  }

  const validateContent = useCallback((content: string, type: FileType): ValidationResult => {
    if (!content.trim()) {
      return { isValid: false, error: "Content cannot be empty" }
    }

    try {
      switch (type) {
        case "html":
          if (!/<[^>]+>/.test(content)) {
            return { isValid: false, error: "Invalid HTML: No valid HTML tags found" }
          }
          break
        case "css":
          if (!/[^{}]*\{[^{}]*\}/.test(content.replace(/\/\*[\s\S]*?\*\//g, ""))) {
            return { isValid: false, error: "Invalid CSS: No valid CSS rules found" }
          }
          break
        case "json":
          JSON.parse(content)
          break
        case "js":
          if (!/(?:function|const|let|var|class|import|export|=>)/.test(content)) {
            return {
              isValid: false,
              error: `Invalid ${type.toUpperCase()}: No valid JavaScript syntax found`,
            }
          }
          break
        case "jsx":
          if (!/(?:function|const|let|var|class|import|export|=>|<[A-Z]|<\/[A-Z])/.test(content)) {
            return { isValid: false, error: `Invalid ${type.toUpperCase()}: No valid JSX syntax found` }
          }
          break
      }
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid ${type.toUpperCase()}: ${error instanceof Error ? error.message : "Syntax error"}`,
      }
    }
  }, [])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (file.size > 1024 * 1024) {
        setValidation({ isValid: false, error: "File size exceeds 1MB limit" })
        return
      }

      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
      const validExtensions = fileTypeExtensions[selectedFileType]

      if (!validExtensions.includes(fileExtension)) {
        setValidation({
          isValid: false,
          error: `File extension ${fileExtension} does not match selected type ${selectedFileType.toUpperCase()}. Expected: ${validExtensions.join(", ")}`,
        })
        return
      }

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setInputCode(content)
        const validationResult = validateContent(content, selectedFileType)
        setValidation(validationResult)
      }
      reader.readAsText(file)
    },
    [selectedFileType, validateContent, fileTypeExtensions],
  )

  const handleCodeChange = useCallback(
    (value: string) => {
      setInputCode(value)
      if (inputMethod === "paste") {
        const validationResult = validateContent(value, selectedFileType)
        setValidation(validationResult)
      }
    },
    [inputMethod, selectedFileType, validateContent],
  )

  const handleFileTypeChange = useCallback((type: FileType) => {
    setSelectedFileType(type)
    setInputCode("")
    setFileName("")
    setValidation({ isValid: false })
    setMinificationResult(null)
  }, [])

  const mockMinify = useCallback((content: string, type: FileType): string => {
    switch (type) {
      case "html":
        return content
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/\s+/g, " ")
          .replace(/>\s+</g, "><")
          .trim()

      case "css":
        return content
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\s+/g, " ")
          .replace(/;\s+/g, ";")
          .replace(/{\s+/g, "{")
          .replace(/\s+}/g, "}")
          .trim()

      case "json":
        return JSON.stringify(JSON.parse(content))

      case "js":
      case "jsx":
        return content
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\s+/g, " ")
          .replace(/;\s+/g, ";")
          .replace(/{\s+/g, "{")
          .replace(/\s+}/g, "}")
          .trim()

      default:
        return content
    }
  }, [])

  const handleMinify = useCallback(async () => {
    if (!validation.isValid || !inputCode.trim()) return

    setIsProcessing(true)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const minified = mockMinify(inputCode, selectedFileType)
    const originalSize = new Blob([inputCode]).size
    const minifiedSize = new Blob([minified]).size
    const reductionPercentage = Math.round(((originalSize - minifiedSize) / originalSize) * 100)

    setMinificationResult({
      minified,
      originalSize,
      minifiedSize,
      reductionPercentage,
    })

    setIsProcessing(false)
  }, [validation.isValid, inputCode, selectedFileType, mockMinify])

  const copyToClipboard = useCallback(async () => {
    if (!minificationResult) return

    try {
      await navigator.clipboard.writeText(minificationResult.minified)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }, [minificationResult])

  const downloadFile = useCallback(() => {
    if (!minificationResult) return

    const extension = fileTypeExtensions[selectedFileType][0]
    const downloadFileName = fileName ? fileName.replace(/\.[^/.]+$/, `.min${extension}`) : `minified.min${extension}`

    const blob = new Blob([minificationResult.minified], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = downloadFileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [minificationResult, selectedFileType, fileName, fileTypeExtensions])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">SlimCode</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Minify your HTML, CSS, JSON, JavaScript, and JSX files instantly. All processing happens in your browser -
            no server uploads required.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Input Code
              </CardTitle>
              <CardDescription>Upload a file or paste your code to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">File Type</label>
                <Select value={selectedFileType} onValueChange={handleFileTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="js">JavaScript</SelectItem>
                    <SelectItem value="jsx">JSX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "upload" | "paste")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">Paste Code</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    placeholder={`Paste your ${selectedFileType.toUpperCase()} code here...`}
                    value={inputCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="upload" className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Upload a {selectedFileType.toUpperCase()} file (max 1MB)
                    </p>
                    <input
                      type="file"
                      accept={fileTypeExtensions[selectedFileType].join(",")}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Choose File
                      </label>
                    </Button>
                    {fileName && <p className="text-xs text-gray-500 mt-2">Selected: {fileName}</p>}
                  </div>

                  {inputCode && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm font-medium mb-2">File Content Preview:</p>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                        {inputCode.substring(0, 200)}
                        {inputCode.length > 200 && "..."}
                      </pre>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {inputCode && (
                <Alert className={validation.isValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {validation.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={validation.isValid ? "text-green-700" : "text-red-700"}>
                    {validation.isValid ? "Valid input detected" : validation.error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleMinify}
                disabled={!validation.isValid || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Minify Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Minified Output
              </CardTitle>
              <CardDescription>Your optimized code with size statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {minificationResult ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600">Original</p>
                      <p className="font-semibold text-blue-600">{formatBytes(minificationResult.originalSize)}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600">Minified</p>
                      <p className="font-semibold text-green-600">{formatBytes(minificationResult.minifiedSize)}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-gray-600">Saved</p>
                      <p className="font-semibold text-purple-600">{minificationResult.reductionPercentage}%</p>
                    </div>
                  </div>

                  <div className="relative">
                    <Textarea
                      value={minificationResult.minified}
                      readOnly
                      className="min-h-[300px] font-mono text-sm bg-gray-50"
                    />
                    <Badge className="absolute top-2 right-2 bg-green-100 text-green-800">Minified</Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                    <Button onClick={downloadFile} variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Upload or paste your code and click "Minify Code" to see the optimized output</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>All processing happens locally in your browser. No files are uploaded to any server.</p>
        </div>
      </div>
    </div>
  )
}
