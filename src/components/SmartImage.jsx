'use client';

import React, { useState, useEffect } from 'react';

const heicCache = new Map();

function isHeicUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.heic') || clean.endsWith('.heif');
}

export default function SmartImage({ src, alt, className, style }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => {
    if (!src) return '';
    if (heicCache.has(src)) return heicCache.get(src);
    return isHeicUrl(src) ? '' : src;
  });

  useEffect(() => {
    if (!src) {
      setResolvedSrc('');
      return;
    }

    if (!isHeicUrl(src)) {
      setResolvedSrc(src);
      return;
    }

    if (heicCache.has(src)) {
      setResolvedSrc(heicCache.get(src));
      return;
    }

    let active = true;

    async function convertHeic() {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default || heic2anyModule;
        const converted = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.82,
        });
        const finalBlob = Array.isArray(converted) ? converted[0] : converted;
        const objUrl = URL.createObjectURL(finalBlob);
        heicCache.set(src, objUrl);
        if (active) {
          setResolvedSrc(objUrl);
        }
      } catch (err) {
        console.warn('Erro ao converter imagem HEIC para exibição:', err);
        if (active) {
          setResolvedSrc(src);
        }
      }
    }

    convertHeic();

    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-subtle)',
          color: 'var(--text-muted)',
          fontSize: '0.78rem',
        }}
      >
        Carregando foto...
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt || ''} className={className} style={style} />;
}
