import React, { useState } from 'react';
import vendorRequestApi from '../api/vendorRequestApi';

const IDUploadModal = ({ requestId, attendeesCount, onClose, onSuccess }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles([...selectedFiles, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (selectedFiles.length === 0) {
            setMessage({ type: 'error', text: 'Please select at least one ID file to upload.' });
            return;
        }

        // Validate file types
        const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
        const invalidFile = selectedFiles.find(file => {
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            return !validExtensions.includes(ext);
        });

        if (invalidFile) {
            setMessage({ type: 'error', text: `Invalid file type: ${invalidFile.name}. Allowed types: ${validExtensions.join(', ')}` });
            return;
        }

        try {
            setUploading(true);

            const result = await vendorRequestApi.uploadIndividualIds(requestId, selectedFiles);

            if (result.success) {
                setMessage({ type: 'success', text: result.message || 'Individual IDs uploaded successfully!' });
                setTimeout(() => {
                    onSuccess && onSuccess(result.vendorRequest);
                    onClose();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to upload IDs' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'An error occurred while uploading' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                padding: '1rem'
            }}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '0.75rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1f2937'
                    }}>
                        Upload Individual IDs
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: '1.5rem',
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: 'calc(90vh - 200px)'
                }}>
                    {/* Info */}
                    <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                        color: '#1e40af'
                    }}>
                        <strong>ℹ️ Instructions:</strong>
                        <ul style={{
                            margin: '0.5rem 0 0 0',
                            paddingLeft: '1.25rem'
                        }}>
                            <li>Upload ID documents for all {attendeesCount} attendee(s)</li>
                            <li>Accepted formats: PDF, PNG, JPG, JPEG, WebP, GIF, BMP</li>
                            <li>Maximum 5MB per file</li>
                            <li>File names should be clear (e.g., "Ahmed_ID.pdf")</li>
                        </ul>
                    </div>

                    {/* File Upload Area */}
                    <div style={{
                        border: '2px dashed #bfdbfe',
                        borderRadius: '0.5rem',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        marginBottom: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                        }}
                        onDragLeave={(e) => {
                            e.currentTarget.style.borderColor = '#bfdbfe';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = '#bfdbfe';
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            const files = Array.from(e.dataTransfer.files || []);
                            setSelectedFiles([...selectedFiles, ...files]);
                        }}
                    >
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.jfif,.jpe,.jif,.webp,.gif,.bmp"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            id="fileInput"
                        />
                        <label htmlFor="fileInput" style={{
                            cursor: 'pointer',
                            display: 'block'
                        }}>
                            <div style={{
                                fontSize: '2rem',
                                marginBottom: '0.5rem'
                            }}>
                                📁
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: '#374151',
                                fontWeight: '500',
                                marginBottom: '0.25rem'
                            }}>
                                Drag and drop files here, or click to select
                            </div>
                            <div style={{
                                fontSize: '0.8125rem',
                                color: '#6b7280'
                            }}>
                                Select PDF or image files
                            </div>
                        </label>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div style={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <h3 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#374151'
                            }}>
                                Selected Files ({selectedFiles.length})
                            </h3>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}>
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            flex: 1,
                                            minWidth: 0
                                        }}>
                                            <span style={{
                                                fontSize: '1.25rem'
                                            }}>
                                                {file.type === 'application/pdf' ? '📄' : '🖼️'}
                                            </span>
                                            <div style={{
                                                flex: 1,
                                                minWidth: 0,
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    color: '#374151',
                                                    fontWeight: '500'
                                                }}>
                                                    {file.name}
                                                </div>
                                                <div style={{
                                                    color: '#9ca3af',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '1.125rem',
                                                padding: '0.25rem 0.5rem',
                                                flexShrink: 0
                                            }}
                                            title="Remove file"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message.text && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.375rem',
                            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                            color: message.type === 'error' ? '#991b1b' : '#166534',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#FFFFFF',
                            color: '#374151',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            opacity: uploading ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => !uploading && (e.target.style.backgroundColor = '#f9fafb')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#FFFFFF')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={uploading || selectedFiles.length === 0}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: uploading || selectedFiles.length === 0 ? '#d1d5db' : '#1e40af',
                            color: '#FFFFFF',
                            cursor: uploading || selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => !uploading && selectedFiles.length > 0 && (e.target.style.backgroundColor = '#1e3a8a')}
                        onMouseLeave={(e) => !uploading && selectedFiles.length > 0 && (e.target.style.backgroundColor = '#1e40af')}
                    >
                        {uploading ? (
                            <>
                                <span style={{
                                    width: '1rem',
                                    height: '1rem',
                                    border: '2px solid #ffffff',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.6s linear infinite',
                                    display: 'inline-block'
                                }}></span>
                                Uploading...
                            </>
                        ) : (
                            <>
                                ⬆️ Upload ({selectedFiles.length})
                            </>
                        )}
                    </button>
                </div>

                <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </form>
        </div>
    );
};

export default IDUploadModal;
