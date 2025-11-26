import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function ImageUploader({ currentImage, onUpload, label = "Upload Image", className = "" }) {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onUpload(file_url);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            {currentImage ? (
                <div className="relative group">
                    <img 
                        src={currentImage} 
                        alt="Uploaded" 
                        className="w-32 h-32 object-contain rounded-lg border border-slate-200 bg-white p-2"
                    />
                    <button
                        onClick={() => onUpload('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                    <Upload className="w-8 h-8 text-slate-400" />
                </div>
            )}
            <label className="cursor-pointer">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <Button variant="outline" size="sm" disabled={isUploading} asChild>
                    <span>
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" /> {label}</>
                        )}
                    </span>
                </Button>
            </label>
        </div>
    );
}