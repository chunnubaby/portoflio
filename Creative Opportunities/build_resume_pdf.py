from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from PIL import Image
from pathlib import Path

ROOT = Path(r'C:\Users\coolf\OneDrive\Documents\claude\portoflio\Creative Opportunities\Application Materials')
ROOT.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'Farhan Naushad Acting Resume.pdf'
PHOTO = Path(r'C:\Users\coolf\Downloads\87639f7f-fac4-45ec-ba40-22f29388a7ae-bWFpbi1uLW4tMC0wLTAtMC0w.jpeg')

W, H = 612, 792
c = canvas.Canvas(str(OUT), pagesize=(W,H))
c.setTitle('Farhan Naushad | Acting Resume')
c.setAuthor('Farhan Naushad')
c.setFillColor(HexColor('#252525'))
c.rect(0,0,W,H,stroke=0,fill=1)
cream=HexColor('#f6f5f2')
muted=HexColor('#d1ceca')

def line(txt,x,y,size=9,bold=False,color=cream):
    c.setFillColor(color)
    c.setFont('Helvetica-Bold' if bold else 'Helvetica',size)
    c.drawString(x,y,txt)

def section(title,x,y):
    line(title,x,y,9.3,True)
    return y-18

# Headshot and title
with Image.open(PHOTO) as im:
    iw,ih=im.size
    box_h=210
    box_w=166
    scale=max(box_w/iw,box_h/ih)
    nw,nh=int(iw*scale),int(ih*scale)
    resized=im.resize((nw,nh))
    left=(nw-box_w)//2
    top=(nh-box_h)//2
    crop=resized.crop((left,top,left+box_w,top+box_h))
    c.drawImage(ImageReader(crop),42,H-42-box_h,width=box_w,height=box_h)

line('ACTOR',244,736,10,True)
line('Farhan',244,686,33,True)
line('Naushad',244,645,33,True)
line('Vancouver, BC  |  Non-union',244,615,10,False,muted)

# Left column
x=42;y=496
y=section('CONTACT',x,y)
line('farhannaushad020303@gmail.com',x,y,8.1);y-=14
line('+1 (613) 484-8348',x,y,8.1);y-=28
y=section('STATS',x,y)
for s in ["Height: 5'9\"",'Weight: 172 lb','Hair: Black  |  Eyes: Dark brown','Ethnicity: South Asian','Current facial hair: Full beard']:
    line(s,x,y,8.3);y-=14
y-=14
y=section('TRAINING',x,y)
for s in ['LAMDA (London Academy of Music','& Dramatic Art), Grades 3, 6, 7, 8','2016-2020']:
    line(s,x,y,8.1);y-=14
y-=13
y=section('SKILLS',x,y)
for s in ['Karate, dancing, swimming, filmmaking,','editing, color grading, sound design,','voice acting']:
    line(s,x,y,8.1);y-=14
y-=8
for s in ['Languages: English, Malayalam, Hindi','Tamil (conversational)']:
    line(s,x,y,8.1);y-=14

# Right column
x=305;y=496
y=section('FILM & SCREEN',x,y)
credits=[
('The Performance of Being Human','Short film  |  Supporting  |  2026'),
('Scarberia','Short film  |  Supporting  |  2026'),
('Alexa (self-produced)','Short film  |  Lead  |  2025'),
('The Shave (self-produced)','Short film  |  Lead  |  2025')]
for title,detail in credits:
    line(title,x,y,8.3,True);y-=14
    line(detail,x,y,8.1,False,muted);y-=28
y+=4
y=section('THEATRE',x,y)
for title,detail in [('Class of Rock','High school play  |  Supporting  |  2018'),('I Am Zara Amaya','High school play  |  Supporting  |  2019')]:
    line(title,x,y,8.3,True);y-=14
    line(detail,x,y,8.1,False,muted);y-=28

c.showPage();c.save()
print(OUT)
