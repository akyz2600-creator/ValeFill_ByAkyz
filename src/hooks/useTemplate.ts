import { useEffect, useState } from 'react';

/** Carga la plantilla original public/vale-azul.jpg (empaquetada dentro del APK, funciona sin conexión). */
export function useTemplate(): { img: HTMLImageElement | null; error: string | null } {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () =>
      setError('No se encontró la plantilla vale-azul.jpg. Agrega la imagen original en public/vale-azul.jpg y vuelve a compilar.');
    image.src = 'vale-azul.jpg';
  }, []);

  return { img, error };
}
