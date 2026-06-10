import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  /** 闪烁相位 */
  phase: number;
  /** 闪烁速率 */
  speed: number;
  /** 基础亮度 0~1 */
  base: number;
}

/**
 * 星空背景：固定层，铺满 dashboard。
 * - 数百颗星点，独立闪烁
 * - light 主题下整体降亮（CSS opacity 控制）
 */
export default function StarField(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars: Star[] = [];
    let raf = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = (): void => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 按面积生成星点，约每 1.6 万 px² 一颗
      const count = Math.min(420, Math.floor((w * h) / 16000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
        base: 0.35 + Math.random() * 0.55,
      }));
    };

    const draw = (now: number): void => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const t = now / 1000;
      for (const s of stars) {
        const a = s.base * (0.55 + 0.45 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
        if (s.r > 0.9) {
          // 大星加柔光
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
          grd.addColorStop(0, `rgba(180,200,255,${a * 0.45})`);
          grd.addColorStop(1, 'rgba(180,200,255,0)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="cosmo-starfield" aria-hidden />;
}

