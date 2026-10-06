import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';

/**
 * ImageViewerModal
 * High-resolution lightbox and inspection viewer for factory equipment photos.
 * Preserves aspect ratio, provides smooth zoom (in/out/reset/wheel/drag),
 * and supports navigation between multiple attached images.
 */
export const ImageViewerModal = ({
  isOpen = false,
  images = [],
  initialIndex = 0,
  onClose = () => {}
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync initialIndex when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Handle keyboard shortcuts (Escape to close, Arrow keys to navigate)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [images.length]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.35, 4.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(prev - 0.35, 0.6);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Toggle double-click zoom (1x <-> 2x)
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (zoom > 1) {
      handleResetZoom();
    } else {
      setZoom(2.2);
    }
  };

  // Wheel zoom support
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev + 0.2, 4.0));
    } else {
      setZoom((prev) => {
        const next = Math.max(prev - 0.2, 0.6);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Drag pan support when zoomed in
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const imageSrc = typeof currentImage === 'string' ? currentImage : (currentImage?.url || currentImage?.data || currentImage?.src || '');
  const imageName = currentImage?.name || `Equipment Image ${currentIndex + 1}`;

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = currentImage?.name || `equipfix_inspection_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(5, 8, 16, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* Top Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          color: '#ffffff',
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
        }}
      >
        {/* Title and Index indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            color: '#60a5fa',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em'
          }}>
            FACTORY INSPECTION
          </div>
          <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>
            {imageName}
          </span>
          {images.length > 1 && (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
              {currentIndex + 1} of {images.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Zoom controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            backgroundColor: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            padding: '2px 6px'
          }}>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              style={{
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomOut size={16} />
            </button>

            <span style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              fontWeight: 600,
              minWidth: '46px',
              textAlign: 'center'
            }}>
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In (+)"
              style={{
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <ZoomIn size={16} />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset Zoom (0)"
              style={{
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            title="Download image"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <Download size={15} />
            <span>Save</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            title="Close viewer (Esc)"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            title="Previous image (Left Arrow)"
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* High-Resolution Centered Image */}
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
          style={{
            maxWidth: '90vw',
            maxHeight: '82vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center'
          }}
        >
          <img
            src={imageSrc}
            alt={imageName}
            draggable={false}
            style={{
              maxWidth: '90vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            title="Next image (Right Arrow)"
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              transition: 'background-color 0.15s ease'
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Information & Thumbnails Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 24px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          zIndex: 10,
          gap: '12px'
        }}
      >
        {images.length > 1 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            padding: '6px 10px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {images.map((img, idx) => {
              const thumbSrc = typeof img === 'string' ? img : (img?.url || img?.data || img?.src || '');
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.2)',
                    padding: 0,
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.6,
                    transform: isSelected ? 'scale(1.05)' : 'none',
                    transition: 'all 0.15s ease',
                    backgroundColor: '#0f172a'
                  }}
                >
                  <img
                    src={thumbSrc}
                    alt={`Thumbnail ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Tip: Double-click or scroll wheel to zoom • Drag to pan • Press Esc to close
          </span>
        )}
      </div>
    </div>
  );
};

export default ImageViewerModal;
