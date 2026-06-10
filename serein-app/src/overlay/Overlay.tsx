import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Trigger { text: string; dueAt: number | null; ts: number; }

const PUNCHLINES = [
  '别摸鱼啦！冲鸭！',
  '再不动手就来不及咯～',
  '时间在悄悄溜走哦！',
  'DDL 已开始倒计时！',
  '快快快，干就完事啦！',
  '截止前的你 vs 现在的你？',
];

function pickPunchline(seed: number) {
  return PUNCHLINES[seed % PUNCHLINES.length];
}

function formatDue(due: number | null): string {
  if (!due) return '快到截止啦！';
  const d = new Date(due);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm} 截止`;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (isTomorrow) return `明天 ${hh}:${mm} 截止`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm} 截止`;
}

interface CharSegment { ch: string; }

export function Overlay() {
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = window.serein.onOverlayTrigger((data) => {
      setTrigger({ ...data });
    });
    return off;
  }, []);

  const punchline = useMemo(
    () => trigger ? pickPunchline(trigger.ts) : '',
    [trigger]
  );

  // 多段文案展开成单字符
  const chars: CharSegment[] = useMemo(() => {
    if (!trigger) return [];
    const segments = [
      `「${trigger.text}」`,
      '   ',
      formatDue(trigger.dueAt),
      '   ',
      punchline,
      '   ',
      '——别摸了，干活！',
    ];
    const out: CharSegment[] = [];
    for (const s of segments) {
      for (const ch of Array.from(s)) out.push({ ch });
    }
    return out;
  }, [trigger, punchline]);

  useEffect(() => {
    if (!trigger || !trackRef.current) return;

    const track = trackRef.current;
    const charEls = Array.from(track.querySelectorAll<HTMLElement>('.Horizontal__char'));

    // 主 tween：track 从右向左匀速滑动；containerAnimation 模式
    const scrollTween = gsap.to(track, {
      xPercent: -100,
      ease: 'none',
      duration: 40,
      onComplete: () => {
        setTrigger(null);
        window.serein.dismissOverlay();
      },
    });

    // 每个字符随主 tween 进入屏幕时触发入场动画
    const charTriggers: ScrollTrigger[] = [];
    charEls.forEach((char) => {
      const tween = gsap.from(char, {
        yPercent: gsap.utils.random(-200, 200),
        rotation: gsap.utils.random(-20, 20),
        ease: 'back.out(1.2)',
        scrollTrigger: {
          trigger: char,
          containerAnimation: scrollTween,
          start: 'left 100%',
          end: 'left 30%',
          scrub: 1,
        },
      });
      const st = (tween as gsap.core.Tween).scrollTrigger;
      if (st) charTriggers.push(st);
    });

    return () => {
      scrollTween.kill();
      charTriggers.forEach((st) => st.kill());
    };
  }, [trigger, chars]);

  if (!trigger) return null;

  return (
    <div className="overlay-stage" key={trigger.ts}>
      <div className="Horizontal" ref={wrapperRef}>
        <div className="Horizontal__text" ref={trackRef}>
          {chars.map((c, i) => (
            <span key={i} className="Horizontal__char heading-xl">
              {c.ch === ' ' ? '\u00A0' : c.ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
