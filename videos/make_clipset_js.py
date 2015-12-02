import sys

infile = open(sys.argv[1])

print('[')
for ln in infile:
    ln = ln.strip()
    if ln.endswith(".mp4"):
        print('"' + ln + '",')
print('];')
