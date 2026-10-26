from PIL import Image, ImageChops
from pathlib import Path

source = Path(r'C:\Users\coolf\Desktop\Chunnu\Headshots Farhan\Current Look Headshot.jpeg')
target = Path(r'C:\Users\coolf\OneDrive\Documents\claude\portoflio\Creative Opportunities\Application Materials\Farhan Naushad - Current Look Exact Crop.png')

with Image.open(source) as original:
    # The source's photo fills x=0..590 and y=473..806; everything else is phone padding.
    photo = original.crop((0, 473, 591, 807))
    photo.save(target, format='PNG')
    with Image.open(target) as saved:
        assert saved.size == (591, 334)
        assert ImageChops.difference(photo, saved).getbbox() is None
print(f'{target} ({photo.width}x{photo.height}; pixel-identical crop)')
