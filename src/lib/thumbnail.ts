// Vẽ thumbnail YouTube 1280x720 bằng Canvas: ảnh nền (AI) + chữ tiếng Việt do app tự vẽ.

export const THUMB_W = 1280;
export const THUMB_H = 720;

export type ThumbnailTemplate = "left" | "center" | "bold";

export const THUMBNAIL_TEMPLATES: { id: ThumbnailTemplate; name: string }[] = [
  { id: "left", name: "Chữ bên trái" },
  { id: "center", name: "Chữ giữa" },
  { id: "bold", name: "Số phần lớn" },
];

/** Font có hỗ trợ tiếng Việt, nạp qua next/font (biến CSS khai báo trong layout.tsx) */
export interface ThumbnailFont {
  id: string;
  name: string;
  /** Nhóm thể loại gợi ý (kinh dị, tiên hiệp, đô thị...) */
  group: string;
  cssVar: string;
  /** Độ đậm thực sự có của font tương ứng với 3 mức dùng trong template */
  weights: { 900: string; 800: string; 600: string };
}

export const THUMBNAIL_FONTS: ThumbnailFont[] = [
  { id: "be-vietnam", name: "Be Vietnam Pro", group: "Đa năng", cssVar: "--font-title", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "montserrat", name: "Montserrat", group: "Đa năng", cssVar: "--font-montserrat", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "lexend", name: "Lexend", group: "Đa năng", cssVar: "--font-lexend", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "grenze", name: "Grenze Gotisch (gothic)", group: "Kinh dị / u ám", cssVar: "--font-grenze", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "sedgwick", name: "Sedgwick Ave (nguệch ngoạc)", group: "Kinh dị / u ám", cssVar: "--font-sedgwick", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "blackops", name: "Black Ops One (stencil)", group: "Kinh dị / u ám", cssVar: "--font-blackops", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "cormorant", name: "Cormorant Garamond (thanh lịch)", group: "Tiên hiệp / cổ trang", cssVar: "--font-cormorant", weights: { 900: "700", 800: "700", 600: "600" } },
  { id: "philosopher", name: "Philosopher (huyền bí)", group: "Tiên hiệp / cổ trang", cssVar: "--font-philosopher", weights: { 900: "700", 800: "700", 600: "400" } },
  { id: "yeseva", name: "Yeseva One (trang trí)", group: "Tiên hiệp / cổ trang", cssVar: "--font-yeseva", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "charm", name: "Charm (thư pháp)", group: "Tiên hiệp / cổ trang", cssVar: "--font-charm", weights: { 900: "700", 800: "700", 600: "400" } },
  { id: "noto-display", name: "Noto Serif Display", group: "Tiên hiệp / cổ trang", cssVar: "--font-noto-display", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "playfair", name: "Playfair Display (có chân)", group: "Tiên hiệp / cổ trang", cssVar: "--font-playfair", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "dancing", name: "Dancing Script (bay bướm)", group: "Ngôn tình / nhẹ nhàng", cssVar: "--font-dancing", weights: { 900: "700", 800: "700", 600: "600" } },
  { id: "pacifico", name: "Pacifico (mềm mại)", group: "Ngôn tình / nhẹ nhàng", cssVar: "--font-pacifico", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "lobster", name: "Lobster (nghệ thuật)", group: "Ngôn tình / nhẹ nhàng", cssVar: "--font-lobster", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "amatic", name: "Amatic SC (viết tay)", group: "Ngôn tình / nhẹ nhàng", cssVar: "--font-amatic", weights: { 900: "700", 800: "700", 600: "400" } },
  { id: "merriweather", name: "Merriweather (cổ điển)", group: "Ngôn tình / nhẹ nhàng", cssVar: "--font-merriweather", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "oswald", name: "Oswald (chữ hẹp)", group: "Đô thị / hiện đại", cssVar: "--font-oswald", weights: { 900: "700", 800: "700", 600: "500" } },
  { id: "anton", name: "Anton (đậm hẹp)", group: "Đô thị / hiện đại", cssVar: "--font-anton", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "bungee", name: "Bungee (biển hiệu)", group: "Đô thị / hiện đại", cssVar: "--font-bungee", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "fjalla", name: "Fjalla One", group: "Đô thị / hiện đại", cssVar: "--font-fjalla", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "barlow", name: "Barlow Condensed", group: "Đô thị / hiện đại", cssVar: "--font-barlow", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "saira", name: "Saira Condensed", group: "Đô thị / hiện đại", cssVar: "--font-saira", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "space", name: "Space Grotesk", group: "Đô thị / hiện đại", cssVar: "--font-space", weights: { 900: "700", 800: "700", 600: "500" } },
  { id: "tektur", name: "Tektur (công nghệ)", group: "Hành động / viễn tưởng", cssVar: "--font-tektur", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "bangers", name: "Bangers (truyện tranh)", group: "Hành động / viễn tưởng", cssVar: "--font-bangers", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "sigmar", name: "Sigmar One (dày)", group: "Hành động / viễn tưởng", cssVar: "--font-sigmar", weights: { 900: "400", 800: "400", 600: "400" } },
  { id: "roboto-slab", name: "Roboto Slab", group: "Hành động / viễn tưởng", cssVar: "--font-roboto-slab", weights: { 900: "900", 800: "800", 600: "600" } },
  { id: "alfa", name: "Alfa Slab One", group: "Hành động / viễn tưởng", cssVar: "--font-alfa", weights: { 900: "400", 800: "400", 600: "400" } },
];

/** Danh sách font theo nhóm thể loại, dùng cho ô chọn font */
export const THUMBNAIL_FONT_GROUPS: { group: string; fonts: ThumbnailFont[] }[] = Array.from(
  THUMBNAIL_FONTS.reduce((map, f) => {
    map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return map;
  }, new Map<string, ThumbnailFont[]>())
).map(([group, fonts]) => ({ group, fonts }));

export const DEFAULT_FONT_ID = THUMBNAIL_FONTS[0].id;

/** Các khối chữ có thể kéo thả trên thumbnail */
export type ThumbnailElementId =
  | "label"
  | "title"
  | "chapter"
  | "channel"
  | "logo"
  | "watermark"
  | "note"
  | "marquee";

export const THUMBNAIL_ELEMENT_NAMES: Record<ThumbnailElementId, string> = {
  label: "Nhãn phần",
  title: "Tiêu đề sách",
  chapter: "Tên chương",
  channel: "Tên kênh",
  logo: "Logo kênh",
  watermark: "Watermark",
  note: "Ghi chú",
  marquee: "Chữ chạy",
};

/** Các khối chỉ xuất hiện trên khung video (không hiện trên thumbnail) */
export const VIDEO_ONLY_ELEMENTS: ThumbnailElementId[] = ["watermark", "note", "marquee"];

/** Tuỳ chỉnh của một khối chữ so với mặc định của template (toàn bộ đều tuỳ chọn) */
export interface ThumbnailElementStyle {
  dx?: number;
  dy?: number;
  /** Hệ số cỡ chữ, 1 = mặc định */
  scale?: number;
  /** id font; bỏ trống thì dùng font mặc định */
  font?: string;
  /** Màu chữ dạng #rrggbb; bỏ trống thì dùng màu mặc định của khối */
  color?: string;
  /** In đậm / nghiêng / gạch chân; bỏ trống = theo mặc định của khối */
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Độ trong suốt 0.1-1; bỏ trống = mặc định của khối (watermark mờ 0.6) */
  opacity?: number;
}
export type ThumbnailOffsets = Partial<Record<ThumbnailElementId, ThumbnailElementStyle>>;

export interface ThumbnailBox {
  id: ThumbnailElementId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThumbnailResult {
  canvas: HTMLCanvasElement;
  /** Vùng chiếm của từng khối chữ (đã cộng offset) để hit-test khi kéo thả */
  boxes: ThumbnailBox[];
}

export interface ThumbnailOptions {
  /** Tuỳ chỉnh vị trí / cỡ chữ / font từng khối, do người dùng chỉnh */
  offsets?: ThumbnailOffsets;
  /** Font mặc định cho các khối không chọn font riêng */
  font?: string;
  /** Data URL của ảnh nền; null thì dùng nền gradient tối */
  background: string | null;
  template: ThumbnailTemplate;
  title: string;
  label: string;
  chapterTitle?: string;
  channel?: string;
  /** thumbnail: chỉ các khối chính; video: thêm watermark, ghi chú, chữ chạy */
  view?: "thumbnail" | "video";
  /** Data URL logo kênh */
  logo?: string | null;
  logoOnThumbnail?: boolean;
  watermark?: string;
  note?: string;
  marqueeText?: string;
  /** true: vẽ chữ chạy đứng yên (preview); false: chỉ vẽ nền băng chữ, chữ do FFmpeg cho chạy */
  marqueeStaticText?: boolean;
}

const ACCENT = "#f59e0b";

/** Màu mặc định của từng khối chữ */
export const THUMBNAIL_DEFAULT_COLORS: Record<ThumbnailElementId, string> = {
  label: ACCENT,
  title: "#ffffff",
  chapter: "#e4e4e7",
  channel: ACCENT,
  logo: "#ffffff",
  watermark: "#ffffff",
  note: "#fde68a",
  marquee: "#ffffff",
};

const DEFAULT_OPACITY: Partial<Record<ThumbnailElementId, number>> = { watermark: 0.6 };

/** Chọn chữ đen hoặc trắng cho dễ đọc trên nền màu `hex` (dùng cho chữ trong khung nhãn) */
function contrastText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#ffffff";
}

function findFont(id: string | undefined): ThumbnailFont {
  return THUMBNAIL_FONTS.find((f) => f.id === id) ?? THUMBNAIL_FONTS[0];
}

function fontFamily(font: ThumbnailFont): string {
  if (typeof document === "undefined") return "sans-serif";
  const v = getComputedStyle(document.body).getPropertyValue(font.cssVar).trim();
  return v ? `${v}, sans-serif` : "sans-serif";
}

async function ensureFonts(fonts: ThumbnailFont[]): Promise<void> {
  try {
    await Promise.all(
      fonts.flatMap((f) => {
        const family = fontFamily(f);
        return Object.values(f.weights).map((w) =>
          document.fonts.load(`${w} 48px ${family}`, "Đề thi đẫm máu")
        );
      })
    );
    await document.fonts.ready;
  } catch {
    // Font lỗi thì canvas tự rơi về font hệ thống
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không đọc được ảnh nền"));
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(THUMB_W / img.width, THUMB_H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(test).width > maxWidth) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Giảm cỡ chữ cho tới khi vừa `maxWidth` và không quá `maxLines` dòng. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: string,
  family: string,
  maxSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number
): { size: number; lines: string[] } {
  let size = maxSize;
  for (; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${minSize}px ${family}`;
  return { size: minSize, lines: wrapLines(ctx, text, maxWidth).slice(0, maxLines) };
}

// Bật gạch chân cho khối chữ đang vẽ (đặt trong place(), vẽ đồng bộ nên không bị chồng giữa các lần gọi)
let underlineActive = false;

function strokedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  strokeWidth: number
) {
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);

  if (underlineActive) {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? 24);
    const w = ctx.measureText(text).width;
    const left = ctx.textAlign === "center" ? x - w / 2 : ctx.textAlign === "right" ? x - w : x;
    const thickness = Math.max(2, size * 0.07);
    const lineY = y + size * 0.14;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = thickness + strokeWidth * 0.5;
    ctx.beginPath();
    ctx.moveTo(left, lineY);
    ctx.lineTo(left + w, lineY);
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(left, lineY);
    ctx.lineTo(left + w, lineY);
    ctx.stroke();
  }
}

type ElementStyle = ReturnType<ReturnType<typeof buildStyleOf>>;

function buildStyleOf(opts: ThumbnailOptions) {
  return (id: ThumbnailElementId) => {
    const st = opts.offsets?.[id];
    const font = findFont(st?.font ?? opts.font);
    return {
      dx: st?.dx ?? 0,
      dy: st?.dy ?? 0,
      scale: Math.min(3, Math.max(0.3, st?.scale ?? 1)),
      color: st?.color && /^#[0-9a-f]{6}$/i.test(st.color) ? st.color : THUMBNAIL_DEFAULT_COLORS[id],
      bold: st?.bold,
      italic: st?.italic ?? false,
      underline: st?.underline ?? false,
      opacity: Math.min(1, Math.max(0.1, st?.opacity ?? DEFAULT_OPACITY[id] ?? 1)),
      font,
      family: fontFamily(font),
    };
  };
}

/** Chuỗi "kiểu + độ đậm" đặt trước cỡ chữ trong ctx.font, đã tính in đậm / nghiêng của người dùng */
function ws(s: ElementStyle, defaultWeight: 900 | 800 | 600): string {
  const w = s.font.weights;
  let weight: string;
  if (s.bold === true) weight = w[900] === w[600] ? "700" : w[900];
  else if (s.bold === false) weight = w[600];
  else weight = w[defaultWeight];
  return `${s.italic ? "italic " : ""}${weight}`;
}

export async function renderThumbnail(opts: ThumbnailOptions): Promise<ThumbnailResult> {
  const styleOf = buildStyleOf(opts);
  const view = opts.view ?? "thumbnail";
  const isVideo = view === "video";
  const ids: ThumbnailElementId[] = ["label", "title", "chapter", "channel", "watermark", "note", "marquee"];
  await ensureFonts(Array.from(new Set(ids.map((id) => styleOf(id).font))));

  const canvas = document.createElement("canvas");
  canvas.width = THUMB_W;
  canvas.height = THUMB_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");

  // Nền
  const bgGrad = ctx.createLinearGradient(0, 0, THUMB_W, THUMB_H);
  bgGrad.addColorStop(0, "#18181b");
  bgGrad.addColorStop(1, "#0c0a1f");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);
  if (opts.background) {
    drawCover(ctx, await loadImage(opts.background));
  }

  // Lớp phủ tối cho dễ đọc chữ
  if (opts.template === "left") {
    const g = ctx.createLinearGradient(0, 0, THUMB_W * 0.75, 0);
    g.addColorStop(0, "rgba(0,0,0,0.88)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = opts.template === "center" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.38)";
  }
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  ctx.textBaseline = "alphabetic";

  const boxes: ThumbnailBox[] = [];
  type LocalBox = { x: number; y: number; w: number; h: number };

  // Vẽ một khối chữ tại vị trí mặc định + offset người dùng kéo; draw trả về vùng chiếm (toạ độ mặc định)
  const place = (id: ThumbnailElementId, draw: (s: ReturnType<typeof styleOf>) => LocalBox | null) => {
    const s = styleOf(id);
    ctx.save();
    ctx.translate(s.dx, s.dy);
    ctx.globalAlpha = s.opacity;
    underlineActive = s.underline;
    const b = draw(s);
    underlineActive = false;
    ctx.restore();
    if (b) boxes.push({ id, x: b.x + s.dx, y: b.y + s.dy, w: b.w, h: b.h });
  };

  // Vùng chiếm của nhiều dòng chữ cùng cỡ (ctx.font đã được đặt sẵn)
  const textBox = (
    lines: string[],
    x: number,
    firstBaseline: number,
    size: number,
    lineHeight: number,
    align: "left" | "center" | "right"
  ): LocalBox => {
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
    const left = align === "left" ? x : align === "center" ? x - w / 2 : x - w;
    return {
      x: left,
      y: firstBaseline - size,
      w,
      h: size + (lines.length - 1) * lineHeight + size * 0.25,
    };
  };

  const drawLines = (
    lines: string[],
    x: number,
    firstBaseline: number,
    lineHeight: number,
    fill: string,
    strokeWidth: number
  ) => {
    let y = firstBaseline;
    for (const line of lines) {
      strokedText(ctx, line, x, y, fill, strokeWidth);
      y += lineHeight;
    }
  };

  // Khối nhiều dòng (tiêu đề / tên chương): cỡ chữ và độ rộng tối đa nhân theo hệ số scale
  const fitBlock = (
    s: ReturnType<typeof styleOf>,
    text: string,
    weight: 900 | 800 | 600,
    maxSize: number,
    minSize: number,
    maxWidth: number,
    maxLines: number
  ) => {
    const k = s.scale;
    const t = fitText(
      ctx,
      text,
      ws(s, weight),
      s.family,
      maxSize * k,
      Math.max(10, minSize * k),
      Math.min(THUMB_W - 80, maxWidth * Math.max(1, k)),
      maxLines
    );
    return t;
  };

  // ---- Chữ chạy: vẽ nền băng chữ trước để các khối khác đè lên trên (hit-test ưu tiên khối vẽ sau)
  if (isVideo && opts.marqueeText?.trim()) {
    const text = opts.marqueeText.trim();
    const g = marqueeGeometry(ctx, styleOf("marquee"), text);
    place("marquee", (s) => {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, g.topBase, THUMB_W, g.height);
      if (opts.marqueeStaticText !== false) {
        ctx.textAlign = "left";
        ctx.font = g.font;
        strokedText(ctx, text, MARQUEE_PAD, g.topBase + g.baseline, s.color, 5);
      }
      return { x: 0, y: g.topBase, w: THUMB_W, h: g.height };
    });
  }

  // Vị trí cố định của khối tiêu đề (để tên chương bám theo bên dưới)
  const titleState = { baseline: 0, lh: 0, lines: 0 };

  if (opts.template === "left") {
    const x = 72;
    ctx.textAlign = "left";

    place("label", (s) => {
      const size = 40 * s.scale;
      ctx.font = `${ws(s, 800)} ${size}px ${s.family}`;
      const w = ctx.measureText(opts.label).width + 48 * s.scale;
      const h = 68 * s.scale;
      ctx.fillStyle = s.color;
      ctx.fillRect(x, 110, w, h);
      ctx.fillStyle = contrastText(s.color);
      ctx.fillText(opts.label, x + 24 * s.scale, 110 + h / 2 + size * 0.35);
      return { x, y: 110, w, h };
    });

    place("title", (s) => {
      const t = fitBlock(s, opts.title, 900, 104, 48, 640, 4);
      const baseline = 230 + t.size;
      const lh = t.size * 1.12;
      Object.assign(titleState, { baseline, lh, lines: t.lines.length });
      ctx.font = `${ws(s, 900)} ${t.size}px ${s.family}`;
      drawLines(t.lines, x, baseline, lh, s.color, 10 * s.scale);
      return textBox(t.lines, x, baseline, t.size, lh, "left");
    });

    if (opts.chapterTitle) {
      const chapterText = opts.chapterTitle;
      place("chapter", (s) => {
        const c = fitBlock(s, chapterText, 600, 34, 22, 640, 2);
        const baseline = titleState.baseline + titleState.lines * titleState.lh + 10;
        ctx.font = `${ws(s, 600)} ${c.size}px ${s.family}`;
        drawLines(c.lines, x, baseline, c.size * 1.3, s.color, 6);
        return textBox(c.lines, x, baseline, c.size, c.size * 1.3, "left");
      });
    }
    if (opts.channel) {
      const channel = opts.channel;
      place("channel", (s) => {
        const size = 28 * s.scale;
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, channel, x, THUMB_H - 56, s.color, 6);
        return textBox([channel], x, THUMB_H - 56, size, 0, "left");
      });
    }
  } else if (opts.template === "center") {
    const cx = THUMB_W / 2;
    ctx.textAlign = "center";

    place("label", (s) => {
      const text = opts.label.toUpperCase();
      const size = 44 * s.scale;
      ctx.font = `${ws(s, 800)} ${size}px ${s.family}`;
      strokedText(ctx, text, cx, 170, s.color, 8);
      return textBox([text], cx, 170, size, 0, "center");
    });

    place("title", (s) => {
      const t = fitBlock(s, opts.title, 900, 112, 52, 1080, 3);
      const lh = t.size * 1.12;
      const baseline = (THUMB_H - t.lines.length * lh) / 2 + t.size * 0.9 + 20;
      Object.assign(titleState, { baseline, lh, lines: t.lines.length });
      ctx.font = `${ws(s, 900)} ${t.size}px ${s.family}`;
      drawLines(t.lines, cx, baseline, lh, s.color, 12 * s.scale);
      return textBox(t.lines, cx, baseline, t.size, lh, "center");
    });

    if (opts.chapterTitle) {
      const chapterText = opts.chapterTitle;
      place("chapter", (s) => {
        const size = 34 * s.scale;
        const baseline = titleState.baseline + titleState.lines * titleState.lh + 20;
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, chapterText, cx, baseline, s.color, 6);
        return textBox([chapterText], cx, baseline, size, 0, "center");
      });
    }
    if (opts.channel) {
      const channel = opts.channel;
      place("channel", (s) => {
        const size = 28 * s.scale;
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, channel, cx, THUMB_H - 48, s.color, 6);
        return textBox([channel], cx, THUMB_H - 48, size, 0, "center");
      });
    }
  } else {
    const x = 64;
    ctx.textAlign = "left";

    place("title", (s) => {
      const t = fitBlock(s, opts.title, 800, 76, 40, 1100, 2);
      const lh = t.size * 1.12;
      ctx.font = `${ws(s, 800)} ${t.size}px ${s.family}`;
      drawLines(t.lines, x, 100 + t.size, lh, s.color, 8 * s.scale);
      return textBox(t.lines, x, 100 + t.size, t.size, lh, "left");
    });

    place("label", (s) => {
      const big = fitText(
        ctx,
        opts.label.toUpperCase(),
        ws(s, 900),
        s.family,
        230 * s.scale,
        Math.max(10, 90 * s.scale),
        Math.min(THUMB_W - 80, 1150 * Math.max(1, s.scale)),
        1
      );
      ctx.font = `${ws(s, 900)} ${big.size}px ${s.family}`;
      const text = big.lines[0] ?? "";
      strokedText(ctx, text, x, THUMB_H - 130, s.color, 14 * s.scale);
      return textBox([text], x, THUMB_H - 130, big.size, 0, "left");
    });

    if (opts.chapterTitle) {
      const chapterText = opts.chapterTitle;
      place("chapter", (s) => {
        const size = 32 * s.scale;
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, chapterText, x, THUMB_H - 70, s.color, 6);
        return textBox([chapterText], x, THUMB_H - 70, size, 0, "left");
      });
    }
    if (opts.channel) {
      const channel = opts.channel;
      place("channel", (s) => {
        const size = 28 * s.scale;
        ctx.textAlign = "right";
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, channel, THUMB_W - 56, THUMB_H - 56, s.color, 6);
        return textBox([channel], THUMB_W - 56, THUMB_H - 56, size, 0, "right");
      });
    }
  }

  // ---- Logo kênh (luôn có trên video; trên thumbnail tuỳ chọn)
  if (opts.logo && (isVideo || opts.logoOnThumbnail !== false)) {
    const img = await loadImage(opts.logo);
    place("logo", (s) => {
      const h = 110 * s.scale;
      const w = h * (img.width / Math.max(1, img.height));
      const x = THUMB_W - 40 - w;
      ctx.drawImage(img, x, 36, w, h);
      return { x, y: 36, w, h };
    });
  }

  if (isVideo) {
    // ---- Watermark chống reup: chữ mờ một dòng
    if (opts.watermark?.trim()) {
      const text = opts.watermark.trim();
      place("watermark", (s) => {
        const size = 30 * s.scale;
        ctx.textAlign = "left";
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        strokedText(ctx, text, 40, 36 + size, s.color, 5);
        return textBox([text], 40, 36 + size, size, 0, "left");
      });
    }

    // ---- Ghi chú (lịch đăng, thông báo...): nhiều dòng, canh phải, dưới góc phải
    if (opts.note?.trim()) {
      const noteText = opts.note.trim();
      place("note", (s) => {
        const size = 28 * s.scale;
        ctx.textAlign = "right";
        ctx.font = `${ws(s, 600)} ${size}px ${s.family}`;
        const maxW = Math.min(THUMB_W - 80, 520 * Math.max(1, s.scale));
        const lines = noteText
          .split(/\r?\n/)
          .flatMap((para) => (para.trim() ? wrapLines(ctx, para, maxW) : [""]))
          .slice(0, 6);
        const lh = size * 1.3;
        const first = THUMB_H - 110 - (lines.length - 1) * lh;
        drawLines(lines, THUMB_W - 40, first, lh, s.color, 5);
        return textBox(lines, THUMB_W - 40, first, size, lh, "right");
      });
    }
  }

  return { canvas, boxes };
}

const MARQUEE_PAD = 24;

/** Kích thước và vị trí băng chữ chạy (dùng chung cho vẽ khung video và dựng ảnh chữ chạy) */
function marqueeGeometry(ctx: CanvasRenderingContext2D, s: ElementStyle, text: string) {
  const size = 32 * s.scale;
  const font = `${ws(s, 600)} ${size}px ${s.family}`;
  ctx.save();
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  ctx.restore();
  const height = Math.round(size * 1.7);
  return {
    size,
    font,
    textWidth,
    height,
    baseline: height / 2 + size * 0.35,
    /** Vị trí mặc định (chưa cộng độ lệch người dùng kéo) */
    topBase: THUMB_H - height - 8,
  };
}

export interface MarqueeStrip {
  /** PNG nền trong suốt chứa đúng một đoạn chữ chạy */
  dataUrl: string;
  width: number;
  height: number;
  /** Toạ độ y (trên khung 1280x720) nơi đặt băng chữ */
  top: number;
}

/** Dựng ảnh PNG trong suốt của chữ chạy để FFmpeg cho chạy ngang khung video. */
export async function renderMarqueeStrip(opts: ThumbnailOptions): Promise<MarqueeStrip | null> {
  const text = opts.marqueeText?.trim();
  if (!text) return null;
  const s = buildStyleOf(opts)("marquee");
  await ensureFonts([s.font]);

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Trình duyệt không hỗ trợ canvas");
  const g = marqueeGeometry(measure, s, text);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(g.textWidth) + MARQUEE_PAD * 2;
  canvas.height = g.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas");
  ctx.globalAlpha = s.opacity;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = g.font;
  underlineActive = s.underline;
  strokedText(ctx, text, MARQUEE_PAD, g.baseline, s.color, 5);
  underlineActive = false;

  return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, top: Math.round(g.topBase + s.dy) };
}

/** Xuất JPG, giảm chất lượng dần cho tới khi nhỏ hơn giới hạn của YouTube (2MB). */
export function canvasToJpegDataUrl(canvas: HTMLCanvasElement, maxBytes = 1_900_000): string {
  let quality = 0.92;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length * 0.75 > maxBytes && quality > 0.5) {
    quality -= 0.08;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}
