#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageOps


def clean_input_path(value: str) -> str:
    return value[:-3] if value.endswith('[0]') else value


def open_image(path: str) -> Image.Image:
    image = Image.open(clean_input_path(path))
    try:
        image.seek(0)
    except EOFError:
        pass
    return ImageOps.exif_transpose(image)


def cmd_identify(args: argparse.Namespace) -> int:
    image = open_image(args.source)
    print(f'{image.width} {image.height}', end='')
    return 0


def cmd_resize(args: argparse.Namespace) -> int:
    image = open_image(args.source)
    if image.mode not in {'RGB', 'RGBA'}:
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    if args.width and image.width > args.width:
        height = round(image.height * args.width / image.width)
        image = image.resize((args.width, height), Image.Resampling.LANCZOS)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    save_kwargs = {'optimize': True}
    suffix = output.suffix.lower()
    if suffix in {'.jpg', '.jpeg', '.webp'}:
        save_kwargs['quality'] = args.quality
    image.save(output, **save_kwargs)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Small Pillow fallback for r7321.art image prep.')
    sub = parser.add_subparsers(dest='command', required=True)

    identify = sub.add_parser('identify')
    identify.add_argument('source')
    identify.set_defaults(func=cmd_identify)

    resize = sub.add_parser('resize')
    resize.add_argument('source')
    resize.add_argument('output')
    resize.add_argument('--width', type=int, required=True)
    resize.add_argument('--quality', type=int, default=82)
    resize.set_defaults(func=cmd_resize)

    args = parser.parse_args()
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
