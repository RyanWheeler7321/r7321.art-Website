#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps


SITE_BACKGROUND = (18, 13, 24)


def clean_input_path(value: str) -> str:
    return value[:-3] if value.endswith("[0]") else value


def open_frame(path: str, frame: int = 0) -> Image.Image:
    image = Image.open(clean_input_path(path))
    frame_count = max(1, int(getattr(image, "n_frames", 1)))
    image.seek(min(max(0, frame), frame_count - 1))
    return ImageOps.exif_transpose(image.copy())


def dominant_color(image: Image.Image) -> str:
    rgba = image.convert("RGBA")
    rgba.thumbnail((32, 32), Image.Resampling.BOX)
    red = green = blue = weight = 0.0
    pixels = rgba.get_flattened_data() if hasattr(rgba, "get_flattened_data") else rgba.getdata()
    for r, g, b, a in pixels:
        alpha = a / 255.0
        red += r * alpha + SITE_BACKGROUND[0] * (1.0 - alpha)
        green += g * alpha + SITE_BACKGROUND[1] * (1.0 - alpha)
        blue += b * alpha + SITE_BACKGROUND[2] * (1.0 - alpha)
        weight += 1.0
    if not weight:
        return "#120d18"
    return f"#{round(red / weight):02x}{round(green / weight):02x}{round(blue / weight):02x}"


def cmd_inspect(args: argparse.Namespace) -> int:
    source = Image.open(clean_input_path(args.source))
    frame_count = max(1, int(getattr(source, "n_frames", 1)))
    duration_ms = 0
    if frame_count > 1:
        for index in range(frame_count):
            source.seek(index)
            duration_ms += max(1, int(source.info.get("duration", 100)))
    first = open_frame(args.source)
    payload = {
        "width": first.width,
        "height": first.height,
        "frameCount": frame_count,
        "durationMs": duration_ms,
        "animated": frame_count > 1,
        "alpha": "A" in first.getbands() or "transparency" in source.info,
        "dominantColor": dominant_color(first),
    }
    print(json.dumps(payload, separators=(",", ":")), end="")
    return 0


def cmd_identify(args: argparse.Namespace) -> int:
    image = open_frame(args.source, args.frame)
    print(f"{image.width} {image.height}", end="")
    return 0


def cmd_resize(args: argparse.Namespace) -> int:
    image = open_frame(args.source, args.frame)
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    if args.width and image.width > args.width:
        height = max(1, round(image.height * args.width / image.width))
        image = image.resize((args.width, height), Image.Resampling.LANCZOS)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    suffix = output.suffix.lower()
    save_kwargs: dict[str, object] = {"optimize": True}
    if suffix in {".jpg", ".jpeg", ".webp"}:
        save_kwargs["quality"] = args.quality
    if suffix == ".webp":
        save_kwargs["method"] = 6
    image.save(output, **save_kwargs)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic image inspection and transforms for r7321.art.")
    sub = parser.add_subparsers(dest="command", required=True)

    inspect = sub.add_parser("inspect")
    inspect.add_argument("source")
    inspect.set_defaults(func=cmd_inspect)

    identify = sub.add_parser("identify")
    identify.add_argument("source")
    identify.add_argument("--frame", type=int, default=0)
    identify.set_defaults(func=cmd_identify)

    resize = sub.add_parser("resize")
    resize.add_argument("source")
    resize.add_argument("output")
    resize.add_argument("--width", type=int, required=True)
    resize.add_argument("--quality", type=int, default=82)
    resize.add_argument("--frame", type=int, default=0)
    resize.set_defaults(func=cmd_resize)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
