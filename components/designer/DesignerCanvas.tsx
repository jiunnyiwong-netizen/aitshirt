"use client";

import Konva from "konva";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Group, Image as KImage, Layer, Rect, Stage, Transformer } from "react-konva";
import useImage from "use-image";
import { MAX_WIDTH_FRACTION, type DesignTransform, type PrintArea } from "@/lib/print-area";

// Two-finger gestures need hit detection while dragging.
Konva.hitOnDragEnabled = true;

export type DesignerExport = {
  // Mockup preview with the design, about 800 px wide.
  preview: () => string;
  // Small JPEG for the cart.
  thumbnail: () => string;
};

type Placement = { x: number; y: number; scale: number; rotation: number };

type Props = {
  mockupSrc: string;
  printArea: PrintArea;
  photo: HTMLImageElement | null;
  onChange: (t: DesignTransform | null) => void;
  exportRef: RefObject<DesignerExport | null>;
};

const MIN_WIDTH_FRACTION = 0.05;

export default function DesignerCanvas({ mockupSrc, printArea: pa, photo, onChange, exportRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const handleRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const editorOnly = useRef<Konva.Node[]>([]);
  const pinch = useRef<{ dist: number; angle: number } | null>(null);

  const [mockup] = useImage(mockupSrc);
  const [width, setWidth] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);

  // Fit the stage to its container; everything is drawn in mockup pixels and scaled.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const viewScale = width / pa.mockup_width;
  const height = pa.mockup_height * viewScale;

  // Photo size at scale 1: fits inside the print area.
  const base = useMemo(() => {
    if (!photo) return null;
    const fit = Math.min(pa.width / photo.naturalWidth, pa.height / photo.naturalHeight);
    return { w: photo.naturalWidth * fit, h: photo.naturalHeight * fit };
  }, [photo, pa.width, pa.height]);

  const minScale = base ? (MIN_WIDTH_FRACTION * pa.width) / base.w : 0;
  const maxScale = base ? (MAX_WIDTH_FRACTION * pa.width) / base.w : 1;
  const clampScale = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale],
  );

  // New photo: centre it in the print area.
  useEffect(() => {
    setPlacement(photo ? { x: pa.x + pa.width / 2, y: pa.y + pa.height / 2, scale: 1, rotation: 0 } : null);
  }, [photo, pa.x, pa.y, pa.width, pa.height]);

  // Report the placement relative to the print area.
  useEffect(() => {
    if (!placement || !base) return onChange(null);
    let rotation = placement.rotation % 360;
    if (rotation > 180) rotation -= 360;
    if (rotation <= -180) rotation += 360;
    onChange({
      cx: (placement.x - pa.x) / pa.width,
      cy: (placement.y - pa.y) / pa.height,
      width: (base.w * placement.scale) / pa.width,
      rotation,
    });
  }, [placement, base, pa, onChange]);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    tr.nodes(handleRef.current && photo ? [handleRef.current] : []);
    tr.getLayer()?.batchDraw();
  }, [photo, placement !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  exportRef.current = {
    preview: () => snapshot(800, "image/png"),
    thumbnail: () => snapshot(240, "image/jpeg"),
  };

  function snapshot(targetWidth: number, mimeType: string): string {
    const stage = stageRef.current;
    if (!stage || !width) return "";
    const hidden = [...editorOnly.current, transformerRef.current].filter(Boolean) as Konva.Node[];
    hidden.forEach((n) => n.hide());
    const url = stage.toDataURL({ pixelRatio: targetWidth / width, mimeType, quality: 0.8 });
    hidden.forEach((n) => n.show());
    stage.batchDraw();
    return url;
  }

  const readNode = () => {
    const node = handleRef.current;
    if (!node) return;
    const scale = clampScale(node.scaleX());
    node.scale({ x: scale, y: scale });
    setPlacement({ x: node.x(), y: node.y(), scale, rotation: node.rotation() });
  };

  const onTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2 || !placement) return;
    e.evt.preventDefault();
    handleRef.current?.stopDrag();
    const [a, b] = [touches[0], touches[1]];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const angle = (Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180) / Math.PI;
    const last = pinch.current;
    pinch.current = { dist, angle };
    if (!last) return;
    setPlacement({
      ...placement,
      scale: clampScale(placement.scale * (dist / last.dist)),
      rotation: placement.rotation + (angle - last.angle),
    });
  };

  const nudge = (change: Partial<Placement>) => placement && setPlacement({ ...placement, ...change });

  const photoProps =
    photo && base && placement
      ? {
          image: photo,
          width: base.w,
          height: base.h,
          offsetX: base.w / 2,
          offsetY: base.h / 2,
          x: placement.x,
          y: placement.y,
          scaleX: placement.scale,
          scaleY: placement.scale,
          rotation: placement.rotation,
        }
      : null;

  return (
    <div>
      <div ref={containerRef} className="w-full">
        {width > 0 && (
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            scaleX={viewScale}
            scaleY={viewScale}
            onTouchMove={onTouchMove}
            onTouchEnd={() => (pinch.current = null)}
            onMouseDown={(e) => e.target === e.target.getStage() && transformerRef.current?.nodes([])}
          >
            <Layer listening={false}>
              <Rect width={pa.mockup_width} height={pa.mockup_height} fill="#ffffff" />
              {mockup && <KImage image={mockup} width={pa.mockup_width} height={pa.mockup_height} />}
            </Layer>
            <Layer>
              {photoProps && (
                <>
                  {/* Faint copy shows the parts outside the print area; it is the one you drag. */}
                  <KImage
                    {...photoProps}
                    ref={(n) => {
                      handleRef.current = n;
                      if (n && !editorOnly.current.includes(n)) editorOnly.current.push(n);
                    }}
                    opacity={0.25}
                    draggable
                    onDragMove={readNode}
                    onDragEnd={readNode}
                    onTransform={readNode}
                    onTransformEnd={readNode}
                    onMouseDown={() => transformerRef.current?.nodes([handleRef.current!])}
                    onTouchStart={() => transformerRef.current?.nodes([handleRef.current!])}
                  />
                  {/* What will actually print. */}
                  <Group clipX={pa.x} clipY={pa.y} clipWidth={pa.width} clipHeight={pa.height} listening={false}>
                    <KImage {...photoProps} />
                  </Group>
                </>
              )}
              <Rect
                ref={(n) => {
                  if (n && !editorOnly.current.includes(n)) editorOnly.current.push(n);
                }}
                x={pa.x}
                y={pa.y}
                width={pa.width}
                height={pa.height}
                stroke="#3b82f6"
                strokeWidth={2 / (viewScale || 1)}
                dash={[8 / (viewScale || 1), 6 / (viewScale || 1)]}
                listening={false}
              />
              <Transformer
                ref={transformerRef}
                keepRatio
                rotateEnabled
                rotationSnaps={[0, 90, 180, 270]}
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                anchorSize={22}
                anchorCornerRadius={11}
                borderStroke="#3b82f6"
                anchorStroke="#3b82f6"
                ignoreStroke
              />
            </Layer>
          </Stage>
        )}
      </div>

      {placement && (
        <div className="mt-3 grid grid-cols-5 gap-2 text-sm">
          <ToolButton label="Smaller" onClick={() => nudge({ scale: clampScale(placement.scale / 1.1) })}>−</ToolButton>
          <ToolButton label="Bigger" onClick={() => nudge({ scale: clampScale(placement.scale * 1.1) })}>+</ToolButton>
          <ToolButton label="Rotate left" onClick={() => nudge({ rotation: placement.rotation - 15 })}>⟲</ToolButton>
          <ToolButton label="Rotate right" onClick={() => nudge({ rotation: placement.rotation + 15 })}>⟳</ToolButton>
          <ToolButton
            label="Reset"
            onClick={() =>
              setPlacement({ x: pa.x + pa.width / 2, y: pa.y + pa.height / 2, scale: 1, rotation: 0 })
            }
          >
            Reset
          </ToolButton>
        </div>
      )}
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="h-11 rounded-lg border border-neutral-300 bg-white text-lg font-medium text-neutral-800 active:bg-neutral-100"
    >
      {children}
    </button>
  );
}
