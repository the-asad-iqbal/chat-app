"use client"
import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

const Page: React.FC = () => {
    const input = useRef<HTMLInputElement>(null)
    const [history, setHistory] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [currentAssistantMessage, setCurrentAssistantMessage] = useState("")
    const [streamComplete, setStreamComplete] = useState(false)

    const handleChat = useCallback(async () => {
        if (!input.current?.value || isLoading) return

        const newUserMessage: ChatMessage = {
            role: "user",
            content: input.current.value,
        }

        setHistory(prevHistory => [...prevHistory, newUserMessage])
        setIsLoading(true)
        setStreamComplete(false)
        input.current.value = ""
        setCurrentAssistantMessage("")

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages: [...history, newUserMessage]
                })
            })

            if (!response.ok) {
                throw new Error('Failed to fetch')
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                setCurrentAssistantMessage(prev => prev + chunk)
            }

        } catch (error) {
            console.error('Error:', error)
        } finally {
            setStreamComplete(true)
            setIsLoading(false)
        }
    }, [history, isLoading])

    useEffect(() => {
        if (streamComplete && currentAssistantMessage) {
            setHistory(prevHistory => [
                ...prevHistory,
                { role: "assistant", content: currentAssistantMessage }
            ])
            setCurrentAssistantMessage("")
            setStreamComplete(false)
        }
    }, [streamComplete, currentAssistantMessage])

    const renderMessage = (content: string) => (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                        <SyntaxHighlighter
                            {...props}
                            style={a11yDark}
                            language={match[1]}
                            PreTag="div"
                        >{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                    ) : (
                        <code {...props} className={className}>
                            {children}
                        </code>
                    )
                }
            }}
        >
            {content}
        </ReactMarkdown>
    )

    return (
        <div className='flex flex-col w-full h-full min-h-screen'>
            {history.map((item, index) => (
                <div
                    className={`flex gap-5 justify-start items-start ${item.role === "user" ? "bg-zinc-950" : "bg-zinc-900"} w-full h-full p-20`}
                    key={index}
                >
                    <div className='flex-col flex'>
                        {item.role === "user" ? (
                            <img src="https://api.dicebear.com/9.x/bottts/svg?seed=speak" className='w-20' alt="User Avatar" />
                        ) : (
                            <img src="https://api.dicebear.com/9.x/dylan/svg" className='w-20' alt="Assistant Avatar" />
                        )}
                        <span className='text-center'>{item.role}</span>
                    </div>
                    <div className="prose prose-invert max-w-none">
                        {renderMessage(item.content)}
                    </div>
                </div>
            ))}

            {(isLoading || streamComplete) && currentAssistantMessage && (
                <div className='flex gap-5 justify-start items-start bg-zinc-900 w-full h-full p-20'>
                    <div className='flex-col flex'>
                        <img src="https://api.dicebear.com/9.x/dylan/svg" className='w-20' alt="Assistant Avatar" />
                        <span className='text-center'>assistant</span>
                    </div>
                    <div className="prose prose-invert max-w-none">
                        {renderMessage(currentAssistantMessage)}
                    </div>
                </div>
            )}

            <div>
                <input
                    type="text"
                    className='w-full h-20 px-3 p-2 bg-zinc-900 text-white shadow-lg border'
                    ref={input}
                    disabled={isLoading}
                />
                <button
                    type="button"
                    className='w-full px-3 p-2 bg-zinc-950 text-white shadow-lg border'
                    onClick={handleChat}
                    disabled={isLoading}
                >
                    Submit
                </button>
            </div>
        </div>
    )
}

export default Page