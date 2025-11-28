import React, { useState } from 'react';
import { Mail, MessageSquare, Users, Send, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        
        // Send email notification
        await base44.integrations.Core.SendEmail({
            to: 'matt@volaria.com', // You can change this to your actual email
            subject: `Volaria Contact: ${formData.subject}`,
            body: `
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}
            `
        });
        
        setSending(false);
        setSent(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        Have questions, ideas, or want to get involved? I would love to hear from you!
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Info Cards */}
                    <div className="space-y-4">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6">
                                <MessageSquare className="w-10 h-10 text-emerald-600 mb-3" />
                                <h3 className="font-bold text-slate-900 mb-2">Ask Questions</h3>
                                <p className="text-sm text-slate-600">
                                    Curious about the history, clubs, or how it all works? Just ask!
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6">
                                <Users className="w-10 h-10 text-blue-600 mb-3" />
                                <h3 className="font-bold text-slate-900 mb-2">Get Involved</h3>
                                <p className="text-sm text-slate-600">
                                    Want to contribute ideas, create club histories, or help expand the world?
                                </p>
                            </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6">
                                <Mail className="w-10 h-10 text-purple-600 mb-3" />
                                <h3 className="font-bold text-slate-900 mb-2">Share Feedback</h3>
                                <p className="text-sm text-slate-600">
                                    Let me know what you think of the site and what you'd like to see!
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Form */}
                    <Card className="md:col-span-2 border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle>Send a Message</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sent ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                                    <p className="text-slate-600 mb-6">Thanks for reaching out. I will get back to you soon.</p>
                                    <Button variant="outline" onClick={() => setSent(false)}>
                                        Send Another Message
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">Your Name</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                placeholder="John Smith"
                                                required
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                                placeholder="john@example.com"
                                                required
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="subject">Subject</Label>
                                        <Input
                                            id="subject"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                            placeholder="What's this about?"
                                            required
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="message">Message</Label>
                                        <Textarea
                                            id="message"
                                            value={formData.message}
                                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                                            placeholder="Tell me what's on your mind..."
                                            rows={6}
                                            required
                                            className="mt-1"
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        disabled={sending}
                                    >
                                        {sending ? (
                                            'Sending...'
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}