#!/usr/bin/python

import subprocess
import re

p = subprocess.Popen('xinput', stdout=subprocess.PIPE)
r = p.communicate()
sout = r[0]

# see if the second pointer is created
regex = re.compile('touchpointer pointer\s*id=\d+')
s = regex.search(sout)
if s == None: # if not, then create it
	subprocess.call(['xinput', 'create-master', 'touchpointer'])

# find its id
regex = re.compile('touchpointer pointer\s*id=\d+')
s = regex.search(sout)
master = sout[ s.start():s.end() ]
x = master.rfind('=')
master_id = int(master[x+1:])

print('Master id', master_id)

# find the cooltouch display id

regex = re.compile('CoolTouch\(TM\) System\s*id=\d+')
s = regex.search(sout)
touch_info = sout[ s.start():s.end() ]
x = touch_info.rfind('=')
touchscreen_id = int(touch_info[x+1:])

print('Cooltouch id', touchscreen_id)


# ok, then reattach and map-to-output

subprocess.call(["xinput", "reattach", str(touchscreen_id), str(master_id)])
subprocess.call(["xinput", "map-to-output", str(touchscreen_id), 'HDMI1'])

