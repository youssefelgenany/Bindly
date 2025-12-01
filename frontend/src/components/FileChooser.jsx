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
        } else {
            setFileName('');
        }
        if (onChange) onChange(e);
    };

    // Reset fileName when input is cleared externally
    React.useEffect(() => {
        const input = inputRef.current;
        if (input && !input.files || (input.files && input.files.length === 0)) {
            setFileName('');
        }
    }, [id]);

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
                    backgroundColor: disabled ? '#9ca3af' : '#1D3557',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#152843';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled) {
                        e.target.style.backgroundColor = '#1D3557';
                    }
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
