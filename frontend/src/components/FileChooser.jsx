import React, { useRef, useState } from 'react';

const FileChooser = ({ id, accept, multiple, onChange, disabled, buttonLabel = 'Choose File', showName = true, ariaLabel }) => {
    const inputRef = useRef(null);
    const [fileName, setFileName] = useState('');

    const handleClick = () => {
        if (disabled) return;
        inputRef.current && inputRef.current.click();
    };

    const handleChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileName(multiple ? `${files.length} file(s)` : files[0].name);
        }
        if (onChange) onChange(e);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleChange}
                style={{ display: 'none' }}
                aria-label={ariaLabel}
                disabled={disabled}
            />

            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: disabled ? '#9ca3af' : '#2b82f6',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: 600
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '1.05rem' }}>
                    upload_file
                </span>
                <span>{buttonLabel}</span>
            </button>

            {showName && (
                <div style={{ color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                    {fileName}
                </div>
            )}
        </div>
    );
};

export default FileChooser;
