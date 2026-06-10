import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { DedupeMode, Theme } from '../../core/types';

interface Props {
  busy: boolean;
  hint: string;
  theme: Theme;
  dedupeMode: DedupeMode;
  onTheme: (t: Theme) => void;
  onDedupeMode: (m: DedupeMode) => void;
  /**
   * Single combined action: organize == dedupe + group + sort + refresh.
   * Sort/Refresh are no longer separate buttons; "整理" is the One Big Verb.
   */
  onOrganize: () => void;
}

/** A small hand-drawn cat sleeping on the toolbar's right edge. */
function CatDoodle(): JSX.Element {
  return (
    <svg
      className="cosmo-cat"
      width="56"
      height="34"
      viewBox="0 0 64 38"
      aria-hidden
    >
      {/* Body — a soft loaf */}
      <path
        d="M6 26 C 8 14, 22 8, 32 8 C 44 8, 56 14, 58 26 L 58 30 L 6 30 Z"
        fill="var(--cat-fill, #f5d6c0)"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Left ear */}
      <path
        d="M11 18 L 8 8 L 18 14 Z"
        fill="var(--cat-fill, #f5d6c0)"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Right ear */}
      <path
        d="M46 14 L 56 8 L 53 18 Z"
        fill="var(--cat-fill, #f5d6c0)"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* Tail flicks behind body */}
      <path
        d="M58 28 Q 64 24, 62 18 Q 60 14, 56 16"
        fill="none"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Sleepy eyes (>‿<) */}
      <path
        d="M22 22 q 2 -2, 4 0 M38 22 q 2 -2, 4 0"
        fill="none"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Tiny smile + whiskers */}
      <path
        d="M30 26 q 2 1.5, 4 0"
        fill="none"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M16 24 L 21 25 M 16 26 L 21 26 M 48 24 L 43 25 M 48 26 L 43 26"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Z Z — sleepy */}
      <path
        d="M48 6 L 52 6 L 48 10 L 52 10"
        fill="none"
        stroke="var(--cat-line, #5a3a2a)"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function Toolbar(props: Props): JSX.Element {
  const {
    busy,
    hint,
    theme,
    dedupeMode,
    onTheme,
    onDedupeMode,
    onOrganize,
  } = props;

  // 3D parallax hover：外层胶囊做 perspective rotateX/Y；内层内容做反向平移产生视差
  const zoneRef = useRef<HTMLDivElement>(null);
  const outerRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!zone || !outer || !inner) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduceMotion) return;

    // 在感应区上挂 perspective，让 rotateX/Y 真正产生 3D 透视
    gsap.set(zone, { perspective: 650 });
    gsap.set(outer, { transformStyle: 'preserve-3d' });

    const outerRX = gsap.quickTo(outer, 'rotationX', { ease: 'power3', duration: 0.5 });
    const outerRY = gsap.quickTo(outer, 'rotationY', { ease: 'power3', duration: 0.5 });
    const innerX = gsap.quickTo(inner, 'x', { ease: 'power3', duration: 0.5 });
    const innerY = gsap.quickTo(inner, 'y', { ease: 'power3', duration: 0.5 });

    const onMove = (e: PointerEvent): void => {
      const rect = zone.getBoundingClientRect();
      // 0~1 归一化坐标
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      // 外层旋转（rotateX 上轻微抬头、rotateY 跟随水平）
      outerRX(gsap.utils.interpolate(12, -12, ny));
      outerRY(gsap.utils.interpolate(-15, 15, nx));
      // 内容反向平移做视差（强度小一些，避免溢出按钮）
      innerX(gsap.utils.interpolate(-4, 4, nx));
      innerY(gsap.utils.interpolate(-3, 3, ny));
    };
    const onLeave = (): void => {
      outerRX(0);
      outerRY(0);
      innerX(0);
      innerY(0);
    };

    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerleave', onLeave);
    return () => {
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf([outer, inner]);
    };
  }, []);

  const handleOrganize = (): void => {
    onOrganize();
  };

  return (
    <header className="cosmo-toolbar">
      <div className="cosmo-toolbar__zone" ref={zoneRef}>
        <button
          ref={outerRef}
          className="cosmo-toolbar__primary"
          onClick={handleOrganize}
          disabled={busy}
          title="一键整理：分组 + 去重 + 按最近访问排序"
          aria-label="一键整理"
        >
          <span className="cosmo-toolbar__primary-bg" aria-hidden />
          <span className="cosmo-toolbar__primary-inner" ref={innerRef}>
            <svg
              className="cosmo-toolbar__primary-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 7h12 M4 12h8 M4 17h5 M16 13l4 4-4 4 M20 17H10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{busy ? '整理中…' : '一键整理'}</span>
            <svg
              className="cosmo-btn__sparkle"
              width="9"
              height="9"
              viewBox="0 0 16 16"
              aria-hidden
            >
              <path
                d="M8 1.5 C8.4 5.2 9.8 6.6 13.5 7 C9.8 7.4 8.4 8.8 8 12.5 C7.6 8.8 6.2 7.4 2.5 7 C6.2 6.6 7.6 5.2 8 1.5 Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </button>
      </div>

      {hint && (
        <span className="cosmo-toolbar__hint" title={hint}>
          {hint}
        </span>
      )}

      <CatDoodle />

      <div className="cosmo-toolbar__group cosmo-toolbar__group--right">
        <button
          className="cosmo-toolbar__icon-btn cosmo-toolbar__icon-btn--wide"
          onClick={() => {
            const next: DedupeMode =
              dedupeMode === 'strict' ? 'loose' : dedupeMode === 'loose' ? 'domain' : 'strict';
            onDedupeMode(next);
          }}
          title={
            dedupeMode === 'strict'
              ? '去重模式：严格 (URL 完全一致才合并) · 点击切换为宽松'
              : dedupeMode === 'loose'
                ? '去重模式：宽松 (忽略 hash / 追踪参数 / 顺序) · 点击切换为整域'
                : '去重模式：整域 (同域名只留最近访问的 1 个) · 点击切换为严格'
          }
          aria-label="切换去重模式"
        >
          <span className="cosmo-toolbar__pill" data-mode={dedupeMode}>
            {dedupeMode === 'strict' ? 'Strict' : dedupeMode === 'loose' ? 'Loose' : 'Domain'}
          </span>
        </button>
        <button
          className="cosmo-toolbar__icon-btn"
          onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? '切换到明亮' : '切换到深色'}
          aria-label="切换主题"
        >
          {theme === 'dark' ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path
                d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 14.5A8 8 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
