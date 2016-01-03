#!/usr/bin/python

import subprocess
import re

p = subprocess.Popen('xinput', stdout=subprocess.PIPE)

r = p.communicate()

sout = r[0]

print(sout)


regex = re.compile('Optical Mouse\s*id=\d+')

s = regex.search(sout)

touch_info = sout[ s.start():s.end() ]
x = touch_info.rfind('=')
touchscreen_id = int(touch_info[x+1:])

print(touchscreen_id)




p = subprocess.Popen('xinput', stdout=subprocess.PIPE)

