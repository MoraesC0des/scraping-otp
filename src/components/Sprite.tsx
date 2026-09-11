import { useEffect, useState } from 'react';
import { spriteUrl } from '../utils/sprites';

interface SpriteProps {
  id: number;
  name: string;
}

/** Mini sprite com fallback (inicial do nome) quando a imagem não está disponível. */
export function Sprite({ id, name }: SpriteProps) {
  const url = spriteUrl(id);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <span className="sprite sprite-fallback" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="sprite"
      src={url}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}