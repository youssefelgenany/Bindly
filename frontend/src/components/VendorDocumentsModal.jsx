import React, { useState } from 'react';
import { vendorApi } from '../api/vendorApi';
import FileChooser from './FileChooser';

const VendorDocumentsModal = ({ onClose, onSuccess, existingTaxCard, existingLogo, isVerified = false }) => {
    const [taxCardFile, setTaxCardFile] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [removeTaxCard, setRemoveTaxCard] = useState(false);
    const [removeLogo, setRemoveLogo] = useState(false);

    const handleTaxCardChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setTaxCardFile(file);
            setMessage({ type: '', text: '' });
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setMessage({ type: '', text: '' });
        }
    };

    const handleRemoveTaxCard = () => {
        setTaxCardFile(null);
        if (existingTaxCard) {
            setRemoveTaxCard(true);
        }
        // Reset the input element
        const input = document.getElementById('taxCardInput');
        if (input) {
            input.value = '';
        }
    };

    const handleRemoveLogo = () => {
        setLogoFile(null);
        if (existingLogo) {
            setRemoveLogo(true);
        }
        // Reset the input element
        const input = document.getElementById('logoInput');
        if (input) {
            input.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Allow submission if:
        // 1. New files are selected, OR
        // 2. Removing existing files, OR
        // 3. Verified (allows keeping existing files or updating)
        const hasNewFiles = taxCardFile || logoFile;
        const isRemoving = removeTaxCard || removeLogo;
        const hasChanges = hasNewFiles || isRemoving;
        
        if (!hasChanges && !isVerified) {
            setMessage({ type: 'error', text: 'Please select at least one file to upload.' });
            return;
        }
        
        // If verified but no changes, user is just viewing - don't submit
        if (isVerified && !hasChanges) {
            setMessage({ type: 'info', text: 'No changes to save.' });
            return;
        }

        // Validate file types
        if (taxCardFile) {
            const taxExt = taxCardFile.name.substring(taxCardFile.name.lastIndexOf('.')).toLowerCase();
            const validTaxExts = ['.pdf', '.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
            if (!validTaxExts.includes(taxExt)) {
                setMessage({ type: 'error', text: `Invalid tax card file type. Allowed types: ${validTaxExts.join(', ')}` });
                return;
            }
        }

        if (logoFile) {
            const logoExt = logoFile.name.substring(logoFile.name.lastIndexOf('.')).toLowerCase();
            const validLogoExts = ['.png', '.jpg', '.jpeg', '.jfif', '.jpe', '.jif', '.webp', '.gif', '.bmp'];
            if (!validLogoExts.includes(logoExt)) {
                setMessage({ type: 'error', text: `Invalid logo file type. Logo must be an image file (PNG, JPG, JPEG, WEBP, GIF, or BMP)` });
                return;
            }
        }

        try {
            setUploading(true);

            const formData = new FormData();
            if (taxCardFile) {
                formData.append('vendorTaxCard', taxCardFile);
            } else if (removeTaxCard) {
                // Signal to remove tax card
                formData.append('removeTaxCard', 'true');
            }
            if (logoFile) {
                formData.append('vendorLogo', logoFile);
            } else if (removeLogo) {
                // Signal to remove logo
                formData.append('removeLogo', 'true');
            }

            const result = await vendorApi.uploadDocuments(formData);

            if (result.success) {
                setMessage({ type: 'success', text: result.message || 'Documents uploaded successfully!' });
                setTimeout(() => {
                    onSuccess && onSuccess(result.vendor);
                    onClose();
                }, 1500);
            } else {
                setMessage({ type: 'error', text: result.message || 'Failed to upload documents' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'An error occurred while uploading' });
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
                    maxWidth: '500px',
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
                        {isVerified ? 'Edit Documents' : 'Upload Documents'}
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
                    overflowY: 'auto'
                }}>
                    {/* Tax Card Upload */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Tax Card
                        </label>
                        {(!taxCardFile && !existingTaxCard) || removeTaxCard ? (
                            <FileChooser
                                id="taxCardInput"
                                accept=".pdf,.png,.jpg,.jpeg,.jfif,.jpe,.jif,.webp,.gif,.bmp"
                                onChange={(e) => {
                                    handleTaxCardChange(e);
                                    setRemoveTaxCard(false);
                                }}
                                disabled={uploading}
                                buttonLabel="Choose File"
                                showName={false}
                                ariaLabel="Upload tax card"
                            />
                        ) : (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb',
                                position: 'relative'
                            }}>
                                <span className="material-symbols-outlined" style={{
                                    fontSize: '1.25rem',
                                    color: (taxCardFile?.type === 'application/pdf' || (existingTaxCard && existingTaxCard.toLowerCase().endsWith('.pdf'))) ? '#ef4444' : '#3b82f6'
                                }}>
                                    {(taxCardFile?.type === 'application/pdf' || (existingTaxCard && existingTaxCard.toLowerCase().endsWith('.pdf'))) ? 'description' : 'image'}
                                </span>
                                <span style={{ 
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {taxCardFile ? taxCardFile.name : (existingTaxCard ? existingTaxCard.split('/').pop() : 'Tax Card')}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveTaxCard}
                                    disabled={uploading}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        borderRadius: '50%',
                                        transition: 'all 0.2s',
                                        opacity: uploading ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!uploading) {
                                            e.target.style.backgroundColor = '#fee2e2';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                                        close
                                    </span>
                                </button>
                            </div>
                        )}
                        {((taxCardFile || existingTaxCard) && !removeTaxCard) && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <FileChooser
                                    id="taxCardInputReplace"
                                    accept=".pdf,.png,.jpg,.jpeg,.jfif,.jpe,.jif,.webp,.gif,.bmp"
                                    onChange={(e) => {
                                        handleTaxCardChange(e);
                                        setRemoveTaxCard(false);
                                    }}
                                    disabled={uploading}
                                    buttonLabel="Change File"
                                    showName={false}
                                    ariaLabel="Replace tax card"
                                />
                            </div>
                        )}
                    </div>

                    {/* Logo Upload */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Logo
                        </label>
                        {(!logoFile && !existingLogo) || removeLogo ? (
                            <FileChooser
                                id="logoInput"
                                accept="image/*"
                                onChange={(e) => {
                                    handleLogoChange(e);
                                    setRemoveLogo(false);
                                }}
                                disabled={uploading}
                                buttonLabel="Choose File"
                                showName={false}
                                ariaLabel="Upload logo"
                            />
                        ) : (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '0.5rem',
                                border: '1px solid #e5e7eb',
                                position: 'relative'
                            }}>
                                <span className="material-symbols-outlined" style={{
                                    fontSize: '1.25rem',
                                    color: '#3b82f6'
                                }}>
                                    image
                                </span>
                                <span style={{ 
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {logoFile ? logoFile.name : (existingLogo ? existingLogo.split('/').pop() : 'Logo')}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    disabled={uploading}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        borderRadius: '50%',
                                        transition: 'all 0.2s',
                                        opacity: uploading ? 0.5 : 1
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!uploading) {
                                            e.target.style.backgroundColor = '#fee2e2';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                                        close
                                    </span>
                                </button>
                            </div>
                        )}
                        {((logoFile || existingLogo) && !removeLogo) && (
                            <div style={{ marginTop: '0.5rem' }}>
                                <FileChooser
                                    id="logoInputReplace"
                                    accept="image/*"
                                    onChange={(e) => {
                                        handleLogoChange(e);
                                        setRemoveLogo(false);
                                    }}
                                    disabled={uploading}
                                    buttonLabel="Change File"
                                    showName={false}
                                    ariaLabel="Replace logo"
                                />
                            </div>
                        )}
                    </div>

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
                        disabled={uploading || (!taxCardFile && !logoFile && !removeTaxCard && !removeLogo && !isVerified)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: uploading || (!taxCardFile && !logoFile && !removeTaxCard && !removeLogo && !isVerified) ? '#d1d5db' : '#1D3557',
                            color: '#FFFFFF',
                            cursor: uploading || (!taxCardFile && !logoFile && !removeTaxCard && !removeLogo && !isVerified) ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!uploading && (taxCardFile || logoFile || removeTaxCard || removeLogo || isVerified)) {
                                e.target.style.backgroundColor = '#152843';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!uploading && (taxCardFile || logoFile || removeTaxCard || removeLogo || isVerified)) {
                                e.target.style.backgroundColor = '#1D3557';
                            }
                        }}
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
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                    upload_file
                                </span>
                                Upload
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

export default VendorDocumentsModal;

